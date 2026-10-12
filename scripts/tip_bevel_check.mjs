// tip_bevel's promise: printed standing on its shank, nothing around the window's front hangs
// flatter than 45 degrees. Measured on the design-frame mesh: the area of faces near the tip whose
// normal, in the print frame (turned by the bore tilt as part = mouthpiece prints), points down
// within ~43 degrees of straight down.
export function tipOverhang(triangles, winFront, tilt) {
  const c = Math.cos((tilt * Math.PI) / 180),
    s = Math.sin((tilt * Math.PI) / 180);
  let area = 0;
  for (const [a, b, d] of triangles) {
    if ((a[2] + b[2] + d[2]) / 3 < winFront - 4) continue;
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
      v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const len = Math.hypot(...n);
    if (!len) continue;
    if ((n[2] * c - n[1] * s) / len < -0.73) area += len / 2;
  }
  return area;
}
