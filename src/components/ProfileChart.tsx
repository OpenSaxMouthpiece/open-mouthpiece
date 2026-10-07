// The side section under "Chamber & baffle" and "Body & beak": the model cut through the middle
// (profile.ts), true to scale, walls solid and the air empty, the tip to the right and the reed
// table down. The shape before the last change shows dashed (kept until the next change), and B
// while comparing, so a baffle or chamber change reads at a glance without cutting the 3D view.
// "Edit shape" puts a few handles on the section's lines (shapeEdit.ts) and adds a top view for the
// widths: dragging one pulls the line there, as an offset after the sliders.
import { useEffect, useMemo, useRef, useState } from "react";
import type { ParamValue } from "../api";
import type { Pt } from "../curves";
import { loopsBox, midSection, sideSilhouette, type Loop } from "../profile";
import {
  draggable,
  handleFs,
  lineAt,
  LINES,
  moved,
  previewLine,
  SECTION_LINES,
  tidy,
  toPrint,
  type LineName,
  type ShapeLines,
  type ShapeSection,
} from "../shapeEdit";

interface Props {
  stl: ArrayBuffer | null;
  final: boolean; // the model on screen is the final pass (not a draft)
  design: string; // the design and part on screen: a new one starts without a "before"
  sig: string; // its settings: a final render with other settings moves "now" to "before"
  compare?: { stl: ArrayBuffer; label: string } | null; // B, dashed blue
  outside?: boolean; // Body & beak: the outside seen from the side, not the cut
  edit?: {
    section: ShapeSection;
    shape: ShapeLines | null; // the lines of the model on screen (null until a full render)
    values: Record<string, ParamValue>; // the offsets set so far (*_adjust)
    onSet(param: string, pts: Pt[] | undefined): void;
  };
}

const W = 320,
  PAD = 6,
  FOOT = 16; // room under the plot for the scale and the labels
const LANDMARKS = ["throat", "window", "break"]; // the ones drawn while editing

// Small loops are slivers where the plane grazes a facet, not walls.
const area = (l: Loop) =>
  Math.abs(l.reduce((a, [z, y], i) => a + z * l[(i + 1) % l.length][1] - l[(i + 1) % l.length][0] * y, 0) / 2);
const section = (stl: ArrayBuffer | null, outside = false) =>
  !stl ? [] : outside ? sideSilhouette(stl) : midSection(stl).filter((l) => area(l) > 0.5);
const pathOf = (pts: [number, number][]) => "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L");

// A drag in progress: which line and handle, where it started (svg units), and how far (mm).
interface Drag {
  line: LineName;
  i: number;
  y0: number;
  d: number;
  k: number; // mm per svg unit, along the drag (x2 for a width's edge)
}

export function ProfileChart({ stl, final, design, sig, compare, outside = false, edit }: Props) {
  const now = useMemo(() => section(stl, outside), [stl, outside]);
  const b = useMemo(() => section(compare?.stl ?? null, outside), [compare?.stl, outside]);
  const [before, setBefore] = useState<Loop[] | null>(null);
  const last = useRef<{ design: string; sig: string; loops: Loop[] } | null>(null);
  const [editing, setEditing] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  useEffect(() => {
    if (!stl || !final || !now.length) return;
    const l = last.current;
    if (!l || l.design !== design) setBefore(null);
    else if (l.sig !== sig) setBefore(l.loops);
    last.current = { design, sig, loops: now };
  }, [stl, final, design, sig, now]);

  const shape = edit?.shape ?? null;
  const on = editing && !!edit && !!shape;
  const box = loopsBox([...now, ...(before ?? []), ...b]);
  if (!box) return null;
  const [z0, y0, z1, y1] = box;
  const s = (W - 2 * PAD) / (z1 - z0);
  const TOP = on ? 22 : 0; // room over the outline for the labels while editing
  const H = (y1 - y0) * s + 2 * PAD + FOOT + TOP;
  const X = (z: number) => PAD + (z - z0) * s,
    Y = (y: number) => TOP + PAD + (y1 - y) * s;
  const path = (loops: Loop[]) => loops.map((l) => pathOf(l.map(([z, y]) => [X(z), Y(y)])) + "Z").join("");
  const base = H - FOOT + 11;

  const names = edit ? SECTION_LINES[edit.section] : null;
  const adjOf = (n: LineName) => {
    const v = edit?.values[LINES[n].param];
    return Array.isArray(v) ? (v as Pt[]) : undefined;
  };
  const edited = names ? [...names.side, ...names.top].filter((n) => adjOf(n)?.length) : [];
  // A line as drawn: the model's, moved by whatever offsets changed since it was rendered (a drag
  // in progress, or one let go of while the model catches up, an undo), so nothing snaps back.
  const lineNow = (n: LineName): Pt[] => {
    const line = shape?.lines[n] ?? [];
    if (!shape) return line;
    const rendered = shape.values[LINES[n].param] as Pt[] | undefined;
    const now =
      drag?.line === n ? moved(adjOf(n), handleFs(n, shape, adjOf(n)), drag.i, drag.d, !!LINES[n].end) : adjOf(n);
    return JSON.stringify(rendered ?? []) === JSON.stringify(now ?? [])
      ? line
      : previewLine(line, rendered, now ?? [], shape.L);
  };
  const svgPt = (e: React.PointerEvent) => {
    const svg = (e.currentTarget as SVGElement).ownerSVGElement ?? (e.currentTarget as SVGSVGElement);
    const m = svg.getScreenCTM();
    return m ? new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()) : new DOMPoint(0, 0);
  };
  const start = (line: LineName, i: number, k: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // no capture: moves still arrive while over the chart
    }
    setDrag({ line, i, y0: svgPt(e).y, d: 0, k });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const d = Math.round((drag.y0 - svgPt(e).y) * drag.k * 20) / 20; // up = + (higher / wider), 0.05mm steps
    if (d !== drag.d) setDrag({ ...drag, d });
  };
  const end = () => {
    if (!drag || !edit || !shape) return setDrag(null);
    if (drag.d !== 0) {
      const n = drag.line,
        fs = handleFs(n, shape, adjOf(n)),
        next = tidy(moved(adjOf(n), fs, drag.i, drag.d, !!LINES[n].end));
      edit.onSet(LINES[n].param, next.length ? next : undefined);
    }
    setDrag(null);
  };
  const cos = shape ? Math.cos((shape.frame.tilt * Math.PI) / 180) : 1;
  const handles = (n: LineName, at: (z: number, v: number) => [number, number], k: number) => {
    if (!shape) return null;
    const shown = lineNow(n);
    const fs = handleFs(n, shape, adjOf(n));
    return fs.map((f, i) => {
      if (!draggable(n, i, fs.length)) return null;
      const [x, y] = at(f * shape.L, lineAt(shown, f * shape.L));
      const active = drag?.line === n && drag.i === i;
      return (
        <g key={`${n}${i}`} className={`edit-handle${active ? " active" : ""}`} onPointerDown={start(n, i, k)}>
          <circle className="hit" cx={x} cy={y} r={11} />
          <circle cx={x} cy={y} r={4.5} />
        </g>
      );
    });
  };
  const sideXY = (z: number, v: number): [number, number] => {
    const [pz, py] = toPrint(shape!.frame, z, v);
    return [X(pz), Y(py)];
  };

  return (
    <div className="profile-chart">
      <div className="profile-head">
        <span className="readout-label">{outside ? "From the side" : "Side section, through the middle"}</span>
        {edit && shape && (
          <button
            className={`link${on ? " on" : ""}`}
            onClick={() => setEditing(!on)}
            title="Pull the lines of this part of the mouthpiece by their dots (the sliders still work)"
          >
            {on ? "Done" : "Edit shape"}
          </button>
        )}
      </div>
      <svg
        className={on ? "editing" : undefined}
        viewBox={`0 0 ${W} ${H.toFixed(1)}`}
        role="img"
        aria-label="The mouthpiece cut lengthwise through the middle"
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={() => setDrag(null)}
      >
        {/* "now" last: where nothing changed its line covers the dashed ones */}
        {before && <path className="before" d={path(before)} />}
        {b.length > 0 && <path className="b" d={path(b)} />}
        <path className="now" d={path(now)} fillRule="evenodd" />
        {on &&
          shape!.landmarks
            .filter(([n]) => (outside ? n === "shoulder" || n === "break" : LANDMARKS.includes(n)))
            .map(([n, z], i) => {
              const [xa, ya] = sideXY(z, 0),
                [xb, yb] = sideXY(z, lineAt(shape!.lines.top ?? [], z));
              return (
                <g key={n} className="landmark">
                  <line x1={xa} y1={ya} x2={xb} y2={yb} />
                  <text x={xb} y={yb - 3 - (i % 2) * 10} textAnchor="middle">
                    {n}
                  </text>
                </g>
              );
            })}
        {on &&
          names!.side.map((n) => {
            const pts = lineNow(n);
            if (pts.length < 2) return null;
            // the label over the line near its start (the landmarks are further on), or past its end
            const under = n === "underside" || n === "floor";
            const at = under ? pts[pts.length - 1] : pts[Math.floor(pts.length * 0.22)];
            const [lx, ly] = sideXY(at[0], at[1]);
            return (
              <g key={n}>
                <path className="edit-line" d={pathOf(pts.map(([z, v]) => sideXY(z, v)))} />
                <text
                  className="edit-label"
                  x={lx + (under ? 6 : 0)}
                  y={ly + (under ? 4 : -8)}
                  textAnchor={under ? "start" : "middle"}
                >
                  {LINES[n].label}
                </text>
              </g>
            );
          })}
        {on && names!.side.map((n) => handles(n, sideXY, 1 / s / cos))}
        <line className="scale" x1={PAD} x2={PAD + 10 * s} y1={base - 4} y2={base - 4} />
        <text className="tick" x={PAD + 10 * s + 4} y={base - 1}>
          10 mm
        </text>
        <text className="tick" x={W - PAD} y={base - 1} textAnchor="end">
          tip →
        </text>
      </svg>
      {on && (
        <TopView
          shape={shape!}
          lineNow={lineNow}
          names={names!.top}
          inside={!outside}
          handles={handles}
          onMove={move}
          onEnd={end}
          onCancel={() => setDrag(null)}
        />
      )}
      {on ? (
        <div className="profile-legend muted">
          <span>Drag a dot up or down to pull the line there; the sliders still work.</span>
          {edited.length > 0 && (
            <button
              className="link"
              onClick={() => edited.forEach((n) => edit!.onSet(LINES[n].param, undefined))}
              title="Remove this section's shape edits"
            >
              Undo shape edits ({edited.map((n) => LINES[n].label).join(", ")})
            </button>
          )}
        </div>
      ) : (
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
          {edited.length > 0 && <span>shape edited: {edited.map((n) => LINES[n].label).join(", ")}</span>}
        </div>
      )}
    </div>
  );
}

// The view from above, the tip to the right: the outside and the inside width, for dragging widths.
function TopView({
  shape,
  lineNow,
  names,
  inside,
  handles,
  onMove,
  onEnd,
  onCancel,
}: {
  shape: ShapeLines;
  lineNow(n: LineName): Pt[];
  names: LineName[];
  inside: boolean; // show the inside width (the chamber's view), or the outside alone
  handles(n: LineName, at: (z: number, v: number) => [number, number], k: number): React.ReactNode;
  onMove(e: React.PointerEvent): void;
  onEnd(): void;
  onCancel(): void;
}) {
  const outer = lineNow("width"),
    inner = lineNow("chamber_width");
  if (outer.length < 2) return null;
  const s = (W - 2 * PAD) / shape.L;
  const half = Math.max(...outer.map((p) => p[1])) / 2;
  const H = 2 * half * s + 2 * PAD + 4;
  const X = (z: number) => PAD + z * s,
    Y = (w: number) => H / 2 - w * s; // w = half-width, + up
  const band = (pts: Pt[]) =>
    pathOf([
      ...pts.map(([z, w]) => [X(z), Y(w / 2)] as [number, number]),
      ...[...pts].reverse().map(([z, w]) => [X(z), Y(-w / 2)] as [number, number]),
    ]) + "Z";
  // a handle sits on the upper edge (+ half the width): a drag of d moves the width by 2d
  const edgeXY = (z: number, w: number): [number, number] => [X(z), Y(w / 2)];
  return (
    <>
      <div className="readout-label">From above</div>
      <svg
        className="editing"
        viewBox={`0 0 ${W} ${H.toFixed(1)}`}
        role="img"
        aria-label="The mouthpiece from above, outside and inside widths"
        onPointerMove={onMove}
        onPointerUp={onEnd}
        onPointerCancel={onCancel}
      >
        <path className="now" d={band(outer) + (inside && inner.length > 1 ? band(inner) : "")} fillRule="evenodd" />
        {names.map((n) => {
          const pts = lineNow(n);
          return pts.length > 1 ? (
            <g key={n}>
              <path className="edit-line" d={pathOf(pts.map(([z, w]) => edgeXY(z, w)))} />
              <path className="edit-line mirror" d={pathOf(pts.map(([z, w]) => [X(z), Y(-w / 2)]))} />
            </g>
          ) : null;
        })}
        {names.map((n) => handles(n, edgeXY, (2 / s) * 1))}
      </svg>
    </>
  );
}
