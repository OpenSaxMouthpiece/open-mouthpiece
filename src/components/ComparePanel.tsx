// Side panel for A/B comparison: the numbers a player compares (tip, facing, length, air), the
// Customizer parameter diff (Design labels and units), other assignments (generator internals of a
// self-contained download folded away), and mesh stats. B an uploaded STL: length and mesh only.
import { useMemo, useState } from "react";
import type { ParamValue } from "../api";
import { diffAssignments, diffParams, formatValue, sameValue, stlStats, type Snapshot } from "../compare";
import { formatThou, paramLabel, paramUnit } from "../design";

interface Props {
  a: Snapshot;
  b: Snapshot;
  labelA: string; // display names ("Alto", "my_alto.scad", "Alto_64_0.076.stl")
  labelB: string;
  onUseB(name: string, value: ParamValue): void;
  onSwap(): void;
  onClear(): void;
}

function fmt(n: number, digits = 2) {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function delta(a: number, b: number, digits = 2, unit = "") {
  const d = a - b;
  if (Math.abs(d) < 10 ** -digits / 2) return <span className="same">=</span>;
  const pct = b !== 0 && !unit ? ` (${d > 0 ? "+" : ""}${fmt((d / Math.abs(b)) * 100, 1)}%)` : "";
  return (
    <span className={d > 0 ? "up" : "down"}>
      {d > 0 ? "+" : ""}
      {fmt(d, digits)}
      {unit}
      {pct}
    </span>
  );
}

// A parameter value the way the Design panel shows it: tip openings in thousandths.
function showValue(name: string, v: ParamValue | undefined) {
  if (typeof v === "number" && paramUnit(name) === "thou") return `${formatThou(v)} (${fmt(v)} mm)`;
  return formatValue(v);
}

export function ComparePanel({ a, b, labelA, labelB, onUseB, onSwap, onClear }: Props) {
  const [diffOnly, setDiffOnly] = useState(true);
  const sa = useMemo(() => (a.stl ? stlStats(a.stl) : null), [a.stl]);
  const sb = useMemo(() => (b.stl ? stlStats(b.stl) : null), [b.stl]);
  const params = useMemo(() => diffParams(a, b), [a, b]);
  const assigns = useMemo(() => diffAssignments(a, b), [a, b]);
  const shown = diffOnly ? params.filter((r) => !sameValue(r.a, r.b)) : params;
  const nDiff = params.filter((r) => !sameValue(r.a, r.b)).length;
  const size = (s: NonNullable<typeof sa>, i: number) => s.max[i] - s.min[i];

  // The player's numbers: from each model's summary echo (an STL has its length only).
  const A = a.summary,
    B = b.summary;
  const rows: {
    label: string;
    a: number | null | undefined;
    b: number | null | undefined;
    show(v: number): string;
    digits: number;
    unit: string;
    title?: string;
  }[] = [
    {
      label: "Tip opening",
      a: A?.tip,
      b: B?.tip,
      show: (v) => `${formatThou(v)} · ${v.toFixed(2)} mm`,
      digits: 2,
      unit: " mm",
    },
    { label: "Facing length", a: A?.facing, b: B?.facing, show: (v) => `${fmt(v, 1)} mm`, digits: 1, unit: " mm" },
    { label: "Length", a: A?.length, b: B?.length, show: (v) => `${fmt(v, 1)} mm`, digits: 1, unit: " mm" },
    {
      label: "Air volume",
      a: a.air,
      b: b.air,
      show: (v) => `${fmt(v, 1)} cm³`,
      digits: 1,
      unit: " cm³",
      title:
        "Inside air volume from where the neck ends to the tip (reed closing the window): sets where it plays in tune on the cork",
    },
  ];
  const player = rows.filter((r) => r.a != null || r.b != null);

  return (
    <div className="compare">
      <div className="compare-head">
        <div>
          <span className="swatch a" /> <b>A</b> {labelA} <span className="muted">(the model you're editing)</span>
        </div>
        <div>
          <span className="swatch b" /> <b>B</b> {labelB}{" "}
          <span className="muted">
            ({!b.mesh ? "pinned" : b.mesh.aligned ? "STL, lined up with A" : "STL, as uploaded"})
          </span>
        </div>
        {b.mesh && (
          <p className="muted compare-note">
            {b.mesh.aligned
              ? "Lined up like the model: reed table on the table plane, shank end on the plate, centered across. "
              : "No reed table was found to line it up, so it is shown where the file puts it. "}
            An uploaded STL isn't kept after a reload.
          </p>
        )}
        <div className="compare-actions">
          {!b.mesh && (
            <button onClick={onSwap} title="Put B in the editor and pin the current model as B">
              Swap A ↔ B
            </button>
          )}
          <button onClick={onClear}>Clear B</button>
        </div>
      </div>

      {player.length > 0 && (
        <>
          <h4>Mouthpiece</h4>
          <table className="stats">
            <thead>
              <tr>
                <th />
                <th>A</th>
                <th>B</th>
                <th>A − B</th>
              </tr>
            </thead>
            <tbody>
              {player.map((r) => (
                <tr key={r.label} title={r.title}>
                  <td>{r.label}</td>
                  <td>{r.a != null ? r.show(r.a) : "–"}</td>
                  <td>{r.b != null ? r.show(r.b) : "–"}</td>
                  <td>{r.a != null && r.b != null ? delta(r.a, r.b, r.digits, r.unit) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {a.facing && b.facing && (
            <p className="muted pad compare-hint">B's facing curve is drawn on the facing chart (Tip &amp; facing).</p>
          )}
        </>
      )}

      {!b.mesh && (
        <>
          <h4>
            Parameters <span className="muted">({nDiff} differ)</span>
            <label className="diff-only">
              <input type="checkbox" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} /> differences
              only
            </label>
          </h4>
          {shown.length === 0 ? (
            <p className="muted pad">{params.length ? "All parameters are the same." : "No Customizer parameters."}</p>
          ) : (
            <table className="pdiff">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>A</th>
                  <th>B</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const differs = !sameValue(r.a, r.b);
                  return (
                    <tr key={r.name} className={differs ? "differs" : ""}>
                      <td title={`${r.name} (${r.group})`}>{paramLabel(r.name)}</td>
                      <td title={formatValue(r.a)}>{showValue(r.name, r.a)}</td>
                      <td title={formatValue(r.b)}>{showValue(r.name, r.b)}</td>
                      <td>
                        {differs && r.inA && r.b !== undefined && (
                          <button className="use" title="Set A's value to B's" onClick={() => onUseB(r.name, r.b!)}>
                            ← B
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {assigns.main.length > 0 && (
            <>
              <h4>
                Outline and other settings <span className="muted">({assigns.main.length} differ)</span>
              </h4>
              <AssignTable rows={assigns.main} />
            </>
          )}
          {assigns.internal.length > 0 && (
            <details className="compare-more">
              <summary className="muted">
                {assigns.internal.length} generator internals differ (one side is a self-contained download)
              </summary>
              <AssignTable rows={assigns.internal} />
            </details>
          )}
        </>
      )}

      <details className="compare-more">
        <summary className="muted">Mesh (solid volume, size, triangles)</summary>
        {sa && sb ? (
          <table className="stats">
            <thead>
              <tr>
                <th />
                <th>A</th>
                <th>B</th>
                <th>A − B</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Solid mm³</td>
                <td>{fmt(sa.volume, 1)}</td>
                <td>{fmt(sb.volume, 1)}</td>
                <td>{delta(sa.volume, sb.volume, 1)}</td>
              </tr>
              {["X", "Y", "Z"].map((ax, i) => (
                <tr key={ax}>
                  <td>Size {ax} mm</td>
                  <td>{fmt(size(sa, i))}</td>
                  <td>{fmt(size(sb, i))}</td>
                  <td>{delta(size(sa, i), size(sb, i))}</td>
                </tr>
              ))}
              <tr>
                <td>Triangles</td>
                <td>{fmt(sa.triangles, 0)}</td>
                <td>{fmt(sb.triangles, 0)}</td>
                <td>{delta(sa.triangles, sb.triangles, 0)}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="muted pad">Mesh stats need a 3D render of both models.</p>
        )}
      </details>
    </div>
  );
}

function AssignTable({ rows }: { rows: { name: string; a?: string; b?: string }[] }) {
  return (
    <table className="pdiff code">
      <thead>
        <tr>
          <th>Name</th>
          <th>A</th>
          <th>B</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className="differs">
            <td>{r.name}</td>
            <td title={r.a}>{r.a ?? "—"}</td>
            <td title={r.b}>{r.b ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
