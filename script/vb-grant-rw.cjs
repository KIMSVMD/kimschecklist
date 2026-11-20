// Applies script/vb-grant-rw.sql to Vibe Base with the owner key (local credential files from
// `noa vibe-base credentials`). Runs in one transaction; prints no secrets.
const fs = require("fs");
const path = require("path");
const pg = require("pg");
const { vibeBaseUrl, credDir } = require("./vb-url.cjs");

(async () => {
  const rwUser = fs.readFileSync(path.join(credDir, ".env.vibebase.local"), "utf8").match(/^VIBE_BASE_PG_USER=(.+)$/m)[1].trim().replace(/^"|"$/g, "");
  if (!/^[a-z0-9_]+$/.test(rwUser)) throw new Error("unexpected rw role name");
  const sql = fs.readFileSync(path.join(__dirname, "vb-grant-rw.sql"), "utf8")
    .replaceAll(":rw_name", rwUser).replaceAll(":rw", `"${rwUser}"`);
  const c = new pg.Client({ connectionString: vibeBaseUrl("owner") });
  await c.connect();
  try {
    await c.query("begin");
    await c.query(sql);
    await c.query("commit");
    console.log("grants + RLS applied for", rwUser);
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    await c.end();
  }
})().catch(e => { console.error("FAILED:", e.message); process.exitCode = 1; });
