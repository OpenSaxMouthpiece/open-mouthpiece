// The top of the Ligature section: make one, or (once made) show / hide / download / remove it.
import { ligatureText, type LigatureInfo } from "../readouts";
import type { LigatureView } from "../app/session";
import { Notes } from "./Readouts";
import type { ReactNode } from "react";

interface Props {
  made: boolean; // the design has a ligature (ligature_made)
  view: LigatureView;
  info: LigatureInfo | null;
  downloadLabel: ReactNode; // the download button's text, or its progress
  downloading: boolean;
  onMake: () => void;
  onView: (change: Partial<LigatureView>) => void;
  onDownload: () => void;
  onRemove: () => void;
}

export function LigatureHead({
  made,
  view,
  info,
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
          A ring ligature made from this mouthpiece's own shape: it slides on over the tip with the reed and wedges in
          place, so it fits whatever you change.
        </p>
        <button onClick={onMake}>Make a ligature for this mouthpiece</button>
      </div>
    );
  const download = (
    <button onClick={onDownload} disabled={downloading} aria-live="polite">
      {downloadLabel}
    </button>
  );
  const remove = (
    <button onClick={onRemove} title="This design no longer has a ligature">
      Remove
    </button>
  );
  if (!view.on)
    return (
      <div className="lig-head">
        <p className="muted">Made for this design, hidden from the view.{ligatureText(info)}</p>
        <div className="lig-actions">
          <button onClick={() => onView({ on: true })}>Show it</button>
          {download}
          {remove}
        </div>
      </div>
    );
  return (
    <div className="lig-head">
      <p className="muted">Shown in red on the mouthpiece.{ligatureText(info)}</p>
      {info?.notes.length ? <Notes notes={info.notes} /> : null}
      <div className="lig-actions">
        <select
          value={view.beside ? "beside" : "on"}
          onChange={(e) => onView({ beside: e.target.value === "beside" })}
          aria-label="Where the ligature is shown"
        >
          <option value="on">On the mouthpiece</option>
          <option value="beside">Beside it</option>
        </select>
        <label className="lig-reed">
          <input type="checkbox" checked={view.reed} onChange={(e) => onView({ reed: e.target.checked })} /> Show a reed
        </label>
        {download}
        <button onClick={() => onView({ on: false })}>Hide</button>
        {remove}
      </div>
    </div>
  );
}
