// The project files the app loads (from project/ on the site): the presets, the generator,
// its fonts and the example art. Left out on purpose: scad/fits/ (fits of third-party meshes),
// scad/_sweep/. Used by scripts/build_static_project.mjs (copies them into public/project/ for a
// build) and vite.config.ts (serves them straight from scad/ in `npm run dev`).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'scad');
// The measured presets can't be saved over (a user's "Save as…" copy goes into their browser).
// The variants (scad/variants/, made by scripts/make_variants.mjs) are presets too.
export const READ_ONLY = [
  'alto.scad',
  'tenor.scad',
  'baritone.scad',
  'soprano.scad',
  ...(fs.existsSync(path.join(SCAD_DIR, 'variants'))
    ? fs
        .readdirSync(path.join(SCAD_DIR, 'variants'))
        .filter((f) => f.endsWith('.scad'))
        .sort()
        .map((f) => `variants/${f}`)
    : []),
];
const EXCLUDE_DIRS = new Set(['fits', '_sweep']);
export const EXTS = ['.scad', '.ttf', '.otf', '.svg'];

// Project-relative paths ("lib/mouthpiece_base.scad"), sorted.
export function listProjectFiles(dir = SCAD_DIR) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!EXCLUDE_DIRS.has(e.name)) out.push(...listProjectFiles(full));
    } else if (EXTS.some((x) => e.name.toLowerCase().endsWith(x)))
      out.push(path.relative(SCAD_DIR, full).split(path.sep).join('/'));
  }
  return out.sort();
}
