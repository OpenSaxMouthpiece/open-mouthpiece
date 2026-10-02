// A/B comparison helpers: snapshots, mesh stats from binary STL, and parameter/assignment diffs.
import type { ParamValue, ScadParam } from "./api";
import type { Tri } from "./meshFrame";
import type { Summary } from "./readouts";
import { scadLiteral } from "./scadText";

// A frozen model: everything needed to show it, diff it, or swap it back into the editor.
export interface Snapshot {
  name: string;
  path: string | null;
  source: string;
  files: Record<string, string>; // unsaved text of other project files at pin time (e.g. an edited base)
  values: Record<string, ParamValue>;
  params: ScadParam[];
  stl: ArrayBuffer | null;
  air?: number | null; // inside air volume (cm³) from the render's console output
  summary?: Summary | null; // tip opening, facing length, length (the generator's echo)
  facing?: [number, number][] | null; // the facing curve (facing_report): [mm from the tip, gap mm]
  // an uploaded STL (no source or parameters): its triangles in the design frame when it could be
  // lined up with the model (stl then follows the model's print orientation), else as uploaded
  mesh?: { tris: Tri[]; aligned: boolean };
}

// The "Inside air volume: X cm3" line echoed by the mouthpiece generator, if present.
export function parseAirVolume(log: string): number | null {
  const m = /Inside air volume: ([\d.]+) cm3/.exec(log);
  return m ? Number(m[1]) : null;
}

export interface MeshStats {
  triangles: number;
  volume: number; // mm³
  min: [number, number, number];
  max: [number, number, number];
}

// Binary STL: 80-byte header, uint32 count, then 50 bytes per triangle (normal + 3 vertices + attr).
export function stlStats(buf: ArrayBuffer): MeshStats | null {
  if (buf.byteLength < 84) return null;
  const dv = new DataView(buf);
  const n = dv.getUint32(80, true);
  if (84 + n * 50 > buf.byteLength) return null;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  let vol = 0;
  for (let t = 0; t < n; t++) {
    const o = 84 + t * 50 + 12;
    const v: number[] = [];
    for (let k = 0; k < 9; k++) {
      const x = dv.getFloat32(o + k * 4, true);
      v.push(x);
      const axis = k % 3;
      if (x < min[axis]) min[axis] = x;
      if (x > max[axis]) max[axis] = x;
    }
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = v;
    vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return { triangles: n, volume: Math.abs(vol), min, max };
}

export const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function formatValue(v: unknown): string {
  if (v === undefined) return "—";
  if (typeof v === "number") return String(Math.round(v * 1e6) / 1e6);
  if (typeof v === "string") return JSON.stringify(v);
  return JSON.stringify(v);
}

export interface ParamDiffRow {
  name: string;
  group: string;
  a: ParamValue | undefined; // undefined = not a parameter of that model
  b: ParamValue | undefined;
  inA: boolean;
}

// Effective Customizer values (override ?? file default) of both models, in A's order then B's extras.
export function diffParams(a: Snapshot, b: Snapshot): ParamDiffRow[] {
  const eff = (s: Snapshot) =>
    new Map(s.params.map((p) => [p.name, { group: p.group, value: s.values[p.name] ?? p.initial }]));
  const ea = eff(a),
    eb = eff(b);
  const names = [...ea.keys(), ...[...eb.keys()].filter((k) => !ea.has(k))];
  return names.map((name) => ({
    name,
    group: ea.get(name)?.group ?? eb.get(name)!.group,
    a: ea.get(name)?.value,
    b: eb.get(name)?.value,
    inA: ea.has(name),
  }));
}

// Single-line top-level assignments (`name = expr;` at column 0) that are not Customizer params —
// e.g. nested-list overrides the Customizer can't show. Compared as source text.
// Other single-line assignments that differ. A self-contained download carries the whole
// generator, so names only one side assigns (and that aren't outline tables or point lists) are
// generator internals: returned apart, to be shown collapsed.
export function diffAssignments(a: Snapshot, b: Snapshot) {
  const skip = new Set([...a.params, ...b.params].map((p) => p.name));
  // the file's text, then the changes made on top of it (e.g. a curve edited in the Curves section)
  const collect = (s: Snapshot) => {
    const m = new Map<string, string>();
    for (const line of s.source.split(/\r?\n/)) {
      const r = /^([A-Za-z_$]\w*)\s*=\s*(.*?);\s*(\/\/.*)?$/.exec(line);
      if (r && !skip.has(r[1]) && !m.has(r[1])) m.set(r[1], r[2]);
    }
    for (const [k, v] of Object.entries(s.values)) if (!skip.has(k)) m.set(k, scadLiteral(v));
    return m;
  };
  const ca = collect(a),
    cb = collect(b);
  const names = [...ca.keys(), ...[...cb.keys()].filter((k) => !ca.has(k))];
  const rows = names.filter((n) => ca.get(n) !== cb.get(n)).map((name) => ({ name, a: ca.get(name), b: cb.get(name) }));
  const shape = (n: string) => /^shape_|_points$|_range$/.test(n);
  const main = rows.filter((r) => (r.a !== undefined && r.b !== undefined) || shape(r.name));
  return { main, internal: rows.filter((r) => !main.includes(r)) };
}
