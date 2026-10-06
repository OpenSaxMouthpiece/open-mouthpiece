// The side section under "Chamber & baffle" and "Body & beak": the model cut through the middle
// (profile.ts), true to scale, walls solid and the air empty, the tip to the right and the reed
// table down. The shape before the last change shows dashed (kept until the next change), and B
// while comparing, so a baffle or chamber change reads at a glance without cutting the 3D view.
import { useEffect, useMemo, useRef, useState } from "react";
import { loopsBox, midSection, type Loop } from "../profile";

interface Props {
  stl: ArrayBuffer | null;
  final: boolean; // the model on screen is the final pass (not a draft)
  design: string; // the design and part on screen: a new one starts without a "before"
  sig: string; // its settings: a final render with other settings moves "now" to "before"
  compare?: { stl: ArrayBuffer; label: string } | null; // B, dashed blue
}

const W = 320,
  PAD = 6,
  FOOT = 16; // room under the plot for the scale and the labels

// Small loops are slivers where the plane grazes a facet, not walls.
const area = (l: Loop) =>
  Math.abs(l.reduce((a, [z, y], i) => a + z * l[(i + 1) % l.length][1] - l[(i + 1) % l.length][0] * y, 0) / 2);
const section = (stl: ArrayBuffer | null) => (stl ? midSection(stl).filter((l) => area(l) > 0.5) : []);

export function ProfileChart({ stl, final, design, sig, compare }: Props) {
  const now = useMemo(() => section(stl), [stl]);
  const b = useMemo(() => section(compare?.stl ?? null), [compare?.stl]);
  const [before, setBefore] = useState<Loop[] | null>(null);
  const last = useRef<{ design: string; sig: string; loops: Loop[] } | null>(null);
  useEffect(() => {
    if (!stl || !final || !now.length) return;
    const l = last.current;
    if (!l || l.design !== design) setBefore(null);
    else if (l.sig !== sig) setBefore(l.loops);
    last.current = { design, sig, loops: now };
  }, [stl, final, design, sig, now]);

  const box = loopsBox([...now, ...(before ?? []), ...b]);
  if (!box) return null;
  const [z0, y0, z1, y1] = box;
  const s = (W - 2 * PAD) / (z1 - z0);
  const H = (y1 - y0) * s + 2 * PAD + FOOT;
  const path = (loops: Loop[]) =>
    loops
      .map(
        (l) =>
          "M" +
          l.map(([z, y]) => `${(PAD + (z - z0) * s).toFixed(1)},${(PAD + (y1 - y) * s).toFixed(1)}`).join("L") +
          "Z",
      )
      .join("");
  const base = H - FOOT + 11;
  return (
    <div className="profile-chart">
      <div className="readout-label">Side section, through the middle</div>
      <svg
        viewBox={`0 0 ${W} ${H.toFixed(1)}`}
        role="img"
        aria-label="The mouthpiece cut lengthwise through the middle"
      >
        {/* "now" last: where nothing changed its line covers the dashed ones */}
        {before && <path className="before" d={path(before)} />}
        {b.length > 0 && <path className="b" d={path(b)} />}
        <path className="now" d={path(now)} fillRule="evenodd" />
        <line className="scale" x1={PAD} x2={PAD + 10 * s} y1={base - 4} y2={base - 4} />
        <text className="tick" x={PAD + 10 * s + 4} y={base - 1}>
          10 mm
        </text>
        <text className="tick" x={W - PAD} y={base - 1} textAnchor="end">
          tip →
        </text>
      </svg>
      <div className="profile-legend muted">
        <span>
          <span className="swatch now" /> now (the reed side is down)
        </span>
        {before && (
          <span>
            <span className="swatch before" /> before the last change
          </span>
        )}
        {b.length > 0 && (
          <span>
            <span className="swatch b" /> B {compare?.label}
          </span>
        )}
      </div>
    </div>
  );
}
