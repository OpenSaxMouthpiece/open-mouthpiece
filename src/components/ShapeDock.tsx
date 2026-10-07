// The dock under the 3D view (desktop): the charts that show and edit the shape (the facing curve,
// the outside, the inside), one at a time, so the panel keeps only the sliders. It folds down to its
// tab strip; the tab follows the section open in the panel.
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
  onActive,
  onOpen,
}: {
  tabs: DockTab[];
  active: string;
  open: boolean;
  onActive(id: string): void;
  onOpen(open: boolean): void;
}) {
  if (!tabs.length) return null;
  const shown = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <section className={`dock${open ? " open" : ""}`} aria-label="Shape charts">
      <div className="dock-bar">
        <div className="dock-tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={open && t.id === shown.id}
              className={open && t.id === shown.id ? "active" : ""}
              onClick={() => {
                onActive(t.id);
                if (!open || t.id === shown.id) onOpen(!open || t.id !== shown.id);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="dock-hint muted">{open ? "" : "side and top views, with Edit shape"}</span>
        <button
          className="dock-toggle"
          onClick={() => onOpen(!open)}
          aria-expanded={open}
          title={open ? "Fold the charts away (more room for the model)" : "Show the charts"}
        >
          {open ? "Hide ▾" : "Show ▴"}
        </button>
      </div>
      {open && <div className="dock-body">{shown.content}</div>}
    </section>
  );
}
