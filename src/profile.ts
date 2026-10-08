// The side profile: the model's binary STL cut by the mid plane (x = 0), as closed loops in the
// (z, y) plane: z along the mouthpiece (the shank end at 0, the tip at the top of the print), y
// across it (+ toward the top of the beak, - toward the reed table). Drawn by ProfileChart with an
// even-odd fill, so walls show solid and the bore, chamber and window as air.

export type Loop = [number, number][];

const KEY = 1e3; // endpoints closer than 1/1000 mm are the same point

export function midSection(stl: ArrayBuffer, x0 = 1e-4): Loop[] {
  const dv = new DataView(stl);
  if (stl.byteLength < 84) return [];
  const n = dv.getUint32(80, true);
  if (stl.byteLength < 84 + n * 50) return [];
  const segs: [number, number, number, number][] = [];
  const v = new Float64Array(9);
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50 + 12;
    for (let k = 0; k < 9; k++) v[k] = dv.getFloat32(o + k * 4, true);
    const pts: [number, number][] = [];
    for (let e = 0; e < 3; e++) {
      let a = e * 3,
        b = ((e + 1) % 3) * 3;
      const da = v[a] - x0,
        db = v[b] - x0;
      if (da < 0 === db < 0) continue;
      // the same edge in the neighbouring triangle runs the other way: interpolate in one order
      if (v[a] > v[b] || (v[a] === v[b] && v[a + 2] > v[b + 2])) [a, b] = [b, a];
      const t = (x0 - v[a]) / (v[b] - v[a]);
      pts.push([v[a + 2] + t * (v[b + 2] - v[a + 2]), v[a + 1] + t * (v[b + 1] - v[a + 1])]);
    }
    if (pts.length === 2) segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
  }
  return chain(segs);
}

// Segments into loops by their shared endpoints (an open chain is kept as it is).
function chain(segs: [number, number, number, number][]): Loop[] {
  const key = (z: number, y: number) => `${Math.round(z * KEY)},${Math.round(y * KEY)}`;
  const at = new Map<string, number[]>();
  segs.forEach((s, i) => {
    for (const k of [key(s[0], s[1]), key(s[2], s[3])]) {
      const l = at.get(k);
      if (l) l.push(i);
      else at.set(k, [i]);
    }
  });
  const used = new Uint8Array(segs.length);
  const loops: Loop[] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const s = segs[i];
    const loop: Loop = [
      [s[0], s[1]],
      [s[2], s[3]],
    ];
    for (;;) {
      const [z, y] = loop[loop.length - 1];
      const next = at.get(key(z, y))?.find((j) => !used[j]);
      if (next === undefined) break;
      used[next] = 1;
      const t = segs[next];
      const far: [number, number] = key(t[0], t[1]) === key(z, y) ? [t[2], t[3]] : [t[0], t[1]];
      loop.push(far);
    }
    if (loop.length > 2) loops.push(loop);
  }
  return loops;
}

export function loopsBox(loops: Loop[]): [number, number, number, number] | null {
  let z0 = Infinity,
    y0 = Infinity,
    z1 = -Infinity,
    y1 = -Infinity;
  for (const l of loops)
    for (const [z, y] of l) {
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  return z0 < z1 ? [z0, y0, z1, y1] : null;
}

// The side view's outline (Body & beak): the model cut across every 0.5 mm along z, the highest and
// the lowest point of each cut, as one loop (top toward the tip, then the underside back). Same (z, y)
// frame as midSection. (Cuts, not vertices: the outside's rings don't share the inside's stations.)
export function sideSilhouette(stl: ArrayBuffer, step = 0.5): Loop[] {
  const dv = new DataView(stl);
  if (stl.byteLength < 84) return [];
  const n = dv.getUint32(80, true);
  if (stl.byteLength < 84 + n * 50) return [];
  const hi = new Map<number, number>(),
    lo = new Map<number, number>();
  const ys = new Float64Array(3),
    zs = new Float64Array(3);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) {
      const o = 84 + i * 50 + 12 + k * 12;
      ys[k] = dv.getFloat32(o + 4, true);
      zs[k] = dv.getFloat32(o + 8, true);
    }
    const b0 = Math.ceil(Math.min(zs[0], zs[1], zs[2]) / step),
      b1 = Math.floor(Math.max(zs[0], zs[1], zs[2]) / step);
    for (let b = b0; b <= b1; b++) {
      const z = b * step;
      for (let e = 0; e < 3; e++) {
        const a = e,
          c = (e + 1) % 3;
        if ((zs[a] - z) * (zs[c] - z) > 0 || zs[a] === zs[c]) continue;
        const y = ys[a] + ((z - zs[a]) / (zs[c] - zs[a])) * (ys[c] - ys[a]);
        hi.set(b, Math.max(hi.get(b) ?? -Infinity, y));
        lo.set(b, Math.min(lo.get(b) ?? Infinity, y));
      }
    }
  }
  const bins = [...hi.keys()].sort((a, b) => a - b);
  if (bins.length < 2) return [];
  return [
    [
      ...bins.map((b) => [b * step, hi.get(b)!] as [number, number]),
      ...bins.reverse().map((b) => [b * step, lo.get(b)!] as [number, number]),
    ],
  ];
}

// The model's length along z (min, max): where a cut across it can go.
export function zRange(stl: ArrayBuffer): [number, number] | null {
  const dv = new DataView(stl);
  if (stl.byteLength < 84) return null;
  const n = dv.getUint32(80, true);
  if (stl.byteLength < 84 + n * 50) return null;
  let z0 = Infinity,
    z1 = -Infinity;
  for (let i = 0; i < n; i++)
    for (let k = 0; k < 3; k++) {
      const z = dv.getFloat32(84 + i * 50 + 12 + k * 12 + 8, true);
      if (z < z0) z0 = z;
      if (z > z1) z1 = z;
    }
  return z1 > z0 ? [z0, z1] : null;
}

// The model cut across at height z, as segments in (x, y).
function crossSegs(stl: ArrayBuffer, z: number): [number, number, number, number][] {
  const dv = new DataView(stl);
  if (stl.byteLength < 84) return [];
  const n = dv.getUint32(80, true);
  if (stl.byteLength < 84 + n * 50) return [];
  const segs: [number, number, number, number][] = [];
  const v = new Float64Array(9);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 9; k++) v[k] = dv.getFloat32(84 + i * 50 + 12 + k * 4, true);
    const p: number[] = [];
    for (let e = 0; e < 3; e++) {
      let a = e * 3,
        b = ((e + 1) % 3) * 3;
      if (v[a + 2] - z < 0 === v[b + 2] - z < 0) continue;
      // the same edge in the neighbouring triangle runs the other way: interpolate in one order
      if (v[a + 2] > v[b + 2] || (v[a + 2] === v[b + 2] && v[a] > v[b])) [a, b] = [b, a];
      const t = (z - v[a + 2]) / (v[b + 2] - v[a + 2]);
      p.push(v[a] + t * (v[b] - v[a]), v[a + 1] + t * (v[b + 1] - v[a + 1]));
    }
    if (p.length === 4) segs.push([p[0], p[1], p[2], p[3]]);
  }
  return segs;
}

// The cut across at height z as loops (the Inside's slice: walls solid, air empty with an even-odd fill).
export const crossSection = (stl: ArrayBuffer, z: number): Loop[] => chain(crossSegs(stl, z));

// The outside of a cut across the model at height z (the Outside's slice), in (x, y): along each
// direction up from the middle of the cut's bottom (the reed side), the farthest edge it crosses,
// closed along the bottom, so the window's opening and the bore don't show; the outline seen from
// the tip at that point.
export function crossOutline(stl: ArrayBuffer, z: number, rays = 240): Loop[] {
  const segs = crossSegs(stl, z);
  if (segs.length < 3) return [];
  let x0 = Infinity,
    x1 = -Infinity,
    y0 = Infinity,
    y1 = -Infinity;
  for (const [ax, ay, bx, by] of segs) {
    x0 = Math.min(x0, ax, bx);
    x1 = Math.max(x1, ax, bx);
    y0 = Math.min(y0, ay, by);
    y1 = Math.max(y1, ay, by);
  }
  const cx = (x0 + x1) / 2,
    cy = y0 + 1e-3 * (y1 - y0);
  const loop: [number, number][] = [];
  for (let k = 0; k <= rays / 2; k++) {
    const a = (2 * Math.PI * k) / rays,
      dx = Math.cos(a),
      dy = Math.sin(a);
    let best = -1;
    for (const [ax, ay, bx, by] of segs) {
      // ray (cx, cy) + t (dx, dy) against the segment a + u (b - a)
      const ex = bx - ax,
        ey = by - ay,
        den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const qx = ax - cx,
        qy = ay - cy,
        t = (qx * ey - qy * ex) / den,
        u = (qx * dy - qy * dx) / den;
      if (t > best && u >= 0 && u <= 1) best = t;
    }
    if (best > 0) loop.push([cx + best * dx, cy + best * dy]);
  }
  return loop.length > 2 ? [loop] : [];
}
