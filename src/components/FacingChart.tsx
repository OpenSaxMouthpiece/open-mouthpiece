// The facing curve in the readouts: gap under the reed (thousandths of an inch) against
// distance from the tip, with where each feeler gauge stops, and a few curves to pick from
// (FACING_CHOICES). The curve can also be dragged: the tip
// end sets tip_opening, the flat end facing_length, the points between switch the facing to the
// Gauge model with those points (facing_gauge_points as a Customizer value, so it works on a preset
// too, downloads and shares). Same rules as the generator (GAUGE_PTS): the ends are fixed by the
// tip opening and facing length, the gap never rises toward the flat end, PCHIP in between.
import { useEffect, useRef, useState } from "react";
import { FACING_CHOICES, mmToThou } from "../design";
import { gaugeStops } from "../readouts";
import { pchip, type Pt } from "../curves";

export interface FacingEdit {
  gauge: Pt[] | null; // the Gauge points in effect, or null (a smooth model)
  tipRange: [number, number];
  lengthRange: [number, number];
  onGauge(pts: Pt[] | null): void; // null: back to the smooth (power) curve
  onTip(mm: number): void;
  onLength(mm: number): void;
}

export interface FacingPick {
  current: string | null; // the FACING_CHOICES id in effect, or null (none of them)
  onPick(id: string): void;
}

interface Props {
  facing: [number, number][]; // the model's facing: [mm from the tip, gap mm]
  tip: number; // tip opening, mm
  length: number; // facing length, mm
  edit?: FacingEdit; // drag the curve
  pick?: FacingPick;
  compare?: { facing: [number, number][]; label: string }; // B's facing (A/B compare), dashed blue
}

// The gauge points as the generator uses them: inside (0, F), in order, never rising toward the break.
export function cleanGauge(pts: Pt[], T: number, F: number): Pt[] {
  const out: Pt[] = [];
  let lastD = 0,
    lastG = T;
  for (const [d, g] of pts) {
    if (!(d > lastD && d < F)) continue;
    lastD = d;
    lastG = Math.max(0, Math.min(lastG, g));
    out.push([d, lastG]);
  }
  return out;
}

// The facing (sorted samples) at d, by straight-line interpolation.
function gapAt(facing: [number, number][], d: number) {
  for (let i = 1; i < facing.length; i++) {
    const [d0, h0] = facing[i - 1],
      [d1, h1] = facing[i];
    if (d <= d1) return d1 === d0 ? h1 : h0 + ((d - d0) / (d1 - d0)) * (h1 - h0);
  }
  return facing[facing.length - 1]?.[1] ?? 0;
}

const W = 320,
  H = 160,
  ML = 36,
  MR = 10,
  MT = 10,
  MB = 28;
const round = (v: number, k: number) => Math.round(v * k) / k;

type Drag = { i: number; moved: boolean; x: number; y: number; dom: { maxD: number; maxT: number } };

export function FacingChart({ facing, tip: T, length: F, edit, pick, compare }: Props) {
  // The knots: the tip, the points in between (the gauge points, or four points on the smooth
  // curve to start from), the break.
  const inner = edit?.gauge
    ? cleanGauge(edit.gauge, T, F)
    : [0.2, 0.4, 0.6, 0.8].map((f) => [round(f * F, 10), gapAt(facing, f * F)] as Pt);
  const knots: Pt[] = [[0, T], ...inner, [F, 0]];
  const [draft, setDraft] = useState<Pt[] | null>(null);
  const [scaled, setScaled] = useState<{ t: number; f: number } | null>(null); // smooth model: tip/length being dragged
  const drag = useRef<Drag | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // a new facing from the model replaces the preview
  useEffect(() => {
    if (!drag.current) {
      setDraft(null);
      setScaled(null);
    }
  }, [facing]);

  const shown = draft ?? knots;
  const sT = shown[0][1],
    sF = shown[shown.length - 1][0];
  // the axes also fit B's facing when one is compared
  const bF = compare ? Math.max(0, ...compare.facing.filter(([, h]) => h > 0.001).map(([d]) => d)) : 0;
  const bT = compare ? Math.max(0, ...compare.facing.map(([, h]) => h)) : 0;
  const dom = drag.current?.dom ?? {
    maxD: Math.ceil((Math.max(F, bF) + 4) / 5) * 5,
    maxT: Math.ceil((mmToThou(Math.max(T, bT)) * 1.2) / 20) * 20 || 20,
  };
  const x = (d: number) => ML + (d / dom.maxD) * (W - ML - MR);
  const y = (t: number) => MT + (1 - t / dom.maxT) * (H - MT - MB);
  const toData = (e: { clientX: number; clientY: number }): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W,
      py = ((e.clientY - r.top) / r.height) * H;
    return [((px - ML) / (W - ML - MR)) * dom.maxD, ((1 - (py - MT) / (H - MT - MB)) * dom.maxT) / 39.37];
  };

  // The curve drawn: the model's facing, or while editing the preview (PCHIP through the knots as
  // the generator does it; the smooth model only scales while its ends move).
  let curve: [number, number][];
  if (draft && (edit?.gauge || !scaled))
    curve = Array.from({ length: 121 }, (_, k) => {
      const d = (sF * k) / 120;
      return [d, pchip(d, draft)];
    });
  else if (scaled) curve = facing.map(([d, h]) => [d * scaled.f, h * scaled.t]);
  else curve = facing;
  const path = curve.map(([d, h], i) => `${i ? "L" : "M"}${x(d).toFixed(1)},${y(mmToThou(h)).toFixed(1)}`).join("");
  const stops = gaugeStops(curve);
  const dTicks = Array.from({ length: Math.floor(dom.maxD / 5) + 1 }, (_, i) => i * 5);
  const tTicks = Array.from({ length: dom.maxT / 20 + 1 }, (_, i) => i * 20);

  // ---- editing
  const commitInner = (pts: Pt[]) => edit?.onGauge(pts.map(([d, g]) => [round(d, 10), round(g, 1000)] as Pt));
  const onDown = (i: number, e: React.PointerEvent) => {
    if (!edit) return;
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* moves still reach the svg */
    }
    drag.current = { i, moved: false, x: e.clientX, y: e.clientY, dom };
    setDraft(knots);
  };
  const onMove = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g || !edit) return;
    if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) < 3) return;
    g.moved = true;
    const [d, v] = toData(e);
    const n = knots.length;
    let next: Pt[];
    if (g.i === 0) {
      // the tip: the tip opening; the points in between scale with it
      const t = round(Math.min(edit.tipRange[1], Math.max(edit.tipRange[0], v)), 100);
      next = knots.map(([kd, kg]) => [kd, (kg * t) / T] as Pt);
      setScaled({ t: t / T, f: 1 });
    } else if (g.i === n - 1) {
      // the break: the facing length; the points in between scale with it
      const f = round(Math.min(edit.lengthRange[1], Math.max(edit.lengthRange[0], d)), 10);
      next = knots.map(([kd, kg]) => [(kd * f) / F, kg] as Pt);
      setScaled({ t: 1, f: f / F });
    } else {
      // a point in between: stays between its neighbours, never rising toward the break
      const [pd, pg] = knots[g.i - 1],
        [nd, ng] = knots[g.i + 1];
      next = knots.slice();
      next[g.i] = [round(Math.min(nd - 0.2, Math.max(pd + 0.2, d)), 10), Math.min(pg, Math.max(ng, v))];
      setScaled(null);
    }
    setDraft(next);
  };
  const onUp = () => {
    const g = drag.current;
    drag.current = null;
    if (!g || !edit || !draft) return;
    if (!g.moved) {
      setDraft(null);
      setScaled(null);
      return;
    }
    const n = draft.length;
    if (g.i === 0) {
      edit.onTip(draft[0][1]);
      if (edit.gauge) commitInner(draft.slice(1, -1));
    } else if (g.i === n - 1) {
      edit.onLength(draft[n - 1][0]);
      if (edit.gauge) commitInner(draft.slice(1, -1));
    } else commitInner(draft.slice(1, -1));
  };
  // Tap the chart: a new point there, on the curve (so nothing changes until it's dragged).
  const tap = useRef<{ x: number; y: number } | null>(null);
  const onBgUp = (e: React.PointerEvent) => {
    const t = tap.current;
    tap.current = null;
    if (!edit || !t || Math.hypot(e.clientX - t.x, e.clientY - t.y) > 6) return;
    const [d] = toData(e);
    if (!(d > 0.3 && d < F - 0.3) || inner.some((p) => Math.abs(p[0] - d) < 0.5)) return;
    commitInner([...inner, [d, gapAt(facing, d)] as Pt].sort((a, b) => a[0] - b[0]));
  };
  const remove = (i: number) => {
    if (edit && i > 0 && i < knots.length - 1) commitInner(inner.filter((_, j) => j !== i - 1));
  };

  return (
    <div className="facing-chart">
      <div className="readout-label">Facing curve{edit?.gauge ? " (your points)" : ""}</div>
      {pick && (
        <div className="facing-picks" role="group" aria-label="Facing curve">
          {FACING_CHOICES.map((c) => (
            <button
              key={c.id}
              className={pick.current === c.id ? "on" : undefined}
              aria-pressed={pick.current === c.id}
              title={c.hint}
              onClick={() => {
                setDraft(null);
                setScaled(null);
                pick.onPick(c.id);
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Facing curve: gap under the reed against distance from the tip"
        className={edit ? "editable" : undefined}
        onPointerMove={onMove}
        onPointerUp={(e) => {
          if (drag.current) onUp();
          else onBgUp(e);
        }}
        onPointerDown={(e) => {
          tap.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerCancel={() => {
          drag.current = null;
          tap.current = null;
          setDraft(null);
          setScaled(null);
        }}
      >
        <rect className="plot-bg" x={ML} y={MT} width={W - ML - MR} height={H - MT - MB} />
        {tTicks.map((t) => (
          <g key={`t${t}`}>
            <line className="grid" x1={ML} x2={W - MR} y1={y(t)} y2={y(t)} />
            <text className="tick" x={ML - 4} y={y(t) + 3.5} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {dTicks.map((d) => (
          <text key={`d${d}`} className="tick" x={x(d)} y={H - MB + 13} textAnchor="middle">
            {d}
          </text>
        ))}
        <text className="axis-label" x={(ML + W - MR) / 2} y={H - 3} textAnchor="middle">
          mm from the tip
        </text>
        <text
          className="axis-label"
          x={10}
          y={(MT + H - MB) / 2}
          textAnchor="middle"
          transform={`rotate(-90 10 ${(MT + H - MB) / 2})`}
        >
          gap (thou)
        </text>
        <line className="grid table-line" x1={x(sF)} x2={W - MR} y1={y(0)} y2={y(0)} />
        {compare && (
          <path
            className="curve b"
            d={compare.facing
              .map(([d, h], i) => `${i ? "L" : "M"}${x(d).toFixed(1)},${y(mmToThou(h)).toFixed(1)}`)
              .join("")}
          />
        )}
        <path className="curve" d={path} />
        {stops.map((s) => (
          <circle key={s.gauge} className="stop" cx={x(s.at)} cy={y(s.gauge * 1000)} r={2.5} />
        ))}
        {edit &&
          shown.map(([d, g], i) => (
            <g
              key={i}
              className={`knot${i === 0 || i === shown.length - 1 ? " end" : ""}`}
              onPointerDown={(e) => onDown(i, e)}
              onDoubleClick={() => remove(i)}
            >
              <circle className="hit" cx={x(d)} cy={y(mmToThou(g))} r={12} />
              <circle cx={x(d)} cy={y(mmToThou(g))} r={4.5} />
              <title>
                {i === 0
                  ? "Tip opening: drag up or down"
                  : i === shown.length - 1
                    ? "Facing curve length (the break): drag left or right"
                    : "Drag to shape the facing; double-click to remove"}
              </title>
            </g>
          ))}
        {draft && drag.current && (
          <text className="drag-label" x={W - MR - 4} y={MT + 12} textAnchor="end">
            {drag.current.i === 0
              ? `tip ${mmToThou(sT).toFixed(0)} thou (${sT.toFixed(2)} mm)`
              : drag.current.i === shown.length - 1
                ? `facing curve ${sF.toFixed(1)} mm`
                : `${shown[drag.current.i][0].toFixed(1)} mm: ${mmToThou(shown[drag.current.i][1]).toFixed(1)} thou`}
          </text>
        )}
      </svg>
      {compare && (
        <div className="facing-legend muted">
          <span>
            <span className="swatch a" /> A (this model)
          </span>
          <span>
            <span className="swatch b" /> B {compare.label} (dashed)
          </span>
        </div>
      )}
      {edit && (
        <div className="facing-edit muted">
          <span>
            Drag the points: the tip end sets the tip opening, the flat end (the break) the facing curve length. Tap the
            curve to add a point, double-click one to remove it.
          </span>
          {edit.gauge && (
            <button
              onClick={() => {
                setDraft(null);
                setScaled(null);
                edit.onGauge(null);
              }}
              title="Facing model back to Power (the smooth curve)"
            >
              Smooth curve
            </button>
          )}
        </div>
      )}
      {stops.length > 0 && (
        <table className="gauge-table">
          <thead>
            <tr>
              <th>Feeler</th>
              {stops.map((s) => (
                <th key={s.gauge}>
                  {s.gauge < 0.01 ? s.gauge.toFixed(4).replace(/^0/, "") : s.gauge.toFixed(3).replace(/^0/, "")}"
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>stops at</td>
              {stops.map((s) => (
                <td key={s.gauge}>{s.at.toFixed(1)} mm</td>
              ))}
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
