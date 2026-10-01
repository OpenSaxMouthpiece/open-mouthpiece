// Locate and run the OpenSCAD CLI (shared by the check/sweep scripts). Preference order: $OPENSCAD,
// the newest portable nightly under %LOCALAPPDATA%\Programs\OpenSCAD-Nightly (Manifold backend),
// an installed nightly, the 2021.01 release, then PATH.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function findOpenscad() {
  const nightlyDir = path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'OpenSCAD-Nightly');
  const nightlies = fs.existsSync(nightlyDir) ? fs.readdirSync(nightlyDir).filter((d) => d.startsWith('OpenSCAD-')).sort().reverse() : [];
  const candidates = [
    process.env.OPENSCAD,
    ...nightlies.map((d) => path.join(nightlyDir, d, 'openscad.com')),
    'C:\\Program Files\\OpenSCAD (Nightly)\\openscad.com',
    'C:\\Program Files\\OpenSCAD\\openscad.com',
  ].filter(Boolean);
  return candidates.find((c) => fs.existsSync(c)) ?? 'openscad';
}

export const OPENSCAD = findOpenscad();

// Stop a process and its children. On Windows openscad.com is a console wrapper around
// openscad.exe: killing just the wrapper left the real render running (hung ones for good).
export function killTree(proc) {
  if (process.platform === 'win32' && proc.pid) spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  else proc.kill();
}

// Run OpenSCAD; resolves {code, log} (stdout + stderr). Rejects only if it can't start or times out.
export function runOpenscad(args, { cwd, timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(OPENSCAD, args, { cwd, windowsHide: true });
    let log = '';
    const timer = setTimeout(() => { killTree(proc); reject(new Error(`OpenSCAD timed out after ${timeoutMs / 1000}s`)); }, timeoutMs);
    proc.stdout.on('data', (c) => (log += c));
    proc.stderr.on('data', (c) => (log += c));
    proc.on('error', (e) => { clearTimeout(timer); reject(e); });
    proc.on('close', (code) => { clearTimeout(timer); resolve({ code, log: log.replace(/\r/g, '') }); });
  });
}

// What a render log says about the result.
export function parseLog(log) {
  const genus = /Genus:\s*(-?\d+)/.exec(log);
  const lines = log.split('\n');
  return {
    ok: /Status:\s*NoError/.test(log) || /Simple:\s*yes/.test(log),
    genus: genus ? Number(genus[1]) : null,
    errors: lines.filter((l) => /^ERROR/.test(l)),
    warnings: lines.filter((l) => /^WARNING/.test(l)),                   // OpenSCAD's own warnings
    designWarnings: lines.filter((l) => /^ECHO: "WARNING/.test(l)).map((l) => l.slice(7, -1)), // validate() echoes
  };
}

// Run tasks with at most `n` in flight.
export async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}
