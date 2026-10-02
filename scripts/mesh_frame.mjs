// Shared STL helpers (npm run check; local measuring tools): load (binary or ASCII), orient a
// mouthpiece into the generator's frame, and slice it.
// The app has its own copy of the loading/orienting part for uploaded STLs: src/meshFrame.ts.
//   Design frame: X = width (centered), Y = height above the
//   table plane, Z = along the table, 0 = shank end, L = tip.
import fs from 'node:fs';

export function loadTris(file) {
  const buf = fs.readFileSync(file);
  if (buf.slice(0, 5).toString() === 'solid' && buf.toString('latin1', 0, 1000).includes('facet')) {
    const re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g,
      s = buf.toString('latin1'),
      v = [];
    let m;
    while ((m = re.exec(s))) v.push([+m[1], +m[2], +m[3]]);
    const T = [];
    for (let i = 0; i + 2 < v.length; i += 3) T.push([v[i], v[i + 1], v[i + 2]]);
    return T;
  }
  const n = buf.readUInt32LE(80),
    T = [];
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50 + 12;
    T.push([0, 1, 2].map((k) => [0, 1, 2].map((j) => buf.readFloatLE(o + k * 12 + j * 4))));
  }
  return T;
}

export function writeStl(file, T) {
  const b = Buffer.alloc(84 + 50 * T.length);
  b.writeUInt32LE(T.length, 80);
  T.forEach((v, i) => {
    const o = 84 + i * 50 + 12;
    v.forEach((p, k) => p.forEach((x, j) => b.writeFloatLE(x, o + k * 12 + j * 4)));
  });
  fs.writeFileSync(file, b);
}

export function bounds(P) {
  const mn = [Infinity, Infinity, Infinity],
    mx = [-Infinity, -Infinity, -Infinity];
  for (const p of P)
    for (let k = 0; k < 3; k++) {
      if (p[k] < mn[k]) mn[k] = p[k];
      if (p[k] > mx[k]) mx[k] = p[k];
    }
  return [mn, mx];
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
  const l = Math.hypot(...a);
  return a.map((x) => x / l);
};

function faceInfo(v) {
  const c = cross(sub(v[1], v[0]), sub(v[2], v[0])),
    a = Math.hypot(...c) / 2;
  return a < 1e-12
    ? null
    : {
        n: c.map((x) => x / (2 * a)),
        a,
        d: dot(
          c.map((x) => x / (2 * a)),
          v[0],
        ),
      };
}

// Principal axis (largest variance) of the vertex cloud.
function majorAxis(T) {
  const P = T.flat(),
    c = [0, 1, 2].map((k) => P.reduce((s, p) => s + p[k], 0) / P.length);
  const C = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const p of P) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += (p[i] - c[i]) * (p[j] - c[j]);
  let v = [1, 1, 1];
  for (let it = 0; it < 200; it++) v = norm([0, 1, 2].map((i) => dot(C[i], v))); // power iteration
  return v;
}

// Find the table: the largest flat face cluster that has the whole mesh on one side of it.
export function findTable(T) {
  const F = T.map(faceInfo).filter(Boolean);
  const bins = new Map();
  for (const f of F) {
    const key = f.n.map((x) => Math.round(x * 25)).join(',') + '|' + Math.round(f.d * 2);
    const b = bins.get(key) || { a: 0, faces: [] };
    b.a += f.a;
    b.faces.push(f);
    bins.set(key, b);
  }
  const P = T.flat(),
    [mn0, mx0] = bounds(P);
  const size = Math.max(...[0, 1, 2].map((k) => mx0[k] - mn0[k]));
  for (const b of [...bins.values()].sort((x, y) => y.a - x.a)) {
    let n = [0, 0, 0],
      d = 0,
      a = 0;
    for (const f of b.faces) {
      n = n.map((x, j) => x + f.n[j] * f.a);
      d += f.d * f.a;
      a += f.a;
    }
    n = norm(n);
    d /= a;
    let over = -Infinity;
    for (const p of P) over = Math.max(over, dot(n, p) - d);
    if (over < 0.01 * size) return { n, d, area: a };
  }
  throw new Error('no supporting flat face found (is there a table?)');
}

// Transform triangles into the generator frame. Returns { P, info }.
export function toFrame(T) {
  const tab = findTable(T);
  const up = tab.n.map((x) => -x);
  let al = majorAxis(T);
  al = norm(
    sub(
      al,
      up.map((x) => x * dot(al, up)),
    ),
  );
  const w = cross(up, al);
  let P = T.map((v) => v.map((p) => [dot(p, w), dot(p, up) + tab.d, dot(p, al)]));
  const [mn, mx] = bounds(P.flat());
  const cx = (mn[0] + mx[0]) / 2;
  P = P.map((v) => v.map((p) => [p[0] - cx, p[1], p[2] - mn[2]]));
  const L = mx[2] - mn[2];
  // The tip is the thin end: compare the top height near each end.
  const topNear = (z) => {
    const h = hitsY(slice(P, z), 0);
    return h.length ? h[h.length - 1] : 0;
  };
  let flipped = false;
  if (topNear(L * 0.02) < topNear(L * 0.98)) {
    flipped = true;
    P = P.map((v) => v.map((p) => [-p[0], p[1], L - p[2]])); // 180� turn about Y: a rotation, so winding is kept
  }
  return { P, info: { L, tableArea: tab.area, flipped } };
}

// Slice at z = zc: list of 2D segments [[x, y], [x, y]].
export function slice(P, zc) {
  const S = [];
  for (const v of P) {
    const d = v.map((p) => p[2] - zc),
      pts = [];
    for (let i = 0; i < 3; i++) {
      const a = v[i],
        b = v[(i + 1) % 3],
        da = d[i],
        db = d[(i + 1) % 3];
      if (da < 0 !== db < 0) {
        const t = da / (da - db);
        pts.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
    }
    if (pts.length === 2) S.push(pts);
  }
  return S;
}

// Crossings of the vertical line x = x0 (returns sorted y) / horizontal line y = y0 (sorted x).
export function hitsY(S, x0) {
  return hits(S, 0, x0);
}
export function hitsX(S, y0) {
  return hits(S, 1, y0);
}
function hits(S, axis, val) {
  const o = 1 - axis,
    r = [];
  for (const [a, b] of S) {
    const da = a[axis] - val,
      db = b[axis] - val;
    if (da < 0 !== db < 0) {
      const t = da / (da - db);
      r.push(a[o] + t * (b[o] - a[o]));
    }
  }
  return r.sort((x, y) => x - y);
}

// Even-odd rasterization of a slice on a grid (for area / overlap comparisons).
export function raster(S, x0, x1, y0, y1, step) {
  const nx = Math.ceil((x1 - x0) / step),
    ny = Math.ceil((y1 - y0) / step),
    g = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const xs = hitsX(S, y0 + (j + 0.5) * step);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - x0) / step - 0.5)),
        i1 = Math.min(nx - 1, Math.floor((xs[k + 1] - x0) / step - 0.5));
      for (let i = i0; i <= i1; i++) g[j * nx + i] = 1;
    }
  }
  return g;
}
