import pg from 'pg';

const { Pool } = pg;

const RENDER_URL = 'postgresql://kimschecklist_db_user:yUqc53YxjxgncclBkKki2ed1ycbpx01r@dpg-d7g6kla8qa3s73dk0h90-a.singapore-postgres.render.com/kimschecklist_db?sslmode=require';
const NEON_URL = 'postgresql://neondb_owner:npg_Thv8ndIxD6Kr@ep-lively-math-a461jvod-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

const renderPool = new Pool({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
const neonPool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });

async function getColumns(client, table) {
  const res = await client.query(`
    SELECT
      a.attname AS column_name,
      format_type(a.atttypid, a.atttypmod) AS full_type,
      a.attnotnull AS not_null,
      pg_get_expr(d.adbin, d.adrelid) AS column_default
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE n.nspname = 'public'
      AND c.relname = $1
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY a.attnum
  `, [table]);
  return res.rows;
}

async function getTables(client) {
  const res = await client.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `);
  return res.rows.map(r => r.tablename);
}

async function sync() {
  const renderClient = await renderPool.connect();
  const neonClient = await neonPool.connect();

  try {
    const renderTables = await getTables(renderClient);
    const neonTables = await getTables(neonClient);
    const neonTableSet = new Set(neonTables);

    console.log(`Render 테이블: ${renderTables.join(', ')}`);
    console.log(`Neon 테이블:   ${neonTables.join(', ')}\n`);

    for (const table of renderTables) {
      if (!neonTableSet.has(table)) {
        console.log(`⚠️  [${table}] Neon에 테이블 없음 — 스킵`);
        continue;
      }

      const renderCols = await getColumns(renderClient, table);
      const neonCols = await getColumns(neonClient, table);
      const neonColNames = new Set(neonCols.map(c => c.column_name));

      const missing = renderCols.filter(c => !neonColNames.has(c.column_name));

      if (missing.length === 0) {
        console.log(`✅ [${table}] 컬럼 일치`);
        continue;
      }

      console.log(`\n🔧 [${table}] 누락 컬럼 ${missing.length}개 추가 중...`);
      for (const col of missing) {
        let colDef = `"${col.column_name}" ${col.full_type}`;
        if (col.column_default) colDef += ` DEFAULT ${col.column_default}`;
        // NOT NULL은 기존 데이터가 있을 수 있으므로 생략 후 별도 처리
        const sql = `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS ${colDef}`;
        try {
          await neonClient.query(sql);
          console.log(`  + ${col.column_name} (${col.full_type})`);
        } catch (err) {
          console.error(`  ❌ ${col.column_name}: ${err.message}`);
        }
      }
    }

    console.log('\n🎉 스키마 동기화 완료!');
  } finally {
    renderClient.release();
    neonClient.release();
    await renderPool.end();
    await neonPool.end();
  }
}

sync();
