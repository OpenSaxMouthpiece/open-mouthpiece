// Design-mode readouts: the numbers a player checks (tip in thousandths, facing, length, air
// volume, thinnest wall) and the generator's notes when a guarantee changed a value. While comparing, each
// card also shows B's number.
import { formatThou } from "../design";
import { isAdjustment, type Summary } from "../readouts";

interface Props {
  summary: Summary | null;
  wall: { wall: number; where: string } | null;
  busy: boolean;
  compact?: boolean;                              // desktop: one strip of small cards, the fine print in tooltips
  compare?: { summary: Summary | null; air: number | null } | null; // B (A/B compare)
}

export function Readouts({ summary, wall, busy, compact = false, compare }: Props) {
  if (!summary) return <div className={`readouts empty muted${compact ? " compact" : ""}`}>{busy ? "Rendering…" : "Readouts appear after the first render."}</div>;
  const b = compare?.summary;
  const cards: [string, string, string?, string?][] = [
    [compact ? "Tip" : "Tip opening", summary.tip !== null ? formatThou(summary.tip) : "–", summary.tip !== null ? `${summary.tip.toFixed(2)} mm` : undefined,
      b?.tip != null ? formatThou(b.tip) : undefined],
    [compact ? "Facing" : "Facing length", summary.facing !== null ? `${summary.facing} mm` : "–", undefined, b?.facing != null ? `${b.facing} mm` : undefined],
    ["Length", summary.length !== null ? `${summary.length} mm` : "–", undefined, b?.length != null ? `${b.length} mm` : undefined],
    [compact ? "Air" : "Air volume", summary.air !== null ? `${summary.air.toFixed(1)} cm³` : "–", "sets where it plays in tune on the cork",
      compare?.air != null ? `${compare.air.toFixed(1)} cm³` : undefined],
    [compact ? "Wall" : "Thinnest wall", wall ? `${wall.wall.toFixed(2)} mm` : "…", wall ? `thinnest wall: ${wall.where}` : "measuring the thinnest wall…"],
  ];
  return (
    <div className={`readouts${busy ? " stale" : ""}${compact ? " compact" : ""}`}>
      <div className="readout-cards">
        {cards.map(([k, v, sub, bv]) => (
          <div key={k} className="readout-card" title={compact && sub ? `${k}: ${sub}` : undefined}>
            <div className="readout-label">{k}</div>
            <div className={`readout-value${v === "…" ? " pending" : ""}`}>{v}</div>
            {bv && <div className="readout-b" title="B, the model you're comparing with">B {bv}</div>}
            {sub && !compact && <div className="readout-sub">{sub}</div>}
          </div>
        ))}
      </div>
      <Notes notes={summary.notes} />
    </div>
  );
}

// The generator's notes: the ones that ask you to do something in yellow; the values it adjusted by
// itself to keep the model sound (nothing to do) folded away in one quiet line.
export function Notes({ notes }: { notes: string[] }) {
  const act = notes.filter((n) => !isAdjustment(n));
  const auto = notes.filter(isAdjustment);
  if (!notes.length) return null;
  return (
    <>
      {act.length > 0 && <ul className="readout-notes">{act.map((n) => <li key={n}>{n}</li>)}</ul>}
      {auto.length > 0 && (
        <details className="readout-adjusted">
          <summary>Adjusted automatically ({auto.length}): nothing to do</summary>
          <ul>{auto.map((n) => <li key={n}>{n}</li>)}</ul>
        </details>
      )}
    </>
  );
}
