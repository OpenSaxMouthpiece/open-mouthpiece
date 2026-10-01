// Downloads OpenSCAD's official WebAssembly build (the browser version the static site renders
// with) into public/openscad/ (gitignored): openscad.js + openscad.wasm. The version and its
// SHA-256 are pinned; bump both together (hash from the .sha256 file next to the zip on
// files.openscad.org/snapshots/). Skips the download when the files are already there.
//   node scripts/fetch_openscad_wasm.mjs [--force]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const VERSION = '2026.09.23';
const SHA256 = '0e85026f486ab6b7c498ae582528a980db9e050ff8ae0df835917a8334ed3f79';
const URL_ZIP = `https://files.openscad.org/snapshots/OpenSCAD-${VERSION}-WebAssembly-web.zip`;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'openscad');
const STAMP = path.join(OUT, 'VERSION');
const WANT = ['openscad.js', 'openscad.wasm'];

if (!process.argv.includes('--force') && fs.existsSync(STAMP) && fs.readFileSync(STAMP, 'utf8').trim() === VERSION
    && WANT.every((f) => fs.existsSync(path.join(OUT, f)))) {
  console.log(`OpenSCAD WebAssembly ${VERSION} already in public/openscad/`);
  process.exit(0);
}

console.log(`downloading ${URL_ZIP}`);
const res = await fetch(URL_ZIP);
if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
const zip = Buffer.from(await res.arrayBuffer());
const hash = crypto.createHash('sha256').update(zip).digest('hex');
if (hash !== SHA256) throw new Error(`SHA-256 mismatch: got ${hash}, expected ${SHA256}`);

// Minimal zip reader: find the central directory, then inflate each wanted entry.
const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
if (eocd < 0) throw new Error('not a zip file');
const count = zip.readUInt16LE(eocd + 10);
let p = zip.readUInt32LE(eocd + 16);
fs.mkdirSync(OUT, { recursive: true });
const got = [];
for (let i = 0; i < count; i++) {
  const method = zip.readUInt16LE(p + 10);
  const csize = zip.readUInt32LE(p + 20);
  const nameLen = zip.readUInt16LE(p + 28), extraLen = zip.readUInt16LE(p + 30), commentLen = zip.readUInt16LE(p + 32);
  const local = zip.readUInt32LE(p + 42);
  const name = zip.toString('utf8', p + 46, p + 46 + nameLen);
  p += 46 + nameLen + extraLen + commentLen;
  const base = path.basename(name);
  if (!WANT.includes(base)) continue;
  const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
  const raw = zip.subarray(start, start + csize);
  const data = method === 0 ? raw : method === 8 ? zlib.inflateRawSync(raw) : null;
  if (!data) throw new Error(`${name}: unsupported compression ${method}`);
  fs.writeFileSync(path.join(OUT, base), data);
  got.push(`${base} (${(data.length / 1e6).toFixed(1)} MB)`);
}
if (got.length !== WANT.length) throw new Error(`zip is missing some of ${WANT.join(', ')}`);
fs.writeFileSync(STAMP, VERSION + '\n');
console.log(`wrote public/openscad/: ${got.join(', ')}`);
