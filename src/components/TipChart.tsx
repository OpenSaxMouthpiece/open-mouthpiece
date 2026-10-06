// "From the tip" under Body & beak: the outside of a cut across the beak (profile.ts crossOutline),
// true to scale, the top up and the reed side down, so the cross-section settings (Beak top, Beak
// top width, Sides near the table) show what they did. Where it cuts moves from the shoulder to the
// tip, at one scale for the whole slider (so the beak visibly thins toward the tip), each outline
// standing on its reed side. The shape before the last change shows dashed, and B while comparing,
// as in the side views.
import { useEffect, useMemo, useRef, useState } from "react";
import { crossOutline, loopsBox, zRange, type Loop } from "../profile";

interface Props {
  stl: ArrayBuffer | null;
  final: boolean; // the model on screen is the final pass (not a draft)
  design: string; // the design on screen: a new one starts without a "before"
  sig: string; // its settings: a final render with other settings moves "now" to "before"
  compare?: { stl: ArrayBuffer; label: string } | null;
}

const W = 320,
  PAD = 8,
  MAX_H = 150;
// The cut, as a share of the model's length from the shank end: from about the shoulder to near
// the tip (a printed model stands on its shank end, so z runs along it).
const CUT_MIN = 0.62,
  CUT_MAX = 0.95;

const cut = (stl: ArrayBuffer | null, f: number) => {
  const r = stl ? zRange(stl) : null;
  return stl && r ? crossOutline(stl, r[0] + f * (r[1] - r[0])) : [];
};
// mm from the tip at share f of the length
const fromTip = (stl: ArrayBuffer | null, f: number) => {
  const r = stl ? zRange(stl) : null;
  return r ? (1 - f) * (r[1] - r[0]) : null;
};
// Outlines moved to stand centred on the reed side (y = 0, x centred), so cuts at any place line up.
const seat = (loops: Loop[]): Loop[] => {
  const b = loopsBox(loops);
  if (!b) return loops;
  const cx = (b[0] + b[2]) / 2;
  return loops.map((l) => l.map(([x, y]) => [x - cx, y - b[1]] as [number, number]));
};
const pathOf = (l: Loop, X: (x: number) => number, Y: (y: number) => number) =>
  "M" + l.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join("L") + "Z";

export function TipChart({ stl, final, design, sig, compare }: Props) {
  const [f, setF] = useState(0.8);
  const now = useMemo(() => seat(cut(stl, f)), [stl, f]);
  const b = useMemo(() => seat(cut(compare?.stl ?? null, f)), [compare?.stl, f]);
  // the frame: the biggest cut of the range (near the shoulder), so the scale doesn't follow the slider
  const widest = useMemo(() => seat(cut(stl, CUT_MIN)), [stl]);
  // "before" is the last final model with other settings, cut where "now" is cut
  const [beforeStl, setBeforeStl] = useState<ArrayBuffer | null>(null);
  const last = useRef<{ design: string; sig: string; stl: ArrayBuffer } | null>(null);
  useEffect(() => {
    if (!stl || !final) return;
    const l = last.current;
    if (!l || l.design !== design) setBeforeStl(null);
    else if (l.sig !== sig) setBeforeStl(l.stl);
    last.current = { design, sig, stl };
  }, [stl, final, design, sig]);
  const before = useMemo(() => seat(cut(beforeStl, f)), [beforeStl, f]);
  const mm = fromTip(stl, f);

  const box = loopsBox([...widest, ...now, ...before, ...b]);
  if (!box) return null;
  const [x0, y0, x1, y1] = box;
  const s = Math.min((W - 2 * PAD) / (x1 - x0), MAX_H / (y1 - y0));
  const H = (y1 - y0) * s + 2 * PAD;
  const ox = (W - (x1 - x0) * s) / 2; // centred
  const X = (x: number) => ox + (x - x0) * s,
    Y = (y: number) => PAD + (y1 - y) * s;
  return (
    <div className="profile-chart tip-chart">
      <div className="profile-head">
        <span className="readout-label">From the tip, across the beak</span>
        {mm != null && <span className="muted">cut {Math.round(mm)} mm from the tip</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H.toFixed(1)}`} role="img" aria-label="The beak cut across, seen from the tip">
        {before.map((l, i) => (
          <path key={`a${i}`} className="before" d={pathOf(l, X, Y)} />
        ))}
        {b.map((l, i) => (
          <path key={`b${i}`} className="b" d={pathOf(l, X, Y)} />
        ))}
        {now.map((l, i) => (
          <path key={`n${i}`} className="now" d={pathOf(l, X, Y)} />
        ))}
      </svg>
      <div className="param tip-cut">
        <div className="number">
          <div className="slider">
            <input
              type="range"
              min={CUT_MIN}
              max={CUT_MAX}
              step={0.01}
              value={f}
              aria-label="Where it cuts"
              onChange={(e) => setF(Number(e.target.value))}
            />
            <div className="slider-ends" aria-hidden="true">
              <span>Near the shoulder</span>
              <span>Near the tip</span>
            </div>
          </div>
        </div>
      </div>
      <div className="profile-legend muted">
        <span>
          <span className="swatch now" /> now (the reed side is down)
        </span>
        {before.length > 0 && (
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
