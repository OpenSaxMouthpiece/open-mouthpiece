// The air space ("Air space only" in the view) as a mesh built from the interior rings the generator
// echoes with every full render (air_view_rings()): no render of its own.
export const AIR_ECHO = "\necho(AIR_SOLID = air_view_rings());\n";

type P = [number, number, number];

export function parseAirEcho(log: string): P[][] | null {
  const m = /ECHO: AIR_SOLID = (.*)$/m.exec(log);
  if (!m) return null;
  try {
    const rings = JSON.parse(m[1].replace(/\bundef\b|-?\binf\b|\bnan\b/g, "null")) as P[][];
    const n = rings[0]?.length;
    if (rings.length < 2 || !n || n < 3) return null;
    if (!rings.every((r) => r.length === n && r.every((p) => p.length === 3 && p.every(Number.isFinite)))) return null;
    return rings;
  } catch {
    return null;
  }
}

// A binary STL of the loft through the rings, closed at both ends (the same triangles ring_loft makes).
export function buildAirStl(rings: P[][]): ArrayBuffer {
  const n = rings[0].length;
  const m = rings.length - 1;
  const tris: [P, P, P][] = [];
  for (let i = 0; i < m; i++)
    for (let k = 0; k < n; k++) {
      const a = rings[i][k],
        b = rings[i][(k + 1) % n],
        c = rings[i + 1][(k + 1) % n],
        d = rings[i + 1][k];
      if (k < n / 2) tris.push([a, c, b], [a, d, c]);
      else tris.push([a, d, b], [b, d, c]);
    }
  const centre = (r: P[]): P => [
    r.reduce((s, p) => s + p[0], 0) / n,
    r.reduce((s, p) => s + p[1], 0) / n,
    r.reduce((s, p) => s + p[2], 0) / n,
  ];
  const c0 = centre(rings[0]),
    c1 = centre(rings[m]);
  for (let k = 0; k < n; k++) {
    tris.push([c0, rings[0][k], rings[0][(k + 1) % n]]);
    tris.push([c1, rings[m][(k + 1) % n], rings[m][k]]);
  }
  // face the normals outward whichever way the loft winds (a positive signed volume)
  let vol = 0;
  for (const [a, b, c] of tris)
    vol +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;
  const flip = vol < 0;
  const buf = new ArrayBuffer(84 + tris.length * 50);
  const v = new DataView(buf);
  v.setUint32(80, tris.length, true);
  tris.forEach((t, i) => {
    const [a, b, c] = flip ? [t[0], t[2], t[1]] : t;
    const ux = b[0] - a[0],
      uy = b[1] - a[1],
      uz = b[2] - a[2],
      wx = c[0] - a[0],
      wy = c[1] - a[1],
      wz = c[2] - a[2];
    let nx = uy * wz - uz * wy,
      ny = uz * wx - ux * wz,
      nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    const o = 84 + i * 50;
    [nx, ny, nz, ...a, ...b, ...c].forEach((x, j) => v.setFloat32(o + j * 4, x, true));
  });
  return buf;
}
