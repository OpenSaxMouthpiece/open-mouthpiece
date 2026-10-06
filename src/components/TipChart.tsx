// "From the tip" under Body & beak: the outside of a cut across the beak (profile.ts crossOutline),
// true to scale, the top up and the reed side down, so the cross-section settings (Beak top, Beak
// top width, Sides near the table) show what they did. Where it cuts moves from the shoulder to the
// tip, at one scale for the whole slider (so the beak visibly thins toward the tip), each outline
// standing on its reed side. The shape before the last change shows dashed, and B while comparing,
// as in the side views. It opens as a floating card (a view, not a setting), so the sliders stay
// usable beside it; closed, it only keeps track of the shape before the last change.
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<CSSProperties>({});
  const opener = useRef<HTMLButtonElement>(null);
  const now = useMemo(() => (open ? seat(cut(stl, f)) : []), [open, stl, f]);
  const b = useMemo(() => (open ? seat(cut(compare?.stl ?? null, f)) : []), [open, compare?.stl, f]);
  // the frame: the biggest cut of the range (near the shoulder), so the scale doesn't follow the slider
  const widest = useMemo(() => (open ? seat(cut(stl, CUT_MIN)) : []), [open, stl]);
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
  const before = useMemo(() => (open ? seat(cut(beforeStl, f)) : []), [open, beforeStl, f]);
  const mm = fromTip(stl, f);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  // beside the settings panel, over the 3D view; on a phone, along the bottom of the screen
  const show = () => {
    const panel = opener.current?.closest(".design-section")?.getBoundingClientRect();
    setPlace(
      panel && panel.left > 400
        ? {
            right: window.innerWidth - panel.left + 12,
            top: Math.max(60, Math.min(panel.top, window.innerHeight - 380)),
          }
        : { left: 8, right: 8, bottom: 8, width: "auto" },
    );
    setOpen(true);
  };

  const box = loopsBox([...widest, ...now, ...before, ...b]);
  if (!open || !box)
    return (
      <div className="tip-open">
        <button ref={opener} className="link" onClick={show} disabled={!stl}>
          See it from the tip ▸
        </button>
        <span className="muted"> a slice across the beak</span>
      </div>
    );
  const [x0, y0, x1, y1] = box;
  const s = Math.min((W - 2 * PAD) / (x1 - x0), MAX_H / (y1 - y0));
  const H = (y1 - y0) * s + 2 * PAD;
  const ox = (W - (x1 - x0) * s) / 2; // centred
  const X = (x: number) => ox + (x - x0) * s,
    Y = (y: number) => PAD + (y1 - y) * s;
  return (
    <div className="profile-chart tip-chart" style={place} role="dialog" aria-label="From the tip">
      <div className="profile-head">
        <span className="readout-label">From the tip, across the beak</span>
        <button className="link tip-close" onClick={() => setOpen(false)} aria-label="Close" title="Close (Esc)">
          ✕
        </button>
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
      <div className="tip-cut-label muted">Where to slice{mm != null && `: ${Math.round(mm)} mm from the tip`}</div>
      <div className="param tip-cut">
        <div className="number">
          <div className="slider">
            <input
              type="range"
              min={CUT_MIN}
              max={CUT_MAX}
              step={0.01}
              value={f}
              aria-label="Where to slice"
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
