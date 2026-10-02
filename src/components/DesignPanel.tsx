// The settings panel: the curated controls from design.ts, in sax terms, with the
// file's own ranges and descriptions; everything else under "All parameters".
import { useState, type ReactNode } from "react";
import type { ParamValue, ScadParam } from "../api";
import { DESIGN_HIDDEN_GROUPS, DESIGN_OPTIONS, DESIGN_SECTIONS, paramLabel } from "../design";
import { Customizer, PanelOptions, ParamRow } from "./Customizer";
import { Fold } from "./Fold";
import { DONATE_URL, PRESET_SOURCES, REPO_URL } from "../links";

interface Props {
  title: string;
  params: ScadParam[];
  values: Record<string, ParamValue>;
  onChange(name: string, value: ParamValue | undefined): void;
  onResetAll(): void;
  zoom: boolean;
  onZoomChange(on: boolean): void;
  onFocusParam(name: string): void;
  readouts?: ReactNode; // shown above the controls, not scrolling (desktop)
  facing?: ReactNode; // the facing chart, under "Tip & facing"
  ligature?: { on: boolean; shown?: boolean; head: ReactNode }; // the Ligature section: its head (make / show / download), controls once on
  allParams?: boolean; // "All parameters" below the controls
  failed?: boolean; // the file didn't render, so it has no parameters to show
  history?: { canUndo: boolean; canRedo: boolean; step(redo: boolean): void }; // undo / redo of setting changes
  showNames?: boolean; // while the code is open: All parameters shows each one's name in the file, every group and option
  notes?: string[]; // the generator's notes, over All parameters
  deeper?: ReactNode; // sections for going further, after All parameters (Curves, Compare)
}

const same = (a: ParamValue, b: ParamValue) => JSON.stringify(a) === JSON.stringify(b);

export function DesignPanel({
  title,
  params,
  values,
  onChange,
  onResetAll,
  zoom,
  onZoomChange,
  onFocusParam,
  readouts,
  facing,
  ligature,
  allParams = true,
  failed = false,
  history,
  showNames = false,
  notes,
  deeper,
}: Props) {
  const byName = new Map(params.map((p) => [p.name, p]));
  const setParam = (name: string, v: ParamValue) => {
    const q = byName.get(name);
    if (q) onChange(name, same(v, q.initial) ? undefined : v);
  };
  const changed = Object.keys(values).length;
  const [query, setQuery] = useState("");

  if (params.length === 0)
    return (
      <div className="design-panel">
        {readouts}
        <div className="design-scroll">
          <p className="design-nomatch muted">
            {failed ? (
              <>
                {title} has an error, so there is nothing to adjust. The code's console (Code, on the left) shows where
                it is.
              </>
            ) : (
              "No settings to show (yet)."
            )}
          </p>
          {deeper}
        </div>
      </div>
    );

  const get = (n: string) => values[n] ?? byName.get(n)?.initial;
  const q = query.trim().toLowerCase();
  const matches = (name: string, label: string, caption?: string) =>
    !q || [name, label, caption ?? byName.get(name)?.caption ?? ""].some((t) => t.toLowerCase().includes(q));
  const allMatch = q
    ? params.some((p) => !DESIGN_HIDDEN_GROUPS.includes(p.group) && matches(p.name, paramLabel(p.name)))
    : false;
  const ids = [...DESIGN_SECTIONS.map((s) => `d:${s.title}`), "d:all"];

  return (
    <div className="design-panel">
      {readouts}
      <div className="design-head">
        <input
          type="search"
          className="design-find"
          placeholder={`Find a setting in ${title}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Find a setting"
        />
        <label className="zoom-toggle" title="When you touch a control, zoom the view to the part it shapes">
          <input type="checkbox" checked={zoom} onChange={(e) => onZoomChange(e.target.checked)} /> Zoom
        </label>
        {history && (
          <span className="undo-redo">
            <button
              disabled={!history.canUndo}
              onClick={() => history.step(false)}
              title="Undo the last change (Ctrl+Z)"
              aria-label="Undo"
            >
              ↶
            </button>
            <button
              disabled={!history.canRedo}
              onClick={() => history.step(true)}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              ↷
            </button>
          </span>
        )}
        <button disabled={!changed} onClick={onResetAll} title="Back to the values in the file">
          Reset{changed ? ` (${changed})` : ""}
        </button>
      </div>
      <PanelOptions ids={ids} />
      <div className="design-scroll">
        {DESIGN_SECTIONS.map((s) => {
          const filled = (n: string) => String(values[n] ?? byName.get(n)?.initial ?? "").trim() !== "";
          const rows = s.items.filter(
            (i) =>
              byName.has(i.name) &&
              (!i.showIf || i.showIf.some(filled)) &&
              (!s.ligature || ligature?.on) &&
              matches(i.name, i.label, i.caption),
          );
          if (s.ligature && (!ligature || !s.items.some((i) => byName.has(i.name)))) return null;
          if (!s.items.some((i) => byName.has(i.name))) return null;
          if (q && !rows.length && !(s.ligature && matches("ligature", s.title))) return null;
          const summary = s.summary?.(get);
          return (
            <Fold
              key={s.title}
              id={`d:${s.title}`}
              title={s.title}
              summary={summary}
              forceOpen={!!q}
              className="design-section"
              changed={s.items.filter((i) => i.name in values).length}
            >
              {s.ligature && ligature!.head}
              {rows.map((i) => {
                const p = byName.get(i.name)!;
                return (
                  <ParamRow
                    key={p.name}
                    p={p}
                    label={i.label}
                    unit={i.unit}
                    options={i.options}
                    caption={i.caption}
                    optionLabels={i.optionLabels}
                    value={values[p.name] ?? p.initial}
                    changed={p.name in values}
                    onFocus={() => onFocusParam(p.name)}
                    onChange={(v) => onChange(p.name, same(v, p.initial) ? undefined : v)}
                    setParam={setParam}
                  />
                );
              })}
              {s.title === "Tip & facing" && !q && facing}
            </Fold>
          );
        })}
        {allParams && (!q || allMatch) && (
          <Fold id="d:all" title="All parameters" forceOpen={allMatch} className="design-all" changed={changed}>
            <Customizer
              embedded
              filter={query}
              showNames={showNames}
              notes={notes}
              title={title}
              params={params}
              values={values}
              onChange={onChange}
              onResetAll={onResetAll}
              zoom={zoom}
              onZoomChange={onZoomChange}
              onFocusParam={onFocusParam}
              hideGroups={showNames ? [] : DESIGN_HIDDEN_GROUPS}
              allowedOptions={showNames ? undefined : DESIGN_OPTIONS}
            />
          </Fold>
        )}
        {!q && deeper}
        {q &&
          !allMatch &&
          !DESIGN_SECTIONS.some((s) =>
            s.items.some((i) => byName.has(i.name) && matches(i.name, i.label, i.caption)),
          ) && <p className="design-nomatch muted">No setting matches “{query}”.</p>}
        <p className="preset-credit muted">
          The presets are measured from Windy City Woodwinds' mouthpieces on Thingiverse:{" "}
          {PRESET_SOURCES.map((s, i) => (
            <span key={s.url}>
              {i ? ", " : ""}
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </span>
          ))}
          .
        </p>
        <p className="preset-credit muted">
          The geometry is made by{" "}
          <a href="https://openscad.org" target="_blank" rel="noreferrer">
            OpenSCAD
          </a>{" "}
          (GPL-2.0-or-later,{" "}
          <a href="https://github.com/openscad/openscad" target="_blank" rel="noreferrer">
            source
          </a>
          ), running in your browser.
          {REPO_URL && (
            <>
              {" "}
              Open Mouthpiece is free software (GPL-3.0-or-later):{" "}
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                source code
              </a>
              .
            </>
          )}
        </p>
        {DONATE_URL && (
          <p className="donate-note muted">
            Open Mouthpiece is free: no ads, no accounts, nothing saved on a server. If it made you a mouthpiece you
            like,{" "}
            <a href={DONATE_URL} target="_blank" rel="noreferrer">
              you can support it
            </a>{" "}
            ♥
          </p>
        )}
      </div>
    </div>
  );
}
