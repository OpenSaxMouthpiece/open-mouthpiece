// The icon rail down the left of the desktop layout: the mouthpiece's sections, the parts made from
// it (ligature, cap), printing, then the tools (compare, exact points, code, about). One place at a
// time opens in the panel beside it; Code is a toggle (its column opens next to the panel).
import type { ReactNode } from "react";

export interface RailItem {
  id: string;
  label: string; // under the icon: one short word
  title: string; // the full name, as the tooltip
  icon: keyof typeof ICONS;
  active?: boolean;
  dot?: boolean; // made / something to see (the ligature made, a B pinned)
  changed?: number; // settings changed in this section
  group?: "tools"; // the tools sit at the bottom, apart
  sep?: boolean; // a line before it (the parts after the mouthpiece's sections)
}

const svg = (d: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);
// Line icons, each a picture of the part it opens (the mouthpiece seen from the side, tip right).
export const ICONS = {
  tip: svg(
    <>
      <path d="M2 8.5 L13 7 Q19 7 22 10.5 L22 11.5 L2 15.5" />
      <path d="M14 13.4 Q19 12.6 22 11.5" strokeDasharray="1.6 1.8" />
    </>,
  ),
  fit: svg(
    <>
      <path d="M2 9 h9 v6 h-9" />
      <path d="M9 6.5 h12 v11 h-12 Z" />
    </>,
  ),
  chamber: svg(
    <>
      <path d="M2 9 L7 9 Q9 6 13 6 L21 9 L21 13 L19 17 L2 17 Z" />
      <path d="M7 13 Q12 9.5 17 12.5" />
    </>,
  ),
  body: svg(<path d="M2 9 L7 9 Q9 5 13 5 L21 8.5 L21 13 L19 17 L2 17 Z" />),
  text: svg(
    <>
      <path d="M6 18 L11 5 L16 18" />
      <path d="M8 13.5 h6" />
      <path d="M18 18 h3" />
    </>,
  ),
  ligature: svg(
    <>
      <path d="M3 8 h15 v8 h-15 Z" />
      <path d="M7 8 v8 M14 8 v8" />
      <path d="M18 10 h3 M18 14 h3" />
    </>,
  ),
  cap: svg(
    <>
      <path d="M5 19 V10 Q5 4 12 4 Q19 4 19 10 V19 Z" />
      <path d="M5 14.5 h14" />
    </>,
  ),
  print: svg(
    <>
      <path d="M3 20 h18" />
      <path d="M9 3 h6 l-1 5 h-4 Z" />
      <path d="M12 8 v2" />
      <path d="M7 17 h10 v3 h-10 Z" />
      <path d="M8 14 h8 v3" />
    </>,
  ),
  compare: svg(
    <>
      <circle cx="9" cy="12" r="6" />
      <circle cx="15" cy="12" r="6" />
    </>,
  ),
  points: svg(
    <>
      <path d="M3 18 C9 18 11 6 21 6" />
      <circle cx="5.5" cy="17.6" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18.5" cy="6.4" r="1.6" />
    </>,
  ),
  code: svg(<path d="M8 7 L3 12 L8 17 M16 7 L21 12 L16 17" />),
  about: svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11 v6 M12 7.5 v0.5" />
    </>,
  ),
  settings: svg(
    <>
      <path d="M4 7 h16 M4 12 h16 M4 17 h16" />
      <circle cx="9" cy="7" r="1.8" />
      <circle cx="15" cy="12" r="1.8" />
      <circle cx="8" cy="17" r="1.8" />
    </>,
  ),
};

// `horizontal`: the phone's bar along the bottom (the sections only).
export function Rail({
  items,
  onPick,
  horizontal = false,
}: {
  items: RailItem[];
  onPick(id: string): void;
  horizontal?: boolean;
}) {
  const button = (i: RailItem) => [
    i.sep && <hr key={`${i.id}-sep`} className="rail-sep" />,
    <button
      key={i.id}
      className={`rail-item${i.active ? " active" : ""}`}
      onClick={() => onPick(i.id)}
      title={i.title}
      aria-pressed={i.active}
    >
      {ICONS[i.icon]}
      <span className="rail-label">{i.label}</span>
      {i.dot && <span className="rail-dot" aria-label="made" />}
      {!!i.changed && (
        <span className="rail-changed" title={`${i.changed} changed`}>
          {i.changed}
        </span>
      )}
    </button>,
  ];
  const main = items.filter((i) => !i.group),
    tools = items.filter((i) => i.group === "tools");
  return (
    <nav className={`rail${horizontal ? " horizontal" : ""}`} aria-label="Sections">
      {main.map(button)}
      <span className="rail-spacer" />
      {tools.map(button)}
    </nav>
  );
}
