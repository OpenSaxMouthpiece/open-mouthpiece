// The presets' settings lists (OpenSCAD's .param export), kept in scad/param_lists.json so the app
// can show the settings without a full OpenSCAD run first (~2s in the browser). Each entry carries
// a hash of the file's text; the app uses it only while the text matches (src/browserApi.ts) and
// asks OpenSCAD otherwise, so a stale list is never wrong, just slower. `npm run check` refreshes
// the entries of the files it checks.
//   node scripts/param_lists.mjs            # all presets
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runOpenscad, pool } from './openscad.mjs';
import { READ_ONLY, SCAD_DIR } from './project_files.mjs';

export const PARAM_LISTS = path.join(SCAD_DIR, 'param_lists.json');
const OUT = path.join(path.dirname(SCAD_DIR), 'test', 'out');

// FNV-1a over the UTF-16 code units, plus the length; the same function is in src/browserApi.ts.
export function textHash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return `${h.toString(16)}-${s.length}`;
}

// Refreshes the entries of `rels` (project-relative preset paths); drops entries of files that
// are no longer presets. Returns the paths whose list changed.
export async function updateParamLists(rels = READ_ONLY) {
  const lists = fs.existsSync(PARAM_LISTS) ? JSON.parse(fs.readFileSync(PARAM_LISTS, 'utf8')) : {};
  fs.mkdirSync(OUT, { recursive: true });
  const changed = [];
  await pool(
    rels.filter((r) => READ_ONLY.includes(r)),
    4,
    async (rel) => {
      const file = path.join(SCAD_DIR, rel);
      const out = path.join(OUT, `${rel.replace(/[/\\]/g, '_')}.param`);
      fs.rmSync(out, { force: true });
      const r = await runOpenscad(['-o', out, file], { cwd: path.dirname(file) });
      if (r.code !== 0 || !fs.existsSync(out)) throw new Error(`${rel}: .param export failed\n${r.log}`);
      const entry = {
        hash: textHash(fs.readFileSync(file, 'utf8')),
        parameters: JSON.parse(fs.readFileSync(out, 'utf8')).parameters ?? [],
      };
      if (JSON.stringify(entry) !== JSON.stringify(lists[rel])) changed.push(rel);
      lists[rel] = entry;
    },
  );
  const next = Object.fromEntries(
    Object.keys(lists)
      .filter((k) => READ_ONLY.includes(k))
      .sort()
      .map((k) => [k, lists[k]]),
  );
  fs.writeFileSync(PARAM_LISTS, JSON.stringify(next, null, 1) + '\n');
  return changed;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const changed = await updateParamLists();
  console.log(`${path.relative(process.cwd(), PARAM_LISTS)}: ${changed.length ? changed.join(', ') : 'unchanged'}`);
}
