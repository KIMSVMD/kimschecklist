// Local helper (not used by the app): builds a Vibe Base connection URL from the credential files
// that `noa vibe-base credentials` wrote (.env.vibebase.local = rw, .env.vb-owner.json = owner),
// without printing the password. Use via require() from other scripts.
const fs = require("fs");
const path = require("path");
// Credential files live OUTSIDE the project folder (noa deploy uploads everything in it).
const ROOT = process.env.VB_CRED_DIR || path.resolve(__dirname, "..", "..", "noa-secrets");

function readJson(file) {
  const raw = fs.readFileSync(path.join(ROOT, file), "utf8");
  return JSON.parse(raw.slice(raw.indexOf("{")));
}
function readEnv(file) {
  return Object.fromEntries(fs.readFileSync(path.join(ROOT, file), "utf8").split(/\r?\n/)
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
}
function vibeBaseUrl(role) {
  if (role === "owner") {
    const j = readJson(".env.vb-owner.json");
    return `postgresql://${encodeURIComponent(j.ownerUsername)}:${encodeURIComponent(j.ownerPassword)}@${j.proxyEndpoint}:5432/${j.databaseName}`;
  }
  const e = readEnv(".env.vibebase.local");
  return `postgresql://${encodeURIComponent(e.VIBE_BASE_PG_USER)}:${encodeURIComponent(e.VIBE_BASE_PG_PASSWORD)}@${e.VIBE_BASE_PROXY_ENDPOINT}:5432/${e.VIBE_BASE_DATABASE_NAME}`;
}
module.exports = { vibeBaseUrl, credDir: ROOT };
