// Flatten a voice/param file (scad/alto.scad, a design, ...) into ONE self-contained .scad — for the
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
if (!file) {
  console.error('usage: node scripts/bundle_scad.mjs file.scad [-o out.scad]');
  process.exit(1);
}

const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const inc = /^\s*include\s*<([^>]+)>.*$/m.exec(text);
if (!inc) {
  process.stdout.write(text);
  process.exit(0);
}
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
// choices ship with OpenSCAD; the others fall back to its default font). Pictures were imported
// relative to lib/ ("../art/"): now from art/ beside the bundle, as src/bundle.ts does.
// The legacy-name block goes above the settings (where the include was): an old name pasted into
// the settings must come after its `= undef` to win (and get its rename warning).
const LEGACY = /^\/\/ \(legacy names: begin[^\n]*\n(?:[^\n]*\n)*?\/\/ \(legacy names: end\)\n/m;
const legacy = LEGACY.exec(keep.join('\n'))?.[0] ?? '';
const tabFirst = /^\s*(\/\/[^\n]*\n\s*)*\/\* \[/.test(text.slice(inc.index + inc[0].length)); // settings open with a tab
const baseBody = keep
  .join('\n')
  .replace(LEGACY, '')
  .replace(/^\/\/ Lettering fonts \(see LETTERING_FONTS\)[^\n]*\n(\/\/[^\n]*\n)*(use <fonts\/[^>]+>\n)+/m, '')
  .replace(/^use <fonts\/[^>]+>\n/gm, '')
  .replace(/import\(str\("\.\.\/art\/", /g, 'import(str("art/", ')
  .replace(/^\/\* \[(?!Hidden)[^\]]*\] \*\/\n(\n|$)/gm, ''); // now-empty tab markers

const out = [
  text.replace(
    inc[0],
    `// (bundled: ${path.basename(basePath)} is inlined at the end of this file)` +
      (legacy ? `\n/* [Hidden] */\n${legacy}${tabFirst ? '' : '/* [Parameters] */\n'}` : ''),
  ),
  '',
  '/* [Hidden] */',
  `// ======================== ${path.basename(basePath)} (inlined) ========================`,
  baseBody,
].join('\n');
if (outPath) {
  fs.writeFileSync(outPath, out);
  console.error(`wrote ${outPath}`);
} else process.stdout.write(out);
