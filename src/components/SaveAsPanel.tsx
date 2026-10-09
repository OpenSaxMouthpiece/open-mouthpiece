// Save as, for a design: keep a copy in this browser and/or download files (the design file =
// the full .scad; a settings-only .scad under "More formats"; STLs), zipped or not. The choices are remembered.
import { useState } from "react";
import { scadFileName } from "../app/files";

export type SaveOpts = {
  browser: boolean;
  full: boolean;
  settings: boolean;
  stl: boolean;
  ligature: boolean;
  cap: boolean;
  zip: boolean;
};
export const SAVE_DEFAULTS: SaveOpts = {
  browser: true,
  full: false, // a first save stays in the browser; the warning below suggests a .scad
  settings: false,
  stl: false,
  ligature: false,
  cap: false,
  zip: false,
};

// Whether the choices download anything (the ligature and the cap only count when the design has one).
export const wantsFiles = (o: SaveOpts, ligature: boolean, cap = false) =>
  o.full || o.settings || o.stl || (o.ligature && ligature) || (o.cap && cap);

interface Props {
  name: string;
  onName: (name: string) => void;
  opts: SaveOpts;
  onOpt: (k: keyof SaveOpts, v: boolean) => void;
  partLabel: string; // "Mouthpiece", "Shank test ring", …
  ligature: boolean; // offer the ligature's STL
  cap?: boolean; // offer the cap's STL
  onSubmit: () => void;
  onCancel: () => void;
}

export function SaveAsPanel({
  name,
  onName,
  opts,
  onOpt,
  partLabel,
  ligature,
  cap = false,
  onSubmit,
  onCancel,
}: Props) {
  const files = wantsFiles(opts, ligature, cap);
  const [moreOpen, setMoreOpen] = useState(opts.settings); // open while it is ticked
  const box = (k: keyof SaveOpts, disabled = false) => (
    <input type="checkbox" checked={opts[k]} disabled={disabled} onChange={(e) => onOpt(k, e.target.checked)} />
  );
  return (
    <form
      className="save-as-panel"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <label className="save-name">
        Name <input autoFocus value={name} placeholder="Name" onChange={(e) => onName(e.target.value)} />
      </label>
      <label title="It then shows under Your designs. Only in this browser on this device: clearing the site's data or switching browsers loses it">
        {box("browser")} Keep a copy in this browser <span className="muted">quick, not a backup</span>
      </label>
      <div className="save-group">Download</div>
      <label title="Your settings + the generator in one plain OpenSCAD file: opens in any OpenSCAD, and here with Open…. Its part setting (Output tab) also makes the ligature and cap; a picture comes beside it in an art/ folder (zipped)">
        {box("full")} Design file (.scad){" "}
        <span className="muted">opens anywhere{ligature || cap ? ", ligature and cap included" : ""}</span>
      </label>
      <details className="save-more" open={moreOpen} onToggle={(e) => setMoreOpen(e.currentTarget.open)}>
        <summary>More formats</summary>
        <label title="Just your settings (a few KB); the geometry comes from this site when you open it here">
          {box("settings")} Settings-only .scad <span className="muted">opens only on this site</span>
        </label>
      </details>
      <label title="The model to print, at full quality">
        {box("stl")} {partLabel} STL
      </label>
      {ligature && (
        <label title="The ligature on its own, standing on its front edge, ready to print">
          {box("ligature")} Ligature STL
        </label>
      )}
      {cap && <label title="The cap on its own, standing on its rim, ready to print">{box("cap")} Cap STL</label>}
      <label title="One .zip with every file above, instead of separate downloads">
        {box("zip", !files)} Zip the files into one download
      </label>
      {opts.browser && !files && (
        <p className="save-warn">Only this browser has it. Download a .scad to really keep it.</p>
      )}
      <div className="save-buttons">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={!scadFileName(name) || (!opts.browser && !files)}>
          {!files ? "Keep in browser" : opts.browser ? "Save" : "Download"}
        </button>
      </div>
    </form>
  );
}
