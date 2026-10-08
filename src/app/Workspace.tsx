// The desktop layout: the icon rail, the code column (when open), the panel with the rail's pick,
// and the view with the shape charts floating over it. Columns are dragged wider or narrower at their edges.
import type { ReactNode } from "react";
import { Rail, type RailItem } from "../components/Rail";
import { startDrag } from "../hooks/useMediaQuery";

export const MIN_EDITOR_W = 260;
export const MIN_PANEL_W = 320;

interface Props {
  rail: RailItem[];
  onPick: (id: string) => void;
  codeOpen: boolean;
  code: ReactNode; // the code column (kept mounted while closed: the editor keeps its state)
  editorW: number; // shown widths (already within limits)
  panelW: number;
  setEditorW: (w: number) => void;
  setPanelW: (w: number) => void;
  panel: ReactNode;
  view: ReactNode; // the viewer and its status bar
  dock: ReactNode;
}

export function Workspace({
  rail,
  onPick,
  codeOpen: open,
  code,
  editorW,
  panelW,
  setEditorW,
  setPanelW,
  panel,
  view,
  dock,
}: Props) {
  return (
    <main
      className="workspace rail-mode"
      style={{ gridTemplateColumns: `64px ${open ? `${editorW}px 6px ` : ""}${panelW}px 5px 1fr` }}
    >
      <Rail items={rail} onPick={onPick} />
      <section className="left" style={open ? undefined : { display: "none" }}>
        {code}
      </section>
      {open && (
        <div
          className="splitter"
          onPointerDown={(e) =>
            startDrag(e, (dx) => setEditorW(Math.max(MIN_EDITOR_W, Math.min(window.innerWidth - 500, editorW + dx))))
          }
        />
      )}
      <aside className="right">{panel}</aside>
      <div
        className="splitter panel-edge"
        title="Drag to resize the panel"
        onPointerDown={(e) =>
          startDrag(e, (dx) =>
            setPanelW(Math.round(Math.max(MIN_PANEL_W, Math.min(window.innerWidth * 0.5, panelW + dx)))),
          )
        }
      />
      <section className="center">
        <div className="view-area">
          {view}
          {dock}
        </div>
      </section>
    </main>
  );
}
