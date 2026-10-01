// Voice/param files: scad files that `include <.../lib/mouthpiece_base.scad>` and then assign their
// own values (the last assignment of a variable wins in OpenSCAD). The OpenSCAD Customizer only
// shows parameters declared in the file you open, so each voice file carries the base's whole
// annotated parameter block (tabs, sliders, descriptions) with its own values. This module builds
// such a file from the base; scripts/sync_voice_files.mjs uses it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SCAD_DIR = path.join(here, '..', 'scad');
export const BASE_PATH = path.join(SCAD_DIR, 'lib', 'mouthpiece_base.scad');

const ASSIGN = /^([A-Za-z_]\w*) = (.*?);(\s*\/\/.*)?$/;

// Top-level single-line assignments {name: valueText} (values kept as OpenSCAD source text).
export function readAssignments(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = ASSIGN.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

// The base's Customizer section (first "/* [" tab up to "/* [Hidden] */") and its hidden
// parameters (the assignments between "/* [Hidden] */" and the first non-parameter line).
function baseParts(base) {
  const start = base.indexOf('/* [');
  const hidden = base.indexOf('/* [Hidden] */');
  if (start < 0 || hidden < 0) throw new Error('base file: no Customizer section found');
  const custom = base.slice(start, hidden).replace(/\s+$/, '');
  const after = base.slice(hidden + '/* [Hidden] */'.length);
  const hiddenLines = [];
  for (const line of after.split(/\r?\n/)) {
    if (/^\$fn\b/.test(line)) break;
    hiddenLines.push(line);
  }
  return { custom, hidden: hiddenLines.join('\n').trim() };
}

// Replace the values of assignment lines in `block`, keeping each line's annotation comment.
function fill(block, values, used) {
  return block.split('\n').map((line) => {
    const m = ASSIGN.exec(line);
    if (!m || !(m[1] in values)) return line;
    used.add(m[1]);
    return `${m[1]} = ${values[m[1]]};${m[3] ?? ''}`;
  }).join('\n');
}

// Build a voice file. `values` = {name: valueText}; `header` = leading comment lines; `filePath`
// = where it will be written (for the relative include path).
export function buildVoiceFile({ values, header, filePath, base = fs.readFileSync(BASE_PATH, 'utf8') }) {
  const { custom, hidden } = baseParts(base.replace(/\r\n/g, '\n'));
  const used = new Set();
  const inc = path.relative(path.dirname(filePath), BASE_PATH).split(path.sep).join('/');
  const customFilled = fill(custom, values, used);
  const hiddenFilled = fill(hidden, values, used);
  const extra = Object.keys(values).filter((k) => !used.has(k));
  return [
    header.trim(),
    '',
    `include <${inc}>  // geometry + defaults; everything below overrides it (keep this line first)`,
    '',
    customFilled,
    '',
    '/* [Hidden] */',
    '',
    hiddenFilled,
    ...(extra.length ? ['', '// Other values', ...extra.map((k) => `${k} = ${values[k]};`)] : []),
    '',
  ].join('\n');
}

// Header = the leading comment block of an existing file (everything before its include line).
export function readHeader(text) {
  const lines = text.split(/\r?\n/);
  const i = lines.findIndex((l) => /^\s*include\s*</.test(l));
  return (i < 0 ? [] : lines.slice(0, i)).join('\n').trim();
}

// Is this a voice/param file (includes the base)?
export function isVoiceFile(text) {
  return /^\s*include\s*<[^>]*mouthpiece_base\.scad>/m.test(text);
}
