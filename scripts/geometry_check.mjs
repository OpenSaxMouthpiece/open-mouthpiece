// Independent measurements of a mouthpiece mesh (design frame: z along the bore from the shank end,
// y up from the table plane, x across), for scripts/check.mjs. They read the mesh itself, not the
// formulas that built it, so a regression that keeps the fingerprint "explainable" still shows up:
//   - overall length: the mesh ends where overall_length says;
//   - symmetry: the body and the two side rails mirror each other;
//   - facing: the underside of the rails, sliced across the mesh, sits at the gap the generator
//     reports (FACING lines) and at tip_opening at the very tip;
//   - rails: neither side rail narrows below 0.8 mm, measured just above the facing.
import { slice, hitsX, hitsY } from './mesh_frame.mjs';

const FACING_STOPS = [1, 2.5, 5, 10, 15, 20]; // mm back from the tip
const MIN_RAIL = 0.8; // mm; the guarantee's floor for a side rail (side_rail_width runs 0.8..2.5)

// "FACING d h" lines of part = facing_report -> [[d, h], ...]
export function parseFacingLines(log) {
  return [...log.matchAll(/FACING ([\d.eE+-]+) ([\d.eE+-]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
}

// The lowest point of the section at z across all x: the rails' underside in the window region.
function railBottom(S, xmax) {
  let m = Infinity;
  for (let x = 0; x <= xmax; x += 0.1) {
    const h = hitsY(S, x);
    if (h.length) m = Math.min(m, h[0]);
  }
  return m;
}

// T: triangles of the design-frame mesh; v: the file's settings (numbers as written); facing: FACING rows.
// Returns a list of problems (empty = fine) and the measured numbers for the report.
export function geometryChecks(T, v, facing) {
  const problems = [];
  const mn = [Infinity, Infinity, Infinity],
    mx = [-Infinity, -Infinity, -Infinity];
  for (const t of T)
    for (const p of t)
      p.forEach((c, i) => {
        mn[i] = Math.min(mn[i], c);
        mx[i] = Math.max(mx[i], c);
      });
  const L = Number(v.overall_length),
    F = Number(v.facing_length),
    tip = Number(v.tip_opening);
  if (Math.abs(mx[2] - L) > 0.15) problems.push(`mesh ends at z=${mx[2].toFixed(2)}, overall_length says ${L}`);
  if (Math.abs(mn[0] + mx[0]) > 0.02)
    problems.push(`body is not symmetric: x runs ${mn[0].toFixed(3)}..${mx[0].toFixed(3)}`);

  const xmax = mx[0];
  const rows = facing ?? [];
  const at = (d) => rows.find((r) => Math.abs(r[0] - d) < 1e-6);
  const gaps = {};
  for (const d of FACING_STOPS) {
    if (d > F - 1) continue;
    const S = slice(T, L - d);
    const m = railBottom(S, xmax);
    gaps[d] = m;
    const want = at(d)?.[1];
    if (want !== undefined && Math.abs(m - want) > 0.03)
      problems.push(
        `facing ${d} mm from the tip: the mesh has ${m.toFixed(3)} mm, the generator reports ${want.toFixed(3)}`,
      );
    // the rails: two crossings on each side just above their underside
    const h = hitsX(S, m + 0.1);
    if (h.length === 4) {
      const left = h[1] - h[0],
        right = h[3] - h[2];
      if (Math.abs(left - right) > 0.03)
        problems.push(`rails ${d} mm from the tip differ: ${left.toFixed(2)} vs ${right.toFixed(2)} mm wide`);
      if (Math.min(left, right) < MIN_RAIL)
        problems.push(`rail ${d} mm from the tip is only ${Math.min(left, right).toFixed(2)} mm wide`);
    }
  }
  // the opening at the very tip (the section a quarter millimetre behind the front)
  const tipGap = railBottom(slice(T, L - 0.25), xmax);
  if (Math.abs(tipGap - tip) > 0.1)
    problems.push(`tip opening: the mesh has ${tipGap.toFixed(2)} mm, tip_opening says ${tip}`);
  return { problems, measured: { length: +mx[2].toFixed(2), tipGap: +tipGap.toFixed(3) } };
}
