// Builds deploy.zip for NoA one-click deploy: package.json at the ZIP root, no node_modules /
// build output / git / local leftovers (guardrail Z-001..Z-005). No dependencies — plain Node zlib.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "deploy.zip");

const EXCLUDE_DIRS = new Set([
  "node_modules", ".next", ".open-next", ".turbo", ".cache", ".swc", ".git", ".github", ".claude", ".noa",
  "coverage", "dist", "out", "migrations",
]);
const EXCLUDE_FILES = new Set([
  "deploy.zip", "next-env.d.ts",
]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).split(path.sep).join("/");
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) walk(full, out);
      continue;
    }
    if (EXCLUDE_FILES.has(rel) || entry.name.endsWith(".tsbuildinfo") || /^\.env/.test(entry.name)) continue;
    const size = fs.statSync(full).size;
    if (size > MAX_FILE_BYTES) { console.warn(`skip (over 5MB): ${rel}`); continue; }
    out.push(rel);
  }
  return out;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const files = walk(ROOT, []).sort();
const chunks = [];
const central = [];
let offset = 0;
for (const rel of files) {
  const data = fs.readFileSync(path.join(ROOT, rel));
  const deflated = zlib.deflateRawSync(data);
  const name = Buffer.from(rel, "utf8");
  const crc = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
  local.writeUInt16LE(8, 8); local.writeUInt32LE(0, 10); local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(deflated.length, 18); local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
  chunks.push(local, name, deflated);
  const cen = Buffer.alloc(46);
  cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8);
  cen.writeUInt16LE(8, 10); cen.writeUInt32LE(0, 12); cen.writeUInt32LE(crc, 16);
  cen.writeUInt32LE(deflated.length, 20); cen.writeUInt32LE(data.length, 24); cen.writeUInt16LE(name.length, 28);
  cen.writeUInt32LE(offset, 42);
  central.push(cen, name);
  offset += local.length + name.length + deflated.length;
}
const centralBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuf.length, 12); end.writeUInt32LE(offset, 16);
fs.writeFileSync(OUT, Buffer.concat([...chunks, centralBuf, end]));
console.log(`deploy.zip: ${files.length} files, ${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)} MB`);
