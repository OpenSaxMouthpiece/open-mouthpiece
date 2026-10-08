// The shape charts (desktop): the facing curve, the outside, the inside, one at a time, in a card
// floating over the 3D view's corner, so the model keeps the whole view. Closed it is one small
// button; the tab follows the section open in the panel. Two sizes (Larger / Smaller).
import type { ReactNode } from "react";

export interface DockTab {
  id: string;
  label: string;
  content: ReactNode;
}

export function ShapeDock({
  tabs,
  active,
  open,
  big,
  onActive,
  onOpen,
  onBig,
  actions,
}: {
  tabs: DockTab[];
  active: string;
  open: boolean;
  big: boolean;
  onActive(id: string): void;
  onOpen(open: boolean): void;
  onBig(big: boolean): void;
  actions?: ReactNode; // by the tabs, for the open chart (e.g. cut the view open for the inside)
}) {
  if (!tabs.length) return null;
  const shown = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!open)
    return (
      <button
        className="dock-pill"
        onClick={() => onOpen(true)}
        title="Side and top views of the shape, with Edit shape"
      >
        Shape charts ▴
      </button>
    );
  return (
    <section className={`dock open${big ? " big" : ""}`} aria-label="Shape charts">
      <div className="dock-bar">
        <div className="dock-tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === shown.id}
              className={t.id === shown.id ? "active" : ""}
              onClick={() => onActive(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="dock-hint muted">{actions}</span>
        <button
          className="dock-size"
          onClick={() => onBig(!big)}
          title={big ? "Smaller card (more of the model)" : "Larger card (bigger charts)"}
        >
          {big ? "Smaller" : "Larger"}
        </button>
        <button
          className="dock-close"
          onClick={() => onOpen(false)}
          title="Close the charts"
          aria-label="Close the charts"
        >
          ×
        </button>
      </div>
      <div className="dock-body">{shown.content}</div>
    </section>
  );
}
