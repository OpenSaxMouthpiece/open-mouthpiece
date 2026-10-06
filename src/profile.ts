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
