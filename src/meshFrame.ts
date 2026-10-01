// An uploaded STL as model B: read it (binary or ASCII), line it up with the generator's design
// frame the way scripts/mesh_frame.mjs does for the fitter (the reed table = the largest flat face
// with the whole mesh on one side, y = 0; the long axis = z from the shank end, 0, to the thin tip
// end; x centered), then put it in the print orientation the model is shown in.

type V3 = [number, number, number];
export type Tri = [V3, V3, V3];

// The rendered file's frame (the generator's print transform); plain files have none.
export const FRAME_ECHO = "\necho(MESH_FRAME = [print_orientation, bore_tilt, end_face_lift]);\n";
export interface PrintFrame { print: boolean; tilt: number; lift: number }
export function parseFrameEcho(log: string): PrintFrame | null {
  const m = /ECHO: MESH_FRAME = \[(true|false), ([-\d.e]+), ([-\d.e]+)\]/.exec(log);
  return m ? { print: m[1] === "true", tilt: Number(m[2]), lift: Number(m[3]) } : null;
}

export function readStl(buf: ArrayBuffer): Tri[] {
  const head = new TextDecoder("latin1").decode(new Uint8Array(buf, 0, Math.min(buf.byteLength, 1000)));
  if (head.startsWith("solid") && head.includes("facet")) {
    const text = new TextDecoder("latin1").decode(buf), v: V3[] = [];
    const re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) v.push([+m[1], +m[2], +m[3]]);
    const T: Tri[] = [];
    for (let i = 0; i + 2 < v.length; i += 3) T.push([v[i], v[i + 1], v[i + 2]]);
    return T;
  }
  if (buf.byteLength < 84) throw new Error("not an STL file");
  const dv = new DataView(buf), n = dv.getUint32(80, true);
  if (84 + n * 50 > buf.byteLength) throw new Error("not an STL file (truncated)");
  const T: Tri[] = [];
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50 + 12, p = (k: number): V3 => [dv.getFloat32(o + k * 12, true), dv.getFloat32(o + k * 12 + 4, true), dv.getFloat32(o + k * 12 + 8, true)];
    T.push([p(0), p(1), p(2)]);
  }
  return T;
}

export function writeStl(T: Tri[]): ArrayBuffer {
  const buf = new ArrayBuffer(84 + 50 * T.length), dv = new DataView(buf);
  dv.setUint32(80, T.length, true);
  T.forEach((v, i) => {
    const c = cross(sub(v[1], v[0]), sub(v[2], v[0])), l = Math.hypot(...c) || 1; // the viewer shades with these
    c.forEach((x, j) => dv.setFloat32(84 + i * 50 + j * 4, x / l, true));
    v.forEach((p, k) => p.forEach((x, j) => dv.setFloat32(84 + i * 50 + 12 + k * 12 + j * 4, x, true)));
  });
  return buf;
}

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

function bounds(T: Tri[]): [V3, V3] {
  const mn: V3 = [Infinity, Infinity, Infinity], mx: V3 = [-Infinity, -Infinity, -Infinity];
  for (const v of T) for (const p of v) for (let k = 0; k < 3; k++) { if (p[k] < mn[k]) mn[k] = p[k]; if (p[k] > mx[k]) mx[k] = p[k]; }
  return [mn, mx];
}

// Principal axis (largest variance) of the vertices.
function majorAxis(T: Tri[]): V3 {
  const c: V3 = [0, 0, 0];
  let n = 0;
  for (const v of T) for (const p of v) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; n++; }
  c[0] /= n; c[1] /= n; c[2] /= n;
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const v of T) for (const p of v) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += (p[i] - c[i]) * (p[j] - c[j]);
  let a: V3 = [1, 1, 1];
  for (let it = 0; it < 200; it++) a = norm([dot(C[0] as V3, a), dot(C[1] as V3, a), dot(C[2] as V3, a)]);
  return a;
}

// The reed table: the largest flat face cluster that has the whole mesh on one side of it.
function findTable(T: Tri[]): { n: V3; d: number } | null {
  const bins = new Map<string, { a: number; faces: { n: V3; a: number; d: number }[] }>();
  for (const v of T) {
    const c = cross(sub(v[1], v[0]), sub(v[2], v[0])), a = Math.hypot(...c) / 2;
    if (a < 1e-12) continue;
    const n: V3 = [c[0] / (2 * a), c[1] / (2 * a), c[2] / (2 * a)], d = dot(n, v[0]);
    const key = n.map((x) => Math.round(x * 25)).join(",") + "|" + Math.round(d * 2);
    const b = bins.get(key) ?? { a: 0, faces: [] };
    b.a += a; b.faces.push({ n, a, d }); bins.set(key, b);
  }
  const [mn, mx] = bounds(T), size = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
  const sorted = [...bins.values()].sort((x, y) => y.a - x.a).slice(0, 50);
  for (const b of sorted) {
    let n: V3 = [0, 0, 0], d = 0, a = 0;
    for (const f of b.faces) { n = [n[0] + f.n[0] * f.a, n[1] + f.n[1] * f.a, n[2] + f.n[2] * f.a]; d += f.d * f.a; a += f.a; }
    n = norm(n); d /= a;
    let over = -Infinity;
    for (const v of T) for (const p of v) over = Math.max(over, dot(n, p) - d);
    if (over < 0.01 * size) return { n, d };
  }
  return null;
}

// Highest point of the section at z = zc on the centerline x = 0 (0 if none).
function topAt(T: Tri[], zc: number): number {
  let top = 0;
  for (const v of T) {
    const pts: [number, number][] = [];
    for (let i = 0; i < 3; i++) {
      const a = v[i], b = v[(i + 1) % 3], da = a[2] - zc, db = b[2] - zc;
      if ((da < 0) !== (db < 0)) { const t = da / (da - db); pts.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
    }
    if (pts.length !== 2) continue;
    const [p, q] = pts;
    if ((p[0] < 0) !== (q[0] < 0)) { const t = p[0] / (p[0] - q[0]); top = Math.max(top, p[1] + t * (q[1] - p[1])); }
  }
  return top;
}

// Into the design frame; null when no reed table is found (not a mouthpiece, or a damaged mesh).
export function toDesignFrame(T: Tri[]): Tri[] | null {
  const tab = findTable(T);
  if (!tab) return null;
  const up: V3 = [-tab.n[0], -tab.n[1], -tab.n[2]];
  let al = majorAxis(T);
  const k = dot(al, up);
  al = norm([al[0] - up[0] * k, al[1] - up[1] * k, al[2] - up[2] * k]);
  const w = cross(up, al);
  let P: Tri[] = T.map((v) => v.map((p) => [dot(p, w), dot(p, up) + tab.d, dot(p, al)]) as Tri);
  const [mn, mx] = bounds(P), cx = (mn[0] + mx[0]) / 2, L = mx[2] - mn[2];
  P = P.map((v) => v.map((p) => [p[0] - cx, p[1], p[2] - mn[2]]) as Tri);
  // the tip is the thin end; a 180° turn about Y is a rotation, so the winding is kept
  if (topAt(P, L * 0.02) < topAt(P, L * 0.98)) P = P.map((v) => v.map((p) => [-p[0], p[1], L - p[2]]) as Tri);
  return P;
}

// The generator's print transform, rotate([-tilt, 0, 0]), then stood on the plate by its own
// lowest point (the model's end_face_lift is for the model's shank end, not this mesh's).
export function toPrintFrame(T: Tri[], f: PrintFrame | null): Tri[] {
  if (!f || !f.print) return T;
  const a = (-f.tilt * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const R = T.map((v) => v.map(([x, y, z]) => [x, y * c - z * s, y * s + z * c]) as Tri);
  const z0 = bounds(R)[0][2];
  return R.map((v) => v.map(([x, y, z]) => [x, y, z - z0]) as Tri);
}
