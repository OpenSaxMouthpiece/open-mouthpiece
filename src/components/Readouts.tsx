// Design-mode readouts: the numbers a player checks (tip in thousandths, facing, length, air
// volume, thinnest wall) and the generator's notes when a guarantee changed a value. While comparing, each
// card also shows B's number.
import { formatThou } from "../design";
import { isAdjustment, type Summary, type Wall } from "../readouts";

interface Props {
  summary: Summary | null;
  wall: Wall | null;
  busy: boolean;
  compact?: boolean; // desktop: one strip of small cards, the fine print in tooltips
  compare?: { summary: Summary | null; air: number | null } | null; // B (A/B compare)
}

// The wall's place in words: "side wall beside the window, 3.4 mm from the tip".
function wallText(w: Wall, length: number | null) {
  const back = length !== null ? length - w.z : null;
  const at = back !== null && back >= 0 && back < length! - 0.5 ? `, ${back.toFixed(1)} mm from the tip` : "";
  const rails = /beside the window/.test(w.where)
    ? ". Beside the window the side rails set the wall; the thinnest wall allowed applies everywhere else."
    : "";
  return `${w.where}${at}${rails}`;
}

export function Readouts({ summary, wall, busy, compact = false, compare }: Props) {
  if (!summary)
    return (
      <div className={`readouts empty muted${compact ? " compact" : ""}`}>
        {busy ? "Rendering…" : "Readouts appear after the first render."}
      </div>
    );
  const b = compare?.summary;
  const atRails = !!wall && /beside the window/.test(wall.where);
  // under 1 mm a printer lays only a line or two there: worth a look before printing
  const thin = !!wall && wall.wall < 1;
  // [label, value, fine print, B's value, a short note shown under the value on desktop too]
  const cards: [string, string, string?, string?, string?][] = [
    [
      compact ? "Tip" : "Tip opening",
      summary.tip !== null ? formatThou(summary.tip) : "–",
      summary.tip !== null ? `${summary.tip.toFixed(2)} mm: the gap between the reed and the tip` : undefined,
      b?.tip != null ? formatThou(b.tip) : undefined,
    ],
    [
      compact ? "Facing" : "Facing length",
      summary.facing !== null ? `${summary.facing} mm` : "–",
      "from the tip to the break, where the rails leave the flat table (the Facing length setting)",
      b?.facing != null ? `${b.facing} mm` : undefined,
      "to the break",
    ],
    [
      "Length",
      summary.length !== null ? `${summary.length} mm` : "–",
      undefined,
      b?.length != null ? `${b.length} mm` : undefined,
    ],
    [
      compact ? "Air" : "Air volume",
      summary.air !== null ? `${summary.air.toFixed(1)} cm³` : "–",
      "sets where it plays in tune on the cork",
      compare?.air != null ? `${compare.air.toFixed(1)} cm³` : undefined,
    ],
    [
      compact ? "Wall" : "Thinnest wall",
      wall ? `${wall.wall.toFixed(2)} mm` : "…",
      wall
        ? wallText(wall, summary.length) + (thin ? " Under 1 mm: it may print weak or with gaps there." : "")
        : "measuring the thinnest wall…",
      undefined,
      thin ? "thin to print" : atRails ? "at the rails" : undefined,
    ],
  ];
  return (
    <div className={`readouts${busy ? " stale" : ""}${compact ? " compact" : ""}`}>
      <div className="readout-cards">
        {cards.map(([k, v, sub, bv, short]) => (
          <div key={k} className="readout-card" title={compact && sub ? `${k}: ${sub}` : undefined}>
            <div className="readout-label">{k}</div>
            <div className={`readout-value${v === "…" ? " pending" : ""}${k.endsWith("all") && thin ? " warn" : ""}`}>
              {v}
            </div>
            {bv && (
              <div className="readout-b" title="B, the model you're comparing with">
                B {bv}
              </div>
            )}
            {sub && !compact && <div className="readout-sub">{sub}</div>}
            {short && compact && <div className="readout-short">{short}</div>}
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
      {act.length > 0 && (
        <ul className="readout-notes">
          {act.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      {auto.length > 0 && (
        <details className="readout-adjusted">
          <summary>Adjusted automatically ({auto.length})</summary>
          <ul>
            {auto.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

// Phone: the readouts in one line over the view; a tap opens the cards (and their fine print).
export function ReadoutLine({
  summary,
  wall,
  busy,
  open,
  onToggle,
}: {
  summary: Summary | null;
  wall: Wall | null;
  busy: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  if (!summary) return null;
  const parts = [
    summary.tip !== null ? `Tip ${formatThou(summary.tip)}` : null,
    summary.facing !== null ? `Facing ${summary.facing} mm` : null,
    summary.air !== null ? `Air ${summary.air.toFixed(1)} cm³` : null,
    wall ? `Wall ${wall.wall.toFixed(2)}` : null,
  ].filter(Boolean);
  return (
    <button
      className={`readout-line${busy ? " stale" : ""}${open ? " open" : ""}`}
      onClick={onToggle}
      aria-expanded={open}
      title="The readouts: tap for details"
    >
      {parts.join(" · ")} {open ? "▴" : "▾"}
    </button>
  );
}
