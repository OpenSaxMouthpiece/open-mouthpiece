// Baffle shape as pictures: a small side view of each choice (the reed along the bottom, the tip to
// the right, the roof over the reed above it), as on the Inside chart. A click picks it, like the
// dropdown above.
const ROOFS: [value: string, label: string, d: string][] = [
  ["measured", "Original", "M4,7 C22,8 40,15 56,19"],
  ["flat", "Flat", "M4,7 L56,19"],
  ["rollover", "Rollover", "M4,6 C14,6 16,16 26,17 L56,19"],
  ["step", "Step", "M4,7 L28,9 L30,16 L56,19"],
  ["concave", "Concave", "M4,7 C34,7 50,10 56,19"],
];

export function BaffleSketches({ value, onPick }: { value: string; onPick: (v: string) => void }) {
  return (
    <div className="baffle-sketches" role="group" aria-label="Baffle shape, from the side">
      {ROOFS.map(([v, label, d]) => (
        <button
          key={v}
          className={v === value ? "on" : undefined}
          aria-pressed={v === value}
          title={`${label}: the roof over the reed from the side, tip to the right`}
          onClick={() => onPick(v)}
        >
          <svg viewBox="0 0 60 28" width="54" height="25" aria-hidden="true">
            <path className="reed" d="M2,24 L58,24" />
            <path className="rail" d="M56,19 L56,24" />
            <path className="roof" d={d} />
          </svg>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
