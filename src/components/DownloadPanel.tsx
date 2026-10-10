// Download ▾ for a design: tick the files (STLs, test rings, the design file, a check card), then
// one Download, zipped or not. The ticks are remembered; "All" ticks everything (the print kit).
import { useState } from "react";

export type DownloadOpts = {
  stl: boolean;
  rings: boolean;
  ligature: boolean;
  cap: boolean;
  full: boolean;
  settings: boolean;
  card: boolean;
  zip: boolean;
};
export const DOWNLOAD_DEFAULTS: DownloadOpts = {
  stl: true,
  rings: false,
  ligature: false,
  cap: false,
  full: true,
  settings: false,
  card: false,
  zip: true,
};
// Everything there is (the print kit).
export const DOWNLOAD_ALL: DownloadOpts = {
  stl: true,
  rings: true,
  ligature: true,
  cap: true,
  full: true,
  settings: false,
  card: true,
  zip: true,
};

// Whether the ticks download anything (the ligature and the cap only count when the design has one).
export const wantsFiles = (o: DownloadOpts, ligature: boolean, cap: boolean) =>
  o.stl || o.rings || (o.ligature && ligature) || (o.cap && cap) || o.full || o.settings || o.card;

interface Props {
  opts: DownloadOpts;
  onOpt: (k: keyof DownloadOpts, v: boolean) => void;
  ligature: boolean; // offer the ligature's STL
  cap: boolean; // offer the cap's STL
  squeezes: string; // the test rings' cork squeezes, "0.10 / 0.20 / 0.30"
  picture: boolean; // the design file has a picture beside it (always zipped then)
  busy: boolean;
  onDownload: () => void;
}

export function DownloadPanel({ opts, onOpt, ligature, cap, squeezes, picture, busy, onDownload }: Props) {
  const files = wantsFiles(opts, ligature, cap);
  const [moreOpen, setMoreOpen] = useState(opts.settings); // open while it is ticked
  const box = (k: keyof DownloadOpts, disabled = false) => (
    <input type="checkbox" checked={opts[k]} disabled={disabled} onChange={(e) => onOpt(k, e.target.checked)} />
  );
  const all = (Object.keys(DOWNLOAD_ALL) as (keyof DownloadOpts)[]).every(
    (k) => opts[k] === DOWNLOAD_ALL[k] || (k === "ligature" && !ligature) || (k === "cap" && !cap),
  );
  return (
    <form
      className="dl-panel"
      onSubmit={(e) => {
        e.preventDefault();
        onDownload();
      }}
    >
      <label title="The mouthpiece standing on its shank end, as printed, at full quality">
        {box("stl")} Mouthpiece STL
      </label>
      <label title="Short rings of the shank to print first and try on your neck cork">
        {box("rings")} Shank test rings <span className="muted">squeeze {squeezes} mm</span>
      </label>
      {ligature && (
        <label title="The ligature on its own, standing on its front edge, ready to print">
          {box("ligature")} Ligature STL
        </label>
      )}
      {cap && <label title="The cap on its own, standing on its rim, ready to print">{box("cap")} Cap STL</label>}
      <label title="Your settings + the generator in one plain OpenSCAD file: opens in any OpenSCAD, and here with Open…. Its part setting (Output tab) also makes the ligature and cap">
        {box("full")} Design file (.scad{picture ? " + picture" : ""}) <span className="muted">opens anywhere</span>
      </label>
      <label title="Tip opening, facing stops and the other numbers to measure the print against">
        {box("card")} Check card <span className="muted">numbers to measure</span>
      </label>
      <details className="save-more" open={moreOpen} onToggle={(e) => setMoreOpen(e.currentTarget.open)}>
        <summary>More formats</summary>
        <label title="Just your settings (a few KB); the geometry comes from this site when you open it here">
          {box("settings")} Settings-only .scad <span className="muted">opens only on this site</span>
        </label>
      </details>
      <label title="One .zip with every file above, instead of separate downloads (a picture always comes zipped)">
        {box("zip", !files)} Zip the files into one download
      </label>
      <div className="save-buttons">
        <button
          type="button"
          disabled={all}
          onClick={() =>
            (Object.keys(DOWNLOAD_ALL) as (keyof DownloadOpts)[]).forEach((k) => onOpt(k, DOWNLOAD_ALL[k]))
          }
          title="Tick everything: the print kit"
        >
          Tick all
        </button>
        <button type="submit" className="primary" disabled={!files || busy}>
          Download
        </button>
      </div>
    </form>
  );
}
