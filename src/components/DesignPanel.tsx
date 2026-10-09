// The settings panel: the sections from design.ts, in sax terms, with the file's own ranges and
// descriptions: each section's main settings, then the rest under its "More". A file that isn't the
// generator's shows its settings by its own groups.
import { Fragment, useState, type ReactNode } from "react";
import type { ParamValue, ScadParam } from "../api";
import {
  DESIGN_ELSEWHERE,
  DESIGN_HIDDEN_GROUPS,
  DESIGN_OPTIONS,
  DESIGN_SECTIONS,
  isPlaced,
  PART_GROUPS,
  paramCaption,
  changedCount,
  paramInactive,
  paramEnds,
  paramLabel,
  type PartTab,
} from "../design";
import { shapeParams } from "../shapeEdit";
import { BaffleSketches } from "./BaffleSketches";
import { Customizer, PanelOptions, ParamRow } from "./Customizer";
import { Fold } from "./Fold";
import { Menu } from "./Menu";
import { usePref } from "../uiPrefs";
import { DONATE_URL, PRESET_SOURCES, PRINTING_GUIDE_URL, REPO_URL } from "../links";

interface Props {
  title: string;
  params: ScadParam[];
  values: Record<string, ParamValue>;
  onChange(name: string, value: ParamValue | undefined): void;
  onResetAll(): void;
  onCompareOriginal?(): void; // the design as it was (published / saved) as B
  zoom: boolean;
  onZoomChange(on: boolean): void;
  onFocusParam(name: string): void;
  readouts?: ReactNode; // shown above the controls, not scrolling (desktop)
  facing?: ReactNode; // the facing chart, under "Tip & facing"
  profile?(section: "body" | "chamber"): ReactNode; // the side section, under "Chamber & baffle" and "Body & beak"
  printKit?: ReactNode; // the print kit download, under "Printing"
  ligature?: { on: boolean; shown?: boolean; head: ReactNode }; // the Ligature section: its head (make / show / download), controls once on
  cap?: { on: boolean; head: ReactNode }; // the Cap section: its head (make / show / download), controls once made
  // The part tabs (mouthpiece, ligature, cap): which is open, and the tabs offered (made = shows a dot).
  tab?: PartTab;
  tabs?: { id: PartTab; label: string; made?: boolean }[];
  onTab?(tab: PartTab): void;
  failed?: boolean; // the file didn't render, so it has no parameters to show
  loading?: boolean; // the file's parameters aren't known yet
  history?: { canUndo: boolean; canRedo: boolean; step(redo: boolean): void }; // undo / redo of setting changes
  showNames?: boolean; // while the code is open: each setting's name in the file, the point lists and every option
  deeper?: ReactNode; // sections for going further, after the settings (Curves, Compare)
  about?: string; // a variant's one-line description, over the settings
  printed?: () => void; // a mouthpiece STL was just downloaded: the note on printing it (closes with this)
  // The desktop's rail picks one section to show (its title), open; its charts are in the dock, and
  // the credits under About. A search still looks everywhere.
  only?: string;
  fitNote?: ReactNode; // under "Fit on the horn": the test ring, to check the fit first
  charts?: boolean; // with `only`: the section's chart inline all the same (the phone has no dock)
}

const same = (a: ParamValue, b: ParamValue) => JSON.stringify(a) === JSON.stringify(b);

export function DesignPanel({
  title,
  params,
  values,
  onChange,
  onResetAll,
  onCompareOriginal,
  zoom,
  onZoomChange,
  onFocusParam,
  readouts,
  facing,
  profile,
  printKit,
  ligature,
  cap,
  tab = "mouthpiece",
  tabs,
  onTab,
  failed = false,
  loading = false,
  history,
  showNames = false,
  deeper,
  about,
  printed,
  only,
  fitNote,
  charts = false,
}: Props) {
  const byName = new Map(params.map((p) => [p.name, p]));
  const setParam = (name: string, v: ParamValue) => {
    const q = byName.get(name);
    if (q) onChange(name, same(v, q.initial) ? undefined : v);
  };
  const changed = changedCount(values);
  const [captions, setCaptions] = usePref("captions", true);
  // the rail on the ligature or cap before it is made: only its "make" button
  const unmade = (only === "Ligature" && !ligature?.on) || (only === "Cap" && !cap?.on);
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
            ) : loading ? (
              "Loading the settings…"
            ) : (
              <>{title} has no settings to adjust: it's plain OpenSCAD code. Edit it under Code.</>
            )}
          </p>
          {deeper}
        </div>
      </div>
    );

  const get = (n: string) => values[n] ?? byName.get(n)?.initial;
  const q = query.trim().toLowerCase();
  const matches = (name: string, label: string, caption?: string) =>
    !q ||
    [name, label, caption ?? "", byName.get(name)?.caption ?? "", ...(paramEnds(name) ?? [])].some((t) =>
      t.toLowerCase().includes(q),
    );
  // Point lists show only while the code is open (the Curves section edits them).
  const hidden = (p: ScadParam) => !showNames && DESIGN_HIDDEN_GROUPS.includes(p.group);
  // A search looks in every tab; otherwise only the open tab's sections and groups show.
  const tabbed = !!tabs && tabs.length > 1 && !q;
  const onTabNow = (s: (typeof DESIGN_SECTIONS)[number]) => !tabbed || (s.tab ?? "mouthpiece") === tab;
  const partGroups = Object.values(PART_GROUPS);
  const groups = [...new Set(params.map((p) => p.group))];
  const tabHidden = !tabbed
    ? []
    : tab === "mouthpiece"
      ? partGroups
      : groups.filter((g) => g !== PART_GROUPS[tab as Exclude<PartTab, "mouthpiece">]);
  // Settings without a section (a file that isn't the generator's): by the file's own groups.
  const others = params.filter((p) => !isPlaced(p.name) && !hidden(p));
  const otherGroups = [...new Set(others.filter((p) => !tabHidden.includes(p.group)).map((p) => p.group))];
  const ids = [...DESIGN_SECTIONS.map((s) => `d:${s.title}`), ...otherGroups.map((g) => `p:${g}`)];
  const row = (p: ScadParam, i?: (typeof DESIGN_SECTIONS)[number]["items"][number]) => (
    <ParamRow
      key={p.name}
      p={p}
      label={
        i?.side ? (
          <>
            {i.label} <SideIcon side={i.side} />
          </>
        ) : (
          i?.label
        )
      }
      unit={i?.unit}
      options={
        showNames
          ? undefined
          : i?.options && !i.options.includes(String(values[p.name] ?? p.initial))
            ? [...i.options, String(values[p.name] ?? p.initial)]
            : (i?.options ?? DESIGN_OPTIONS[p.name])
      }
      caption={i?.caption}
      optionLabels={i?.optionLabels}
      showName={showNames}
      value={values[p.name] ?? p.initial}
      changed={p.name in values}
      onFocus={() => onFocusParam(p.name)}
      onChange={(v) => onChange(p.name, same(v, p.initial) ? undefined : v)}
      setParam={setParam}
      inactive={paramInactive(p.name, get)}
    />
  );
  const noMatch =
    q &&
    !params.some(
      (p) =>
        !hidden(p) && !DESIGN_ELSEWHERE.includes(p.name) && matches(p.name, paramLabel(p.name), paramCaption(p.name)),
    );

  return (
    <div className="design-panel">
      {readouts}
      {tabs && tabs.length > 1 && (
        <div className="part-tabs" role="tablist" aria-label="Part">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === tab}
              className={t.id === tab ? "active" : ""}
              onClick={() => onTab?.(t.id)}
            >
              {t.label}
              {t.made && (
                <span className="made-dot" title="Made for this design">
                  {" "}
                  •
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {only ? (
        !unmade && (
          <div className="design-head single">
            <input
              type="search"
              className="design-find"
              placeholder="Find a setting"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Find a setting"
            />
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
            <button
              disabled={!changed}
              onClick={onResetAll}
              title="Back to the values in the file (a ligature or cap made here goes too)"
            >
              Reset{changed ? ` (${changed})` : ""}
            </button>
            <Menu label="Options ▾" title="Auto-zoom, descriptions, compare with the original" className="head-more">
              {(close) => (
                <div className="menu-list">
                  <label title="When you touch a setting, the view flies to the part it shapes (and cuts the model open for parts inside)">
                    <input type="checkbox" checked={zoom} onChange={(e) => onZoomChange(e.target.checked)} /> Auto-zoom
                    to the part a setting shapes
                  </label>
                  <label title="Show what each setting does under it">
                    <input type="checkbox" checked={captions} onChange={(e) => setCaptions(e.target.checked)} /> Show
                    descriptions
                  </label>
                  {onCompareOriginal && (
                    <button
                      disabled={!changed}
                      onClick={() => {
                        close();
                        onCompareOriginal();
                      }}
                      title="The design as it was (a preset as published, yours as saved), as B"
                    >
                      Compare with the original
                    </button>
                  )}
                </div>
              )}
            </Menu>
          </div>
        )
      ) : (
        <>
          <div className="design-head">
            <input
              type="search"
              className="design-find"
              placeholder={`Find a setting in ${title}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Find a setting"
            />
            <label
              className="zoom-toggle"
              title="Auto-zoom: when you touch a setting, the view flies to the part it shapes (and cuts the model open for parts inside)"
            >
              <input type="checkbox" checked={zoom} onChange={(e) => onZoomChange(e.target.checked)} /> Auto-zoom
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
            <button
              disabled={!changed}
              onClick={onResetAll}
              title="Back to the values in the file (a ligature or cap made here goes too)"
            >
              Reset{changed ? ` (${changed})` : ""}
            </button>
            {onCompareOriginal && (
              <button
                disabled={!changed}
                onClick={onCompareOriginal}
                title="Compare with the original: the design as it was (a preset as published, yours as saved), as B"
              >
                vs original
              </button>
            )}
          </div>
          <PanelOptions ids={ids} />
        </>
      )}
      <div className="design-scroll">
        {printed && (
          <div className="printed-note">
            <span>
              Printing it?{" "}
              {PRINTING_GUIDE_URL && (
                <>
                  The{" "}
                  <a href={PRINTING_GUIDE_URL} target="_blank" rel="noreferrer">
                    printing guide
                  </a>{" "}
                  covers the cork fit, sanding the table and checking the print.
                </>
              )}
              {DONATE_URL && (
                <>
                  {" "}
                  If it plays well,{" "}
                  <a href={DONATE_URL} target="_blank" rel="noreferrer">
                    you can support Open Mouthpiece
                  </a>{" "}
                  ♥
                </>
              )}
            </span>
            <button onClick={printed} aria-label="Close" title="Close">
              ✕
            </button>
          </div>
        )}
        {about && !q && tab === "mouthpiece" && <p className="design-about muted">{about}</p>}
        {DESIGN_SECTIONS.map((s) => {
          const filled = (n: string) => String(values[n] ?? byName.get(n)?.initial ?? "").trim() !== "";
          const rows = s.items.filter(
            (i) =>
              byName.has(i.name) &&
              (!i.showIf || i.showIf.some(filled)) &&
              (!i.when || [i.when[1]].flat().includes(String(get(i.when[0])))) &&
              (!s.ligature || ligature?.on) &&
              (!s.cap || cap?.on) &&
              matches(i.name, i.label, i.caption),
          );
          if (s.ligature && (!ligature || !s.items.some((i) => byName.has(i.name)))) return null;
          if (s.cap && !cap) return null;
          if (!onTabNow(s)) return null;
          if (only && !q && s.title !== only) return null;
          if (!s.items.some((i) => byName.has(i.name))) return null;
          // The rest of the section, under More (the ligature's and cap's once made, like their rows).
          const more = (s.more ?? [])
            .map((n) => byName.get(n))
            .filter(
              (p): p is ScadParam =>
                !!p &&
                !hidden(p) &&
                (!s.ligature || !!ligature?.on) &&
                (!s.cap || !!cap?.on) &&
                matches(p.name, paramLabel(p.name)),
            );
          if (
            q &&
            !rows.length &&
            !more.length &&
            !(s.ligature && matches("ligature", s.title)) &&
            !(s.cap && matches("cap", s.title))
          )
            return null;
          const summary = s.cap && !cap?.on ? undefined : s.summary?.(get); // the cap's only once made
          const moreChanged = more.filter((p) => p.name in values).length;
          return (
            <Fold
              key={s.title}
              id={`d:${s.title}`}
              title={
                only && s.plain ? (
                  <>
                    {s.title}
                    <span className="fold-plain">{s.plain}</span>
                  </>
                ) : (
                  s.title
                )
              }
              summary={summary}
              forceOpen={!!q || !!only || (tabbed && tab !== "mouthpiece")}
              className="design-section"
              changed={
                s.items.filter((i) => i.name in values).length +
                moreChanged +
                shapeParams(s.title).filter((n) => n in values).length
              }
            >
              {s.ligature && ligature!.head}
              {s.cap && cap!.head}
              {rows.map((i) =>
                i.name === "baffle_type" ? (
                  <Fragment key={i.name}>
                    {row(byName.get(i.name)!, i)}
                    <BaffleSketches value={String(get(i.name))} onPick={(v) => setParam(i.name, v)} />
                  </Fragment>
                ) : (
                  row(byName.get(i.name)!, i)
                ),
              )}
              {s.title === "Tip & facing" && !q && (!only || charts) && facing}
              {s.title === "Chamber & baffle" && !q && (!only || charts) && profile?.("chamber")}
              {s.title === "Body & beak" && !q && (!only || charts) && profile?.("body")}
              {s.title === "Printing" && !q && PRINTING_GUIDE_URL && (
                <p className="fit-note muted">
                  First print? The{" "}
                  <a href={PRINTING_GUIDE_URL} target="_blank" rel="noreferrer">
                    printing guide
                  </a>{" "}
                  covers material, layer height, supports and finishing.
                </p>
              )}
              {s.title === "Printing" && !q && printKit}
              {s.title === "Fit on the horn" && !q && fitNote}
              {more.length > 0 && (
                <Fold
                  id={`m:${s.title}`}
                  title={
                    <>
                      More settings <span className="more-count">{more.length}</span>
                      <span className="more-chevron" aria-hidden="true" />
                    </>
                  }
                  summary={q ? undefined : more.map((p) => paramLabel(p.name).toLowerCase()).join(", ")}
                  forceOpen={!!q}
                  className="design-more"
                  changed={moreChanged}
                >
                  {more.map((p) => row(p))}
                </Fold>
              )}
            </Fold>
          );
        })}
        {others.length > 0 && (!only || !!q) && (
          <Customizer
            embedded
            filter={query}
            showNames={showNames}
            title={title}
            params={others}
            values={values}
            onChange={onChange}
            onResetAll={onResetAll}
            zoom={zoom}
            onZoomChange={onZoomChange}
            onFocusParam={onFocusParam}
            hideGroups={tabHidden}
          />
        )}
        {!q && tab === "mouthpiece" && deeper}
        {noMatch && <p className="design-nomatch muted">No setting matches “{query}”.</p>}
        {!only && <Credits />}
      </div>
    </div>
  );
}

// Where the presets and the geometry come from, and the donation note.
export function Credits({ donate = true }: { donate?: boolean } = {}) {
  return (
    <>
      <p className="preset-credit muted">
        Thanks to Windy City Woodwinds, whose mouthpieces (
        {PRESET_SOURCES.map((s, i) => (
          <span key={s.url}>
            {i ? ", " : ""}
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.label.replace(/^"64" /, "")}
            </a>
          </span>
        ))}
        ) the presets are based on.
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
      {donate && DONATE_URL && (
        <p className="donate-note muted">
          Open Mouthpiece is free: no ads, no accounts, your designs stay in your browser (anonymous usage helps improve
          it; ⚙ turns it off). If it made you a mouthpiece you like,{" "}
          <a href={DONATE_URL} target="_blank" rel="noreferrer">
            you can support it
          </a>{" "}
          ♥
        </p>
      )}
    </>
  );
}

// The mouthpiece from above, tip away, with one side marked: which side "right" / "left" means.
function SideIcon({ side }: { side: "left" | "right" }) {
  const edge = side === "right" ? "M12.5 9 L11.5 20" : "M3.5 9 L4.5 20";
  return (
    <svg className="side-icon" width="20" height="28" viewBox="0 0 16 22" role="img">
      <title>{`The ${side} side, seen from above with the tip pointing away`}</title>
      <path
        d="M4.5 20 L3.5 9 Q3.5 2 8 1.5 Q12.5 2 12.5 9 L11.5 20 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path d={edge} stroke="var(--accent-fg)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
