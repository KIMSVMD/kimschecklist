import pg from 'pg';

const { Pool } = pg;

const RENDER_URL = 'postgresql://kimschecklist_db_user:yUqc53YxjxgncclBkKki2ed1ycbpx01r@dpg-d7g6kla8qa3s73dk0h90-a.singapore-postgres.render.com/kimschecklist_db?sslmode=require';
const NEON_URL = 'postgresql://neondb_owner:npg_Thv8ndIxD6Kr@ep-lively-math-a461jvod.us-east-1.aws.neon.tech/neondb?sslmode=require';

const renderPool = new Pool({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
const neonPool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });

async function getTables(client) {
  const res = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  return res.rows.map(r => r.tablename);
}

async function getTableDDL(client, table) {
  // 컬럼 정보 (format_type으로 ARRAY 등 복합 타입 정확히 처리)
  const cols = await client.query(`
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

  const colDefs = cols.rows.map(c => {
    let def = `"${c.column_name}" ${c.full_type}`;
    if (c.column_default) def += ` DEFAULT ${c.column_default}`;
    if (c.not_null) def += ' NOT NULL';
    return def;
  });

  // PK 정보
  const pk = await client.query(`
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = $1
    ORDER BY kcu.ordinal_position
  `, [table]);

  if (pk.rows.length > 0) {
    const pkCols = pk.rows.map(r => `"${r.column_name}"`).join(', ');
    colDefs.push(`PRIMARY KEY (${pkCols})`);
  }

  return `CREATE TABLE IF NOT EXISTS "${table}" (\n  ${colDefs.join(',\n  ')}\n);`;
}

async function migrate() {
  const renderClient = await renderPool.connect();
  const neonClient = await neonPool.connect();

  try {
    console.log('✅ Render DB 연결 성공');
    console.log('✅ Neon DB 연결 성공');

    const tables = await getTables(renderClient);
    console.log(`\n📋 발견된 테이블 (${tables.length}개): ${tables.join(', ')}\n`);

    for (const table of tables) {
      console.log(`\n--- [${table}] 처리 중 ---`);

      // 테이블 생성
      const ddl = await getTableDDL(renderClient, table);
      await neonClient.query(ddl);
      console.log(`  테이블 생성 완료`);

      // 기존 데이터 삭제 후 재삽입
      await neonClient.query(`DELETE FROM "${table}"`);

      // 데이터 조회
      const data = await renderClient.query(`SELECT * FROM "${table}"`);
      console.log(`  데이터 ${data.rows.length}건 마이그레이션 중...`);

      if (data.rows.length === 0) {
        console.log(`  (데이터 없음)`);
        continue;
      }

      const columns = Object.keys(data.rows[0]);
      const colList = columns.map(c => `"${c}"`).join(', ');

      // 배치 삽입 (100건씩)
      const batchSize = 100;
      for (let i = 0; i < data.rows.length; i += batchSize) {
        const batch = data.rows.slice(i, i + batchSize);
        for (const row of batch) {
          const values = columns.map(c => row[c]);
          const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
          await neonClient.query(
            `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
            values
          );
        }
        console.log(`  ${Math.min(i + batchSize, data.rows.length)}/${data.rows.length}건 완료`);
      }

      // 시퀀스 동기화 (serial/bigserial 컬럼)
      const seqRes = await renderClient.query(`
        SELECT column_name, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
          AND column_default LIKE 'nextval%'
      `, [table]);

      for (const seq of seqRes.rows) {
        try {
          await neonClient.query(`SELECT setval(pg_get_serial_sequence('"${table}"', '${seq.column_name}'), COALESCE((SELECT MAX("${seq.column_name}") FROM "${table}"), 1))`);
        } catch (e) {
          // 시퀀스 동기화 실패는 무시
        }
      }

      console.log(`  ✅ [${table}] 완료`);
    }

    console.log('\n🎉 전체 마이그레이션 완료!');

  } catch (err) {
    console.error('❌ 오류:', err.message);
    throw err;
  } finally {
    renderClient.release();
    neonClient.release();
    await renderPool.end();
    await neonPool.end();
  }
}

migrate();
