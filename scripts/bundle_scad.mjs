// Flatten a voice/param file (scad/alto.scad, a fit, ...) into ONE self-contained .scad — for the
// web app, or anywhere include<> paths don't resolve. The output is the param file's
// own block (header, Customizer tabs, hidden shape tables) followed by the base geometry with its
// default assignments for those parameters removed: in a single file a variable must be assigned
// before the code that uses it, and assigning twice only produces "overwritten" warnings.
//   node scripts/bundle_scad.mjs scad/alto.scad [-o alto_bundled.scad]
import fs from 'node:fs';
import path from 'node:path';
import { readAssignments } from './voice_file.mjs';

const args = process.argv.slice(2);
const oi = args.indexOf('-o');
const outPath = oi >= 0 ? args[oi + 1] : null;
const file = args.find((a, i) => !a.startsWith('-') && i !== oi + 1);
if (!file) { console.error('usage: node scripts/bundle_scad.mjs file.scad [-o out.scad]'); process.exit(1); }

const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const inc = /^\s*include\s*<([^>]+)>.*$/m.exec(text);
if (!inc) { process.stdout.write(text); process.exit(0); }
const basePath = path.resolve(path.dirname(file), inc[1]);
const base = fs.readFileSync(basePath, 'utf8').replace(/\r\n/g, '\n');
const own = readAssignments(text);

// The base without the assignments the param file overrides (and without its Customizer
// annotations, which the param file already carries).
const baseLines = base.split('\n');
const keep = [];
for (let i = 0; i < baseLines.length; i++) {
  const m = /^([A-Za-z_]\w*) = .*;/.exec(baseLines[i]);
  if (m && m[1] in own) {
    while (keep.length && /^\/\/ /.test(keep[keep.length - 1]) && !/^\/\/ =+/.test(keep[keep.length - 1])) keep.pop(); // its description comment
    continue;
  }
  keep.push(baseLines[i]);
}
// A single file can't carry the lettering fonts in lib/fonts/: drop their use<>s (the Liberation
// choices ship with OpenSCAD; the others fall back to its default font). top_image needs art/.
const baseBody = keep.filter((l) => !/^use <fonts\//.test(l)).join('\n').replace(/^\/\* \[(?!Hidden)[^\]]*\] \*\/\n(\n|$)/gm, '');  // now-empty tab markers

const out = [
  text.replace(inc[0], `// (bundled: ${path.basename(basePath)} is inlined at the end of this file)`),
  '',
  '/* [Hidden] */',
  `// ======================== ${path.basename(basePath)} (inlined) ========================`,
  baseBody,
].join('\n');
if (outPath) { fs.writeFileSync(outPath, out); console.error(`wrote ${outPath}`); } else process.stdout.write(out);
