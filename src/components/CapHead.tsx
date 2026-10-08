// The top of the Cap section: make one, or (once made) show / hide / download / remove it.
import { capText, type CapInfo } from "../readouts";
import type { CapView } from "../app/session";
import { Notes } from "./Readouts";
import type { ReactNode } from "react";

interface Props {
  made: boolean; // the design has a cap (cap_made)
  view: CapView;
  info: CapInfo | null;
  numbers?: boolean; // its sizes in the text (off where the readouts above show them)
  alone?: boolean; // the mouthpiece is hidden
  onAlone?: (on: boolean) => void;
  downloadLabel: ReactNode; // the download button's text, or its progress
  downloading: boolean;
  onMake: () => void;
  onView: (change: Partial<CapView>) => void;
  onDownload: () => void;
  onRemove: () => void;
}

export function CapHead({
  made,
  view,
  info,
  numbers = true,
  alone = false,
  onAlone = () => {},
  downloadLabel,
  downloading,
  onMake,
  onView,
  onDownload,
  onRemove,
}: Props) {
  if (!made)
    return (
      <div className="lig-head">
        <p className="muted">
          A cap made from this mouthpiece's own shape: it slides on over the tip, the reed and the ligature, and a
          collar at its rim holds it on, so it fits whatever you change.
        </p>
        <button onClick={onMake}>Make a cap for this mouthpiece</button>
      </div>
    );
  const download = (
    <button onClick={onDownload} disabled={downloading} aria-live="polite">
      {downloadLabel}
    </button>
  );
  const remove = (
    <button onClick={onRemove} title="This design no longer has a cap">
      Remove
    </button>
  );
  return (
    <div className="lig-head">
      <p className="muted">
        {view.on
          ? alone || view.beside
            ? "Prints standing on its rim, no supports."
            : "Shown see-through on the mouthpiece (teal). Prints standing on its rim, no supports."
          : "Made for this design, hidden from the view."}
        {numbers && capText(info)}
      </p>
      {info && info.notes.length > 0 && <Notes notes={info.notes} />}
      <div className="lig-actions">
        {!view.on && <button onClick={() => onView({ on: true })}>Show it</button>}
        {view.on && (
          <select
            value={alone ? "alone" : view.beside ? "beside" : "on"}
            onChange={(e) => {
              onView({ beside: e.target.value === "beside" });
              onAlone(e.target.value === "alone");
            }}
            aria-label="Where the cap is shown"
          >
            <option value="on">On the mouthpiece</option>
            <option value="beside">Beside it</option>
            <option value="alone">Alone (no mouthpiece)</option>
          </select>
        )}
        {download}
        {view.on && <button onClick={() => onView({ on: false })}>Hide</button>}
        {remove}
      </div>
    </div>
  );
}
