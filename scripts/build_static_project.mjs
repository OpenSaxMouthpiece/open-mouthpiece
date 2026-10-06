// Copies the project files the app needs (scripts/project_files.mjs) into public/project/
// (gitignored) for a build, with a manifest.json listing them. The app loads these over
// HTTP and renders them with OpenSCAD's WebAssembly build. (`npm run dev` serves scad/ directly.)
//   node scripts/build_static_project.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listProjectFiles, READ_ONLY, SCAD_DIR as SCAD } from './project_files.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'project');

fs.rmSync(OUT, { recursive: true, force: true });
const files = listProjectFiles();
for (const rel of files) {
  const dst = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(SCAD, rel), dst);
}
// Height / width of each example picture as OpenSCAD imports it (the picker sets top_image_aspect
// from it), measured with the native OpenSCAD when there is one; the site measures any it lacks.
const aspect = {};
let openscad = null;
try {
  openscad = await import('./openscad.mjs');
} catch {
  /* no native OpenSCAD here */
}
fs.mkdirSync(path.join(ROOT, 'test', 'out'), { recursive: true });
for (const rel of files.filter((f) => f.startsWith('art/') && f.endsWith('.svg'))) {
  if (!openscad) break;
  const tmp = fs.mkdtempSync(path.join(ROOT, 'test', 'out', 'art-'));
  try {
    fs.writeFileSync(
      path.join(tmp, 'm.scad'),
      `import(${JSON.stringify(path.join(SCAD, rel).split(path.sep).join('/'))}, center = true);\n`,
    );
    await openscad.runOpenscad(['-o', path.join(tmp, 'm.svg'), path.join(tmp, 'm.scad')]);
    const box = /viewBox="([-\d.e ]+)"/.exec(fs.readFileSync(path.join(tmp, 'm.svg'), 'utf8'));
    const [, , w, h] = box ? box[1].trim().split(/\s+/).map(Number) : [];
    if (w > 0 && h > 0) aspect[rel.slice(4)] = Math.round((h / w) * 1000) / 1000;
  } catch {
    /* leave it to the site */
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
// the presets' settings lists (scripts/param_lists.mjs), made locally and committed
if (fs.existsSync(path.join(SCAD, 'param_lists.json')))
  fs.copyFileSync(path.join(SCAD, 'param_lists.json'), path.join(OUT, 'param_lists.json'));
fs.writeFileSync(
  path.join(OUT, 'manifest.json'),
  JSON.stringify({ files, readOnly: READ_ONLY.filter((f) => files.includes(f)), aspect }, null, 1),
);
console.log(`wrote public/project/: ${files.length} files, ${Object.keys(aspect).length} picture aspects`);
