// Regression guard: even a watertight, genus-1 model can hide a slot above a lower tip lip.
// A cut bevel must open into the window; check the finished mesh in its design frame.
import { slice, hitsY } from './mesh_frame.mjs';

// Sample forward of the original window edge, beyond its 0.02mm overlap skin.
export function tipBevelPocket(triangles, front, depth) {
  if (depth < 0.05) return 0;
  // Slice just off the symmetry plane to avoid duplicate crossings on triangle edges.
  const across = triangles.map((t) => t.map(([x, y, z]) => [z, y, x]));
  let gap = 0;
  const section = slice(across, 0.001);
  for (const t of [0.2, 0.5, 0.8]) {
    const crossings = hitsY(section, front + Math.max(0.03, depth * t)).filter(
      (y, i, all) => i === 0 || y - all[i - 1] > 0.0001,
    );
    // One material interval is the continuous beak. Two intervals mean a lower lip and an
    // upper baffle, with the unwanted air gap between them.
    if (crossings.length >= 4) gap = Math.max(gap, crossings[2] - crossings[1]);
  }
  return gap;
}
