// Regenerate voice/param files (scad/*.scad, fits/, variants/, extras/ that include the base) from the
// base's annotated parameter block, keeping each file's own values and header comment. Run it
// after changing parameters or annotations in scad/lib/mouthpiece_base.scad.
//   node scripts/sync_voice_files.mjs            (all voice files)
//   node scripts/sync_voice_files.mjs scad/alto.scad ...
import fs from 'node:fs';
import path from 'node:path';
import { SCAD_DIR, buildVoiceFile, readAssignments, readHeader, isVoiceFile } from './voice_file.mjs';

const listed = process.argv.slice(2);
const files = listed.length
  ? listed
  : [SCAD_DIR, ...['fits', 'variants', 'extras'].map((d) => path.join(SCAD_DIR, d))]
      .flatMap((d) => (fs.existsSync(d) ? fs.readdirSync(d).map((f) => path.join(d, f)) : []))
      .filter((f) => f.endsWith('.scad'));

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  if (!isVoiceFile(text)) continue;
  const out = buildVoiceFile({ values: readAssignments(text), header: readHeader(text), filePath: path.resolve(f) });
  if (out !== text.replace(/\r\n/g, '\n')) {
    fs.writeFileSync(f, out); // LF only: the web app's Customizer mis-parses CRLF
    console.log('updated', path.relative(process.cwd(), f));
  } else console.log('unchanged', path.relative(process.cwd(), f));
}
