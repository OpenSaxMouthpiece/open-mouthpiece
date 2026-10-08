// Curve editor for the rendered file's point lists ([[z, value], ...] assignments such as the
// *_points profile overrides, the shape tables and the facing's gauge points), which the Customizer
// can't edit. Drag a point, click the chart to add one, Delete to remove. Edits are values, like
// the Customizer's (so they work on the read-only presets too, and go into downloads and share
// links); "Reset" goes back to the file's points. The dashed curve is what the model uses now (from
// curve_editor_curves() in the base, via the .echo export): the built-in shape while a list is
// empty, and after the generator's clamps where they apply.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type ParamValue, type RenderTarget } from "../api";
import {
  axisLabel,
  CURVE_GROUPS,
  curveGroup,
  curveLabel,
  CURVES_ECHO,
  findPointLists,
  isFractionList,
  knots,
  parseCurvesEcho,
  pchip,
  valueLabel,
  type ModelCurves,
  type PointList,
  type Pt,
} from "../curves";

interface Props {
  title: string;
  source: string; // the rendered file's text
  target: RenderTarget | null; // for fetching the model's curves
  values: Record<string, ParamValue>;
  visible: boolean;
  compact: boolean;
  onSetList(name: string, pts: Pt[] | undefined): void; // a list's new points (undefined: the file's)
  onFocusList?(name: string): void; // a list was picked (to zoom the view to what it shapes)
}

interface Domain {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}
const M = { l: 46, r: 12, t: 12, b: 34 };

function niceTicks(a: number, b: number, n = 6): number[] {
  const span = b - a;
  if (!(span > 0)) return [a];
  const raw = span / n,
    mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(a / step) * step; v <= b + step * 1e-6 && out.length < 100; v += step)
    out.push(Number(v.toFixed(10)));
  return out;
}

const increasing = (pts: Pt[]) => pts.filter((p, i) => i === 0 || p[0] > pts[i - 1][0]);

export function CurveEditor({ title, source, target, values, visible, compact, onSetList, onFocusList }: Props) {
  // the shape edits' offsets (*_adjust) are dragged on the side and top views, not here
  const fileLists = useMemo(() => findPointLists(source).filter((l) => !l.name.endsWith("_adjust")), [source]);
  // each list as the model gets it: the value set here, else the file's points
  const lists = useMemo<PointList[]>(
    () => fileLists.map((l) => (l.name in values ? { ...l, pts: values[l.name] as Pt[] } : l)),
    [fileLists, values],
  );
  const [selName, setSelName] = useState<string | null>(null);
  const list: PointList | undefined = lists.find((l) => l.name === selName) ?? lists[0];
  const changed = !!list && list.name in values;
  const [sel, setSel] = useState<number | null>(null);
  const [draft, setDraft] = useState<Pt[] | null>(null);
  const [history, setHistory] = useState<{ name: string; pts: Pt[] }[]>([]);
  const [model, setModel] = useState<ModelCurves | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSel(null);
    setDraft(null);
  }, [list?.name]);
  const focusCb = useRef(onFocusList);
  focusCb.current = onFocusList;
  useEffect(() => {
    if (visible && list) focusCb.current?.(list.name);
  }, [visible, list?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- the model's curves (debounced; only while the panel is shown)
  const targetSig = JSON.stringify(target);
  const valuesSig = JSON.stringify(values);
  const hasLists = lists.length > 0;
  useEffect(() => {
    if (!visible || !target || !hasLists) return;
    const ac = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.echo({ ...target, source: target.source + CURVES_ECHO }, values, ac.signal);
        setModel(parseCurvesEcho(r.log) ?? { curves: {} });
      } catch {
        // aborted or failed: keep the last curves
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 500);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, targetSig, valuesSig, hasLists]);

  // ---- chart size
  const [width, setWidth] = useState(300);
  const ro = useRef<ResizeObserver | null>(null);
  const wrapRef = useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    ro.current = null;
    if (!el) return;
    // content-box width, whole pixels, and never 0 while hidden: no feedback with scrollbars
    ro.current = new ResizeObserver(([e]) => {
      const w = Math.floor(e.contentRect.width);
      if (w > 0) setWidth((old) => (Math.abs(old - w) >= 1 ? Math.max(200, w) : old));
    });
    ro.current.observe(el);
  }, []);
  const height = compact ? 230 : 260;

  const pts = draft ?? list?.pts ?? [];
  const ghost = list && model ? increasing(model.curves[list.name] ?? []) : [];
  const fraction = list ? isFractionList(list.name) : false;

  const domain = useMemo<Domain>(() => {
    const all = [...(list?.pts ?? []), ...ghost];
    if (!all.length) return { x0: 0, x1: fraction ? 1 : (model?.L ?? 100), y0: 0, y1: 10 };
    let x0 = Math.min(...all.map((p) => p[0])),
      x1 = Math.max(...all.map((p) => p[0]));
    let y0 = Math.min(...all.map((p) => p[1])),
      y1 = Math.max(...all.map((p) => p[1]));
    const minSpanY = Math.max(0.5, 0.1 * Math.max(Math.abs(y0), Math.abs(y1)));
    if (y1 - y0 < minSpanY) {
      const c = (y0 + y1) / 2;
      y0 = c - minSpanY / 2;
      y1 = c + minSpanY / 2;
    }
    if (x1 - x0 < 1e-6) {
      x0 -= fraction ? 0.05 : 5;
      x1 += fraction ? 0.05 : 5;
    }
    const px = (x1 - x0) * 0.03,
      py = (y1 - y0) * 0.1;
    return { x0: x0 - px, x1: x1 + px, y0: y0 - py, y1: y1 + py };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, model, fraction]);

  // While dragging, the axes stay put.
  const drag = useRef<{ i: number; dom: Domain; moved: boolean; x: number; y: number; pts: Pt[] } | null>(null);
  const tap = useRef<{ x: number; y: number } | null>(null);
  const dom = drag.current?.dom ?? domain;
  const iw = width - M.l - M.r,
    ih = height - M.t - M.b;
  const sx = (z: number) => M.l + ((z - dom.x0) / (dom.x1 - dom.x0)) * iw;
  const sy = (v: number) => M.t + (1 - (v - dom.y0) / (dom.y1 - dom.y0)) * ih;
  const svgRef = useRef<SVGSVGElement>(null);
  const toData = (e: { clientX: number; clientY: number }): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    return [
      dom.x0 + ((e.clientX - r.left - M.l) / iw) * (dom.x1 - dom.x0),
      dom.y0 + (1 - (e.clientY - r.top - M.t) / ih) * (dom.y1 - dom.y0),
    ];
  };
  const snapZ = (z: number) => Number(z.toFixed(fraction ? 3 : 1));
  const snapV = (v: number) => Number(v.toFixed(2));

  if (!lists.length) {
    return (
      <div className="curves empty">
        No point lists in <b>{title}</b>. Single-line assignments like <code>name = [[z, value], ...];</code> show up
        here.
      </div>
    );
  }
  if (!list) return null;

  const commit = (next: Pt[]) => {
    setDraft(null);
    if (JSON.stringify(next) === JSON.stringify(list.pts)) return;
    setHistory((h) => [...h.slice(-49), { name: list.name, pts: list.pts }]);
    onSetList(list.name, next);
  };
  const undo = () => {
    const last = history[history.length - 1];
    const l = last && lists.find((x) => x.name === last.name);
    setHistory((h) => h.slice(0, -1));
    if (!l) return;
    setSelName(l.name);
    setSel(null);
    onSetList(l.name, last.pts);
  };
  const remove = (i: number) => {
    commit(pts.filter((_, j) => j !== i));
    setSel(null);
  };
  const startFromModel = () => {
    const span = Math.max(...ghost.map((p) => p[1])) - Math.min(...ghost.map((p) => p[1]));
    commit(knots(ghost, Math.max(0.03, span * 0.01)).map(([z, v]) => [snapZ(z), snapV(v)]));
  };

  // ---- pointer handling: knots drag; a tap on the background adds a point
  const onKnotDown = (i: number, e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // no capture (e.g. synthetic events): moves still reach the svg while over it
    }
    setSel(i);
    drag.current = {
      i,
      dom: domain,
      moved: false,
      x: e.clientX,
      y: e.clientY,
      pts: pts.map((p) => [p[0], p[1]] as Pt),
    };
    setDraft(drag.current.pts);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 3) return;
    d.moved = true;
    const [z, v] = toData(e);
    const eps = (d.dom.x1 - d.dom.x0) * 0.002;
    const lo = d.i > 0 ? d.pts[d.i - 1][0] + eps : -Infinity,
      hi = d.i < d.pts.length - 1 ? d.pts[d.i + 1][0] - eps : Infinity;
    d.pts = d.pts.slice();
    d.pts[d.i] = [snapZ(Math.min(hi, Math.max(lo, z))), snapV(v)];
    setDraft(d.pts);
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (d) {
      if (d.moved) commit(d.pts);
      else setDraft(null);
      return;
    }
    const t = tap.current;
    tap.current = null;
    if (t && Math.hypot(e.clientX - t.x, e.clientY - t.y) <= 6) addAt(e);
  };
  const onBgDown = (e: React.PointerEvent) => {
    tap.current = { x: e.clientX, y: e.clientY };
  };
  const addAt = (e: React.PointerEvent) => {
    if (!pts.length && ghost.length) return; // empty list: start from the model's curve first
    const [z, clicked] = toData(e);
    // near the curve: add the point on it, so the shape doesn't change until it's dragged
    const v = pts.length && Math.abs(sy(pchip(z, pts)) - sy(clicked)) < 14 ? pchip(z, pts) : clicked;
    if (pts.some((p) => Math.abs(p[0] - z) < (dom.x1 - dom.x0) * 0.004)) return;
    const next = [...pts, [snapZ(z), snapV(v)] as Pt].sort((a, b) => a[0] - b[0]);
    setSel(next.findIndex((p) => p[0] === snapZ(z)));
    commit(next);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.key === "Delete" || e.key === "Backspace") && sel !== null) {
      e.preventDefault();
      remove(sel);
    }
    if (e.key === "Escape") setSel(null);
  };

  // ---- drawing
  const path = (p: Pt[], x0 = p[0]?.[0], x1 = p[p.length - 1]?.[0]) => {
    if (!p.length) return "";
    const n = 160,
      out: string[] = [];
    for (let k = 0; k <= n; k++) {
      const z = x0 + ((x1 - x0) * k) / n;
      out.push(`${k ? "L" : "M"}${sx(z).toFixed(1)},${sy(pchip(z, p)).toFixed(1)}`);
    }
    return out.join("");
  };
  const xt = niceTicks(dom.x0, dom.x1, Math.max(3, Math.round(iw / 60))),
    yt = niceTicks(dom.y0, dom.y1, 5);
  const selPt = sel !== null ? pts[sel] : undefined;
  const r = compact ? 7 : 5;

  return (
    <div className="curves">
      <div className="curves-head">
        <select value={list.name} onChange={(e) => setSelName(e.target.value)} title="Point lists in the rendered file">
          {[...CURVE_GROUPS.map(([g]) => g), "Other"].map((g) => {
            const inGroup = lists.filter((l) => curveGroup(l.name) === g);
            return inGroup.length ? (
              <optgroup key={g} label={g}>
                {inGroup.map((l) => (
                  <option key={l.name} value={l.name}>
                    {curveLabel(l.name)}
                    {isFractionList(l.name) || !l.pts.length ? "" : ` (yours, ${l.pts.length} points)`}
                  </option>
                ))}
              </optgroup>
            ) : null;
          })}
        </select>
        <button onClick={undo} disabled={!history.length} title="Undo the last curve edit">
          Undo
        </button>
      </div>
      {list.caption && <div className="param-caption curves-caption">{list.caption}</div>}
      <div className="curves-chart" ref={wrapRef}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          tabIndex={0}
          onKeyDown={onKey}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => {
            drag.current = null;
            tap.current = null;
            setDraft(null);
          }}
          onPointerDown={onBgDown}
        >
          <rect x={M.l} y={M.t} width={iw} height={ih} className="plot-bg" />
          {xt.map((v) => (
            <g key={`x${v}`}>
              <line x1={sx(v)} x2={sx(v)} y1={M.t} y2={M.t + ih} className="grid" />
              <text x={sx(v)} y={M.t + ih + 14} className="tick" textAnchor="middle">
                {v}
              </text>
            </g>
          ))}
          {yt.map((v) => (
            <g key={`y${v}`}>
              <line x1={M.l} x2={M.l + iw} y1={sy(v)} y2={sy(v)} className="grid" />
              <text x={M.l - 5} y={sy(v) + 4} className="tick" textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          <text x={M.l + iw / 2} y={height - 4} className="axis-label" textAnchor="middle">
            {axisLabel(list.name)}
          </text>
          <clipPath id="curves-clip">
            <rect x={M.l} y={M.t} width={iw} height={ih} />
          </clipPath>
          <g clipPath="url(#curves-clip)">
            {ghost.length > 1 && <path d={path(ghost)} className="ghost" />}
            {pts.length > 0 && (
              <>
                <path d={path(pts, dom.x0, pts[0][0])} className="curve hold" />
                <path d={path(pts, pts[pts.length - 1][0], dom.x1)} className="curve hold" />
                <path d={path(pts)} className="curve" />
              </>
            )}
          </g>
          {pts.map((p, i) => (
            <g key={i} className={`knot${i === sel ? " selected" : ""}`} onPointerDown={(e) => onKnotDown(i, e)}>
              <circle cx={sx(p[0])} cy={sy(p[1])} r={compact ? 16 : 10} className="hit" />
              <circle cx={sx(p[0])} cy={sy(p[1])} r={r} />
            </g>
          ))}
        </svg>
      </div>
      <div className="curves-legend muted">
        <span>
          <i className="line solid" />{" "}
          {list.pts.length
            ? changed
              ? "your points"
              : "the file's points"
            : "empty: the model uses its built-in curve"}
        </span>
        <span>
          <i className="line dashed" /> in the model now{loading ? " …" : ""}
        </span>
        <span className="y-label">↕ {valueLabel(list.name)}</span>
      </div>
      {selPt ? (
        <div className="curves-point">
          <button onClick={() => setSel(Math.max(0, sel! - 1))} disabled={sel === 0} aria-label="Previous point">
            ◀
          </button>
          <label>
            {axisLabel(list.name)}{" "}
            <NumberBox
              value={selPt[0]}
              onCommit={(z) => {
                const eps = fraction ? 0.001 : 0.1,
                  lo = sel! > 0 ? pts[sel! - 1][0] + eps : -Infinity,
                  hi = sel! < pts.length - 1 ? pts[sel! + 1][0] - eps : Infinity;
                commit(pts.map((p, j) => (j === sel ? [Math.min(hi, Math.max(lo, z)), p[1]] : p)));
              }}
            />
          </label>
          <label>
            {valueLabel(list.name)}{" "}
            <NumberBox value={selPt[1]} onCommit={(v) => commit(pts.map((p, j) => (j === sel ? [p[0], v] : p)))} />
          </label>
          <button
            onClick={() => setSel(Math.min(pts.length - 1, sel! + 1))}
            disabled={sel === pts.length - 1}
            aria-label="Next point"
          >
            ▶
          </button>
          <button onClick={() => remove(sel!)} title="Remove this point (Delete)">
            Delete
          </button>
        </div>
      ) : (
        <div className="curves-hint muted">
          {list.pts.length
            ? "Drag a point to move it; click the chart to add one (on the curve it keeps the shape); select a point to type values or delete it."
            : ghost.length
              ? "Start from the model's current curve, then drag its points."
              : "Click the chart to add points."}
        </div>
      )}
      <div className="curves-actions">
        {!list.pts.length && ghost.length > 1 && (
          <button className="primary" onClick={startFromModel}>
            Start from current curve
          </button>
        )}
        {list.pts.length > 0 && ghost.length > 1 && (
          <button
            onClick={startFromModel}
            title="Replace these points with the curve the model has now (after its clamps)"
          >
            Copy model's curve
          </button>
        )}
        {/* shape_* tables ARE the built-in shape: emptying one leaves the model without an outline */}
        {list.pts.length > 0 && !fraction && (
          <button
            onClick={() => {
              commit([]);
              setSel(null);
            }}
            title={`${list.name} = [] — back to the built-in shape`}
          >
            Clear (use built-in)
          </button>
        )}
        {changed && (
          <button
            onClick={() => {
              setHistory((h) => [...h.slice(-49), { name: list.name, pts: list.pts }]);
              onSetList(list.name, undefined);
              setSel(null);
            }}
            title={`Back to the points in ${title}`}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

// Number box that commits on Enter or blur (so typing doesn't re-render on every keystroke).
function NumberBox({ value, onCommit }: { value: number; onCommit(v: number): void }) {
  const [text, setText] = useState<string | null>(null);
  const done = () => {
    if (text !== null && text.trim() !== "" && Number.isFinite(Number(text)) && Number(text) !== value)
      onCommit(Number(text));
    setText(null);
  };
  return (
    <input
      type="number"
      step="any"
      value={text ?? String(value)}
      onChange={(e) => setText(e.target.value)}
      onBlur={done}
      onKeyDown={(e) => {
        if (e.key === "Enter") done();
        if (e.key === "Escape") setText(null);
      }}
    />
  );
}
