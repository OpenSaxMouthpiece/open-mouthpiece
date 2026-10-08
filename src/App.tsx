// Open Mouthpiece: settings panel + 3D viewer, with an optional code editor + console, rendering
// with OpenSCAD in the browser (WebAssembly, Manifold backend; no server). Works with any .scad
// source, and with multi-file projects: every render sees the unsaved text of all open project
// files, so editing an included base file re-renders the file that includes it.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { zipSync } from "fflate";
import { bundleDesign } from "./bundle";
import { withValues } from "./scadText";
import { api, base64ToBuffer, type ParamValue, type RenderTarget, type ScadParam } from "./api";
import { Editor, type EditorHandle } from "./components/Editor";
import { Viewer } from "./components/Viewer";
import { Console } from "./components/Console";
import { ComparePanel } from "./components/ComparePanel";
import { CurveEditor } from "./components/CurveEditor";
import { Credits, DesignPanel } from "./components/DesignPanel";
import { Rail } from "./components/Rail";
import { buildRail } from "./app/rail";
import { MIN_EDITOR_W, MIN_PANEL_W, Workspace } from "./app/Workspace";
import { ShapeDock, type DockTab } from "./components/ShapeDock";
import { TipChart } from "./components/TipChart";
import { FacingChart } from "./components/FacingChart";
import { ProfileChart } from "./components/ProfileChart";
import { Notes, ReadoutLine, Readouts } from "./components/Readouts";
import { TabBar } from "./components/TabBar";
import { CompareSelect, groupFiles, VoicePicker, type ComparePick } from "./components/FilePickers";
import { SaveAsPanel, SAVE_DEFAULTS, wantsFiles, type SaveOpts } from "./components/SaveAsPanel";
import { LigatureHead } from "./components/LigatureHead";
import { CapHead } from "./components/CapHead";
import { PartNote } from "./components/PartNote";
import { Menu } from "./components/Menu";
import { AppearanceMenu, AppearancePanel } from "./components/AppearanceMenu";
import { Fold } from "./components/Fold";
import { report, setReportContext } from "./report";
import { parseAirVolume, type Snapshot } from "./compare";
import {
  FRAME_ECHO,
  parseFrameEcho,
  readStl,
  toDesignFrame,
  toPrintFrame,
  writeStl,
  type PrintFrame,
} from "./meshFrame";
import { FACING_CHOICES, fileAbout, hasDesignParams, type PartTab } from "./design";
import { LINES, type ShapeSection } from "./shapeEdit";
import { parseFacing, parseSummary, parseTextVariables } from "./readouts";
import { TextVariables } from "./components/TextField";
import { checkCard, kitSqueezes, ringFile } from "./printKit";
import { designNumbers, track, trackSetting, trackVisit } from "./usage";
import { findPointLists, type Pt } from "./curves";
import { clearShare, encodeShare, readShare, type SharedDesign } from "./share";
import { migrateScad } from "./migrate";
import { imageRefs, isUserArt, receiveArt, sharedArt } from "./userArt";
import { DONATE_URL, GLOSSARY_URL, PRINTING_GUIDE_URL, REPO_URL } from "./links";
import { setSectionsOpen, usePref } from "./uiPrefs";
import {
  presetFor,
  DEFAULT_FILE,
  GENERATOR,
  LOCAL,
  NO_VALUES,
  PRESETS,
  baseName,
  download,
  downloadName,
  fileName,
  includesGenerator,
  isDirty,
  isLibrary,
  isExtra,
  isVariant,
  localTab,
  otherPartOf,
  partName,
  projectTab,
  reportDesign,
  scadFileName,
  tabLabel,
  voiceLabel,
  type Tab,
  type Values,
} from "./app/files";
import {
  loadSession,
  readFlag,
  saveSession,
  writeFlag,
  type CapView,
  type LigatureView,
  type Quality,
} from "./app/session";
import { Logo } from "./components/Logo";
import { useMediaQuery, useWindowWidth } from "./hooks/useMediaQuery";
import { useValueHistory } from "./hooks/useValueHistory";
import { useParamFocus } from "./hooks/useParamFocus";
import { useModelRender, type RenderState, type Status } from "./hooks/useModelRender";

const HINT_KEY = "open-mouthpiece-hint-v1";
const PHONE_VIEW_KEY = "open-mouthpiece-phone-view-v1";
// Point lists set as values (the Customizer can't show them), kept while the parameter that uses
// them is there: the facing chart's gauge points (facing_model = "gauge").
const POINT_VALUES: Record<string, string> = { facing_gauge_points: "facing_model" };
const QUALITY_HINT =
  "Model detail: Draft is fastest, Fine slowest. Changes show a quick draft first, then this quality once you pause. Downloads are always at least Normal.";

// "model" = whatever is on screen; "mouthpiece" = the mouthpiece even while a test ring is shown.
type PartWhat = "model" | "mouthpiece" | "ring" | "ligature" | "cap";
type Download = { what: PartWhat | "kit"; state: "busy" | "done" | "error" };

export default function App() {
  const saved = useRef(loadSession()).current;
  const editor = useRef<EditorHandle>(null);

  // ---- files and tabs
  const [ready, setReady] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeKey, setActiveKey] = useState(""); // the tab in the code editor
  const [mainKey, setMainKey] = useState(""); // the tab rendered (a library file renders through the file including it)
  const [valuesByKey, setValuesByKey] = useState<Record<string, Values>>(saved.valuesByKey ?? {});
  const [files, setFiles] = useState<string[]>([]);
  const [readOnly, setReadOnly] = useState<Set<string>>(new Set()); // presets: open and try, "Save as…" to change
  const [ownFiles, setOwnFiles] = useState<Set<string>>(new Set()); // the user's saved files (in this browser)
  const [backend, setBackend] = useState("");
  const [params, setParams] = useState<ScadParam[]>([]);
  const [paramsKey, setParamsKey] = useState(""); // the tab the params are of
  const paramsKeyRef = useRef(paramsKey);
  paramsKeyRef.current = paramsKey;

  // ---- settings and layout
  const [auto, setAuto] = useState(saved.auto ?? true);
  const [zoom, setZoom] = useState(saved.zoom ?? true);
  const [quality, setQuality] = useState<Quality>(saved.quality ?? "normal");
  const [editorW, setEditorW] = useState(saved.editorW ?? Math.round(window.innerWidth * 0.36));
  const [panelW, setPanelW] = usePref("panelW", 380); // the right panel (drag its edge)
  const [codeOpen, setCodeOpen] = usePref("codeOpen", false); // the code editor + console column (desktop)
  // Desktop: the place open from the rail (a section's title, or a tool), and the shape dock under the view.
  const [railSel, setRailSel] = usePref("rail", "Tip & facing");
  const [dockOpen, setDockOpen] = usePref("shapeCard", false);
  const [dockTab, setDockTab] = usePref("dockTab", "body");
  const [dockBig, setDockBig] = usePref("dockBig", false);
  const winW = useWindowWidth();
  const isPhone = useMediaQuery("(max-width: 1024px)"); // phones and portrait tablets
  // the phone view's height (dvh), dragged; remembered in this browser
  const [phoneViewerH, setPhoneViewerH] = useState(() => {
    try {
      const v = Number(localStorage.getItem(PHONE_VIEW_KEY));
      return v >= 20 && v <= 85 ? v : 44;
    } catch {
      return 44;
    }
  });
  // The phone shows the design; the code and its console open from the ☰ menu, over it.
  const [phonePanel, setPhonePanel] = useState<"design" | "code" | "console">("design");
  const [phoneReadouts, setPhoneReadouts] = useState(false); // the readout cards open over the view
  const [menuOpen, setMenuOpen] = useState(false);
  // "Deep" work (editing code): on a phone the Code tab, on a desktop the open code column. Without
  // it the app keeps to the design on screen: always re-renders, saves that design.
  const coding = isPhone ? phonePanel === "code" || phonePanel === "console" : codeOpen;

  // ---- transient UI state
  // text = the full line (shown with the code open); short = the plain version, when different
  const [status, setStatus] = useState<Status>({ text: "", kind: "idle" });
  // Progress and confirmation of something the user did (downloading, saved, link copied), shown in
  // place of the render status (a confirmation for a few seconds, so a render it starts doesn't hide it).
  const [notice, setNotice] = useState<Status | null>(null);
  const notify = useCallback((s: Status) => setNotice(s), []);
  const fail = useCallback((s: Status) => {
    setNotice(null);
    setStatus(s);
  }, []);
  useEffect(() => {
    if (!notice || notice.kind === "busy") return; // progress stays until the action ends
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  const [dl, setDl] = useState<Download | null>(null); // a download in progress or just finished
  const [printed, setPrinted] = useState(false); // a mouthpiece STL was downloaded: the after-download note
  const [hintSeen, setHintSeen] = useState(() => readFlag(HINT_KEY)); // the first-visit hint card
  const [shareLink, setShareLink] = useState<string | null>(null); // shown when the clipboard refuses
  const [shareArt, setShareArt] = useState(false); // put the user's own picture in the share link
  const [copied, setCopied] = useState(false); // the Share button says "Copied ✓" for a moment
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>();
  const [saveAs, setSaveAs] = useState<string | null>(null); // the Save as name while it's open
  const [saveOpts, setSaveOpts] = usePref<SaveOpts>("saveAs", SAVE_DEFAULTS);
  const [armedClose, setArmedClose] = useState<string | null>(null); // close clicked once on an unsaved tab
  const [armedDelete, setArmedDelete] = useState<string | null>(null); // Delete clicked once on a saved design
  const [dragging, setDragging] = useState(false); // a file dragged over the page
  // How the ligature is shown (a view setting); whether one is made is the design's ligature_made.
  const [lig, setLig] = useState<LigatureView>({ on: true, beside: false, reed: false, ...saved.ligature });
  // How the cap is shown (a view setting); whether one is made is the design's cap_made.
  const [capV, setCapV] = useState<CapView>({ on: true, beside: false, ...saved.cap });
  // The settings tab open: the mouthpiece, the ligature or the cap. It also picks what the view shows,
  // what Download saves and what the readouts say.
  const [partTab, setPartTab] = useState<PartTab>(saved.partTab ?? "mouthpiece");
  // The mouthpiece shown in the view (off: the ligature or cap alone); the Mouthpiece tab brings it back.
  const [showMp, setShowMp] = useState(true);
  const [pinned, setPinned] = useState<Snapshot | null>(null); // model B

  // ---- the design on screen
  const activeTab = tabs.find((t) => t.key === activeKey) ?? tabs[0];
  const mainTab = tabs.find((t) => t.key === mainKey) ?? activeTab;
  const values = (mainTab && valuesByKey[mainTab.key]) ?? NO_VALUES;
  const otherPart = otherPartOf(values); // the shank test ring etc.: the mouthpiece's readouts don't apply
  const isRO = (t: Tab | undefined) => !!t?.path && readOnly.has(t.path);
  // What OpenSCAD needs to render the main tab: its text + unsaved text of other project files.
  const target: RenderTarget | null = useMemo(
    () =>
      mainTab
        ? {
            path: mainTab.path,
            name: mainTab.name,
            source: mainTab.source,
            files: Object.fromEntries(
              tabs.filter((t) => t.key !== mainTab.key && t.path && isDirty(t)).map((t) => [t.path!, t.source]),
            ),
          }
        : null,
    [tabs, mainTab],
  );
  const targetSig = useMemo(() => JSON.stringify(target), [target]);
  const valuesSig = JSON.stringify(values);
  // A file without the settings panel's parameters (a scratch file) gets the plain Customizer instead.
  const designOK = useMemo(() => hasDesignParams(params.map((p) => p.name)), [params]);
  const reportsOn = designOK && (!isPhone || phonePanel === "design");
  // Not a mouthpiece: no readouts (while the params load they're assumed, so the layout doesn't jump).
  const noReadouts = !designOK && !!mainTab && paramsKey === mainTab.key;
  const param = (n: string) => params.find((p) => p.name === n);
  // The file has the ligature's settings (a mouthpiece made by the generator), and the mouthpiece is what's shown.
  const ligOK = !!param("ligature_length") && !otherPart;
  // A ligature is made when the design says so (ligature_made: kept in saves, downloads and links).
  const ligMade =
    ligOK && ("ligature_made" in values ? values.ligature_made : param("ligature_made")?.initial) === true;
  // The same for the cap (cap_made).
  const capOK = !!param("cap_wall") && !otherPart;
  const capMade = capOK && ("cap_made" in values ? values.cap_made : param("cap_made")?.initial) === true;
  // The open part tab (the mouthpiece's when the file has no such part).
  const tab: PartTab =
    partTab === "ligature" && param("ligature_length")
      ? "ligature"
      : partTab === "cap" && param("cap_wall")
        ? "cap"
        : "mouthpiece";
  // What the view shows follows the view toggles (opening a part tab sets them: see openPartTab). In
  // the cap's tab the printed ligature it goes over shows even before one is made.
  const capOverPrinted =
    (("cap_ligature" in values ? values.cap_ligature : param("cap_ligature")?.initial) ?? "printed") === "printed";
  const ligView = { ...lig, on: lig.on && (ligMade || (tab === "cap" && capMade && capOverPrinted)) };
  const capView = { ...capV, on: capMade && capV.on };

  // {title} in the lettering: the design's name goes along as design_title (a hidden setting of
  // the generator's files), in renders and in downloaded .scad files.
  const titled: Record<string, ParamValue> =
    mainTab && /\bdesign_title\s*=/.test(mainTab.source)
      ? { ...values, design_title: mainTab.path ? voiceLabel(mainTab.path) : mainTab.name }
      : values;

  // Latest state for async callbacks.
  const liveState = {
    target,
    values: titled,
    valuesByKey,
    tabs,
    files,
    zoom,
    readOnly,
    ownFiles,
    params,
    quality,
    reportsOn,
    lig: ligView,
    ligOK,
    cap: capView,
    capOK,
  };
  const live = useRef(liveState);
  live.current = liveState;

  // ---- rendering (hooks/useModelRender.ts) and zoom to parameter (hooks/useParamFocus.ts)
  const { focus, focusOn, setFocusData, prefetchFocus } = useParamFocus(live);
  const model = useModelRender({ state: live as React.RefObject<RenderState>, setStatus, setFocusData, prefetchFocus });
  const { stl, svg, log, facing, wall, air, render, renderPass, partStl, kitReports, shownDraft } = model;
  const summary = useMemo(() => (log ? parseSummary(log) : null), [log]);
  const textVars = useMemo(() => (log ? parseTextVariables(log) : []), [log]);

  // Errors go to the site's log (src/report.ts), with the render's first OpenSCAD error line.
  useEffect(() => {
    if (status.kind === "error")
      report("error", status.text, { openscad: /^ERROR: .*$/m.exec(log)?.[0]?.slice(0, 300) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per error, with the log of that moment
  }, [status.kind, status.text]);
  // no design until the tabs load (not "own design": the visit's first events came before it)
  const reportedDesign = mainTab ? reportDesign(mainTab.path) : "";
  useEffect(() => setReportContext({ design: reportedDesign, changed: Object.keys(values) }), [reportedDesign, values]);
  // Anonymous usage (src/usage.ts): the visit, each design opened, the code column, the quality.
  useEffect(() => trackVisit(), []);
  useEffect(() => {
    if (mainTab) track("design");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per design opened
  }, [mainTab?.key]);
  useEffect(() => {
    if (codeOpen) track("feature", "code");
  }, [codeOpen]);
  useEffect(() => track("quality", quality), [quality]);
  useEffect(() => {
    if (!dl || dl.state === "busy") return;
    const t = setTimeout(() => setDl(null), dl.state === "done" ? 3000 : 5000);
    return () => clearTimeout(t);
  }, [dl]);
  // CodeMirror re-measures once it's visible again.
  useEffect(() => {
    if ((isPhone && phonePanel === "code") || (!isPhone && codeOpen)) setTimeout(() => editor.current?.refresh(), 0);
  }, [isPhone, phonePanel, codeOpen]);

  // ---- persistence (sources of project files are only kept while modified)
  useEffect(() => {
    if (!ready) return;
    const pin =
      pinned && !pinned.mesh
        ? { name: pinned.name, path: pinned.path, source: pinned.source, files: pinned.files, values: pinned.values }
        : null;
    const keptTabs = tabs.map((t) => (t.path && !isDirty(t) ? { ...t, source: "", saved: "" } : t));
    saveSession({
      tabs: keptTabs,
      activeKey,
      mainKey,
      valuesByKey,
      auto,
      zoom,
      editorW,
      pinned: pin,
      quality,
      ligature: lig,
      cap: capV,
      partTab,
    });
  }, [ready, tabs, activeKey, mainKey, valuesByKey, auto, zoom, editorW, pinned, quality, lig, capV, partTab]);

  // ---- tabs
  const refreshFiles = useCallback(async () => {
    const r = await api.files();
    setFiles(r.files);
    setReadOnly(new Set(r.readOnly ?? []));
    setOwnFiles(new Set(r.own ?? []));
    return r;
  }, []);

  const activate = useCallback((key: string, tabsNow?: Tab[]) => {
    setActiveKey(key);
    const t = (tabsNow ?? live.current.tabs).find((x) => x.key === key);
    if (t && !isLibrary(t)) setMainKey(key); // library files render through whichever file includes them
  }, []);

  const openTab = useCallback(
    (t: Tab) => {
      setTabs((old) => {
        const next = old.some((x) => x.key === t.key) ? old : [...old, t];
        activate(t.key, next);
        return next;
      });
    },
    [activate],
  );

  const openProjectFile = useCallback(
    async (p: string): Promise<boolean> => {
      if (live.current.tabs.some((t) => t.key === p)) {
        activate(p);
        return true;
      }
      try {
        openTab(projectTab(p, (await api.file(p)).source));
        return true;
      } catch (err) {
        fail({ text: `Could not open ${p}: ${(err as Error).message}`, kind: "error" });
        return false;
      }
    },
    [activate, openTab, fail],
  );

  const taken = (key: string) => live.current.tabs.some((t) => t.key === key);
  const openLocalFile = async (file: File) => {
    track("feature", "open_file");
    openTab(localTab(file.name, migrateScad(await file.text()), taken));
  };

  // A preset or variant on screen has no × in the code column (the voice picker chooses the design;
  // closing it as the only design left nothing to render, stuck on "Loading…"). Your own or an
  // unsaved design on screen closes (its ×, or Close / Delete in the top bar) to its voice's preset.
  const canClose = (t: Tab) => t.key !== mainKey || !t.path || ownFiles.has(t.path);
  // Swap the design on screen (key) for its voice's preset: the preset is loaded first, so there's
  // never a moment with nothing to show.
  const replaceWithPreset = async (key: string, source: string) => {
    const p = presetFor(source);
    const open = live.current.tabs.find((x) => x.key === p);
    const next = open ?? projectTab(p, (await api.file(p)).source);
    setTabs((old) => {
      const rest = [...old.filter((x) => x.key !== key), ...(open ? [] : [next])];
      activate(next.key, rest);
      return rest;
    });
  };
  const closeTab = (key: string) => {
    const t = tabs.find((x) => x.key === key);
    if (!t) return;
    if ((isDirty(t) || (t.path === null && t.source.trim() !== "")) && armedClose !== key) {
      setArmedClose(key); // first click on a tab with unsaved text arms, second closes
      notify({
        text: `${t.name} isn't saved: close it again to discard it (or Save it first)`,
        short: `Close again to discard ${t.name}`,
        kind: "idle",
      });
      return;
    }
    setArmedClose(null);
    if (key === mainKey) {
      replaceWithPreset(key, t.source).catch((err) =>
        fail({ text: `Close failed: ${(err as Error).message}`, kind: "error" }),
      );
      return;
    }
    const rest = tabs.filter((x) => x.key !== key);
    setTabs(rest);
    if (activeKey === key) activate(mainKey, rest);
  };

  const updateSource = useCallback((key: string, text: string) => {
    if (live.current.readOnly.has(key)) return; // presets (project files are keyed by path)
    setTabs((old) => old.map((t) => (t.key === key && t.source !== text ? { ...t, source: text } : t)));
  }, []);

  const revertTab = (t: Tab) => {
    if (t.saved === null) return;
    setTabs((old) => old.map((x) => (x.key === t.key ? { ...x, source: x.saved ?? x.source } : x)));
    notify({ text: `Reverted ${t.path} to the saved file`, kind: "ok" });
  };

  const dropValues = (key: string) =>
    setValuesByKey((v) => {
      const n = { ...v };
      delete n[key];
      return n;
    });

  // ---- saving
  const saveTab = useCallback(
    async (t: Tab) => {
      if (!t.path) {
        setSaveAs(t.name.endsWith(".scad") ? t.name : `${t.name}.scad`);
        return;
      }
      if (!live.current.ownFiles.has(t.path)) {
        setSaveAs(t.path.replace(/([^/]+)$/, "my_$1"));
        notify({ text: `${t.path} is part of the project: save your own copy (kept in this browser)`, kind: "idle" });
        return;
      }
      const vals = live.current.valuesByKey[t.key] ?? {};
      const source = Object.keys(vals).length ? withValues(t.source, vals) : t.source;
      try {
        await api.save(t.path, source);
        setTabs((old) => old.map((x) => (x.key === t.key ? { ...x, source, saved: source } : x)));
        dropValues(t.key);
        notify({ text: `Saved ${voiceLabel(t.path)} in this browser`, kind: "ok" });
      } catch (err) {
        fail({ text: `Save failed: ${(err as Error).message}`, kind: "error" });
      }
    },
    [notify, fail],
  );

  // Keeps a copy in this browser under a new name. The settings go into the saved file (it is the
  // design); a preset goes back to as published, your own design keeps its changes until you save it too.
  const doSaveAs = async (rel: string, t: Tab | undefined = activeTab) => {
    const p = scadFileName(rel);
    if (!t || !p) {
      fail({ text: "Save as: give the design a name", kind: "error" });
      return;
    }
    const fromPreset = isRO(t);
    const source = withValues(t.source, valuesByKey[t.key] ?? {});
    try {
      await api.save(p, source);
      setSaveAs(null);
      const moved = projectTab(p, source);
      setTabs((old) => [...old.filter((x) => x.key !== t.key && x.key !== p), moved]);
      setValuesByKey((v) => {
        const n = { ...v };
        delete n[p];
        if (fromPreset) delete n[t.key];
        return n;
      });
      setActiveKey(p);
      if (mainKey === t.key || !isLibrary(moved)) setMainKey(p);
      refreshFiles().catch(() => {});
      notify({ text: `Saved as “${voiceLabel(p)}” in this browser`, kind: "ok" });
    } catch (err) {
      fail({ text: `Save failed: ${(err as Error).message}`, kind: "error" });
    }
  };

  // ---- share link: the design (file + changed values, plus the text of a non-preset file).
  // The user's own pictures go along only with "Include picture"; otherwise a picture parameter
  // using one goes out as none.
  const share = async () => {
    track("feature", "share");
    const t = live.current.tabs.find((x) => x.key === mainKey);
    if (!t) return;
    const src = isRO(t) ? undefined : t.source;
    const vals = { ...live.current.values };
    delete vals.design_title; // the opening app sets it from the design's name
    const art = shareArt ? sharedArt(vals, src) : {};
    if (!shareArt) for (const [k, v] of Object.entries(imageRefs(vals, src))) if (isUserArt(v)) vals[k] = "";
    try {
      const link = await encodeShare({
        file: t.path ?? t.name,
        values: vals,
        ...(src === undefined ? {} : { source: src }),
        ...(Object.keys(art).length ? { art } : {}),
      });
      try {
        await navigator.clipboard.writeText(link);
        setShareLink(null);
        setCopied(true);
        clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopied(false), 2000);
        notify({
          text: `Link copied (${link.length} characters)`,
          short: "Link copied: paste it anywhere to share this design",
          kind: "ok",
        });
      } catch {
        setShareLink(link); // clipboard refused (e.g. plain http on the LAN): show it to copy by hand
      }
    } catch (err) {
      fail({ text: `Could not make a link: ${(err as Error).message}`, kind: "error" });
    }
  };

  // ---- Customizer parameters follow the main file (debounced).
  useEffect(() => {
    if (!ready || !target || !mainTab) return;
    const ac = new AbortController();
    const key = mainTab.key;
    const source = mainTab.source;
    const wait = paramsKeyRef.current === key ? 400 : 0; // no wait for a newly opened file, only while typing
    const t = setTimeout(async () => {
      try {
        const r = await api.params(target, ac.signal);
        setParams(r.parameters);
        setParamsKey(key);
        // values of parameters the file no longer has go (except Curves edits and their point lists)
        const names = new Set(r.parameters.map((p) => p.name));
        const lists = new Set(findPointLists(source).map((l) => l.name));
        const keep = (k: string) => names.has(k) || lists.has(k) || (k in POINT_VALUES && names.has(POINT_VALUES[k]));
        setValuesByKey((all) => {
          const v = all[key] ?? {};
          const kept = Object.fromEntries(Object.entries(v).filter(([k]) => keep(k)));
          return Object.keys(kept).length === Object.keys(v).length ? all : { ...all, [key]: kept };
        });
      } catch {
        // syntax errors etc. surface in the render log; keep the old panel meanwhile
      }
    }, wait);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- targetSig stands for target (and the main tab's text)
  }, [ready, targetSig]);

  // ---- auto-render: quick after a parameter change or a switch of main file, slower while typing.
  // The Render button and Auto live with the code: without it open, every change renders.
  const autoOn = auto || !coding;
  const lastMain = useRef("");
  useEffect(() => {
    if (!ready || !autoOn || !mainTab) return;
    const switched = lastMain.current !== mainTab.key;
    lastMain.current = mainTab.key;
    const t = setTimeout(render, switched ? 0 : 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- valuesSig stands for values
  }, [ready, autoOn, valuesSig, mainTab?.key, render]);
  // Text edits (in the main file or any file it may include). A switch of main file is covered above.
  const lastSig = useRef<{ key: string; sig: string } | null>(null);
  useEffect(() => {
    if (!ready || !autoOn || !mainTab) return;
    const prev = lastSig.current;
    lastSig.current = { key: mainTab.key, sig: targetSig };
    if (!prev || prev.key !== mainTab.key || prev.sig === targetSig) return;
    const t = setTimeout(render, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only text edits of the same main file
  }, [ready, autoOn, targetSig, render]);
  // A new quality re-renders straight at it (the shape is the same, so no draft first).
  const firstQuality = useRef(true);
  useEffect(() => {
    if (firstQuality.current) {
      firstQuality.current = false;
      return;
    }
    if (ready && (stl || svg)) renderPass(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on a change of quality
  }, [quality]);
  // The ligature turned on (or back to the mouthpiece): make it for the model on screen.
  useEffect(() => {
    if (!(ligView.on || ligView.reed) || !ligOK || !ready || !stl || !live.current.target) return;
    model.loadLigature(live.current.target, live.current.values, model.shownFn.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when it's turned on
  }, [ligView.on, ligView.reed, ligOK]);
  // The cap turned on: make it for the model on screen.
  useEffect(() => {
    if (!capView.on || !capOK || !ready || !stl || !live.current.target) return;
    model.loadCap(live.current.target, live.current.values, model.shownFn.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when it's turned on
  }, [capView.on, capOK]);
  // Another design: its own ligature comes with its first render.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- clearLigature only sets state
  useEffect(() => model.clearLigature(), [mainKey]);
  // The readouts in view without their reports for the model on screen (they were hidden, or it was
  // rendered before the file's parameters loaded): fetch them.
  useEffect(() => {
    if (ready && stl) model.ensureReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ensureReports reads the latest state itself
  }, [ready, reportsOn, stl]);

  // ---- A/B comparison
  const current: Snapshot | null =
    mainTab && target
      ? {
          name: mainTab.name,
          path: mainTab.path,
          source: mainTab.source,
          files: target.files,
          values,
          params,
          stl,
          air,
          summary,
          facing,
        }
      : null;

  // Renders a model on the side (for B); resolves with its params and mesh.
  const buildSnapshot = useCallback(async (base: Omit<Snapshot, "stl" | "params">): Promise<Snapshot> => {
    const t: RenderTarget = { path: base.path, name: base.name, source: base.source, files: base.files };
    const [pr, rr, fr] = await Promise.all([
      api.params(t),
      api.render(t, base.values),
      api.echo(t, { ...base.values, part: "facing_report" }).catch(() => null), // B's facing curve, for the chart
    ]);
    const fc = fr ? parseFacing(fr.log) : [];
    return {
      ...base,
      params: pr.parameters,
      stl: rr.ok && rr.kind === "3d" && rr.stl ? base64ToBuffer(rr.stl) : null,
      air: rr.ok ? parseAirVolume(rr.log) : null,
      summary: rr.ok ? parseSummary(rr.log) : null,
      facing: fc.length > 1 ? fc : null,
    };
  }, []);

  // A new B: open the Compare section (on a phone too).
  const showCompare = () => {
    setSectionsOpen(["d:compare"], true);
    if (isPhone) setPhonePanel("design");
  };
  // B pinned from the editor, named apart from A: the same design, as it was when pinned.
  const asPinned = (c: Snapshot): Snapshot => {
    const time = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return { ...c, label: `${c.label ?? (c.path ? voiceLabel(c.path) : c.name)} (pinned ${time})` };
  };
  const pinCurrent = () => {
    track("feature", "compare");
    if (!current) return;
    const b = asPinned({ ...current, values: { ...current.values }, files: { ...current.files } });
    // the model on screen is the quick draft: B gets its own full render (a draft B differs from A)
    if (shownDraft.current) {
      const { stl: _stl, params: _params, ...rest } = b;
      return void pinScad(b.label!, rest);
    }
    setPinned(b);
    showCompare();
  };
  // Renders a .scad as B.
  const pinScad = async (label: string, base: Omit<Snapshot, "stl" | "params">) => {
    try {
      notify({ text: `Rendering ${label} to compare with…`, kind: "busy" });
      setPinned(await buildSnapshot(base));
      showCompare();
      notify({ text: `Comparing with ${label}`, kind: "ok" });
    } catch (err) {
      fail({ text: `Could not compare with ${label}: ${(err as Error).message}`, kind: "error" });
    }
  };
  const sideFiles = () => live.current.target?.files ?? {};
  const pinProjectFile = async (p: string) => {
    const open = live.current.tabs.find((t) => t.key === p);
    const source = open
      ? open.source
      : await api
          .file(p)
          .then((r) => r.source)
          .catch(() => null);
    if (source === null) return fail({ text: `Could not open ${p}`, kind: "error" });
    // a preset compares as published
    pinScad(voiceLabel(p), {
      name: fileName(p),
      path: p,
      source,
      files: sideFiles(),
      values: readOnly.has(p) ? {} : (valuesByKey[p] ?? {}),
    });
  };
  // The design as it was (what Reset goes back to): a preset as published, your design as saved.
  const compareOriginal = () => {
    track("feature", "compare_original");
    const label = `${labelA} (original)`;
    pinScad(label, {
      name: mainTab.name,
      path: mainTab.path,
      label,
      source: mainTab.saved ?? mainTab.source,
      files: sideFiles(),
      values: {},
    });
  };
  const pinSource = (name: string, source: string, vals: Values) =>
    pinScad(name, { name, path: null, source, files: sideFiles(), values: vals });

  // An STL from this device as B: lined up with the model when it looks like a mouthpiece.
  const pinStl = async (file: File) => {
    try {
      notify({ text: `Reading ${file.name}…`, kind: "busy" });
      const buf = await file.arrayBuffer();
      const raw = readStl(buf);
      const design = toDesignFrame(raw);
      let zMax = -Infinity; // (a loop: spreading ~100k points into Math.max overflows the stack)
      if (design) for (const t of design) for (const v of t) if (v[2] > zMax) zMax = v[2];
      const len = design ? Math.round(zMax * 10) / 10 : null;
      setPinned({
        name: file.name,
        path: null,
        source: "",
        files: {},
        values: {},
        params: [],
        air: null,
        summary: len !== null ? { length: len, tip: null, facing: null, air: null, notes: [] } : null,
        stl: design ? null : buf,
        mesh: { tris: design ?? raw, aligned: !!design },
      });
      showCompare();
      notify(
        design
          ? {
              text: `Comparing with ${file.name}, lined up with the model (reed table down, shank end at the bottom)`,
              short: `Comparing with ${file.name}`,
              kind: "ok",
            }
          : {
              text: `Comparing with ${file.name} as uploaded: no reed table found to line it up`,
              short: `${file.name}: shown as uploaded`,
              kind: "ok",
            },
      );
    } catch (err) {
      fail({ text: `Could not read ${file.name}: ${(err as Error).message}`, kind: "error" });
    }
  };
  const stlInput = useRef<HTMLInputElement>(null);
  const scadCompareInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const clearB = () => setPinned(null);
  const pickCompare = (p: ComparePick) => {
    if (p.kind === "stl") stlInput.current?.click();
    else if (p.kind === "scad") scadCompareInput.current?.click();
    else if (p.kind === "file") pinProjectFile(p.path);
    else {
      const t = tabs.find((x) => x.key === p.key);
      if (t) pinSource(t.name, t.source, valuesByKey[t.key] ?? {});
    }
    setMenuOpen(false);
  };

  // A lined-up STL follows the model's print orientation (bore tilt, end-face lift).
  const meshB = pinned?.mesh;
  useEffect(() => {
    if (!meshB?.aligned || !target) return;
    const ac = new AbortController();
    const t = setTimeout(async () => {
      let frame: PrintFrame | null = null;
      try {
        frame = parseFrameEcho(
          (await api.echo({ ...target, source: target.source + FRAME_ECHO }, values, ac.signal)).log,
        );
      } catch {
        if (ac.signal.aborted) return; // otherwise: a plain file, shown in the design frame
      }
      const stlB = writeStl(toPrintFrame(meshB.tris, frame));
      setPinned((p) => (p && p.mesh === meshB ? { ...p, stl: stlB } : p));
    }, 400);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the signatures stand for target and values
  }, [meshB, targetSig, valuesSig]);

  // B becomes the design on screen, and the design B.
  const swap = async () => {
    if (!pinned || !current || pinned.mesh) return;
    const b = pinned;
    setPinned(asPinned(current));
    const key = b.path ?? `${LOCAL}${b.name}`;
    const onDisk = b.path
      ? await api
          .file(b.path)
          .then((r) => r.source)
          .catch(() => null)
      : null;
    setTabs((old) =>
      old.some((t) => t.key === key)
        ? old.map((t) => (t.key === key ? { ...t, source: b.source } : t))
        : [...old, { key, path: b.path, name: b.name, source: b.source, saved: b.path ? onDisk : null }],
    );
    setValuesByKey((v) => ({ ...v, [key]: b.values }));
    setActiveKey(key);
    setMainKey(key);
    model.showModel(b.stl);
  };

  // ---- console "→ file:line"
  const gotoRef = useRef<{ key: string; line: number } | null>(null);
  const goto = async (line: number, file: string | null) => {
    const tabsNow = live.current.tabs;
    const t = file ? tabsNow.find((x) => x.path === file || x.name === file) : tabsNow.find((x) => x.key === mainKey);
    if (t) {
      setActiveKey(t.key);
      setPhonePanel("code");
      gotoRef.current = { key: t.key, line };
    } else if (file && live.current.files.includes(file) && (await openProjectFile(file))) {
      gotoRef.current = { key: file, line };
    }
  };
  useEffect(() => {
    const g = gotoRef.current;
    if (g && g.key === activeKey) {
      gotoRef.current = null;
      setTimeout(() => editor.current?.gotoLine(g.line), 0);
    }
  });

  // ---- startup: the files, the last session's tabs, a shared design from the URL
  useEffect(() => {
    (async () => {
      api
        .health()
        .then((h) => setBackend(h.backend))
        .catch(() => setBackend("offline"));
      const listing = await refreshFiles().catch(() => ({ files: [] as string[], readOnly: [] as string[] }));
      const list = listing.files;
      const ro = new Set(listing.readOnly ?? []);
      const fetchFile = (p: string) =>
        api
          .file(p)
          .then((r) => r.source)
          .catch(() => null);
      const restored: Tab[] = [];
      const has = (k?: string) => !!k && restored.some((t) => t.key === k);
      for (const t of saved.tabs ?? []) {
        if (!t.path) {
          restored.push(t);
          continue;
        }
        const disk = await fetchFile(t.path);
        if (disk === null) continue; // gone from disk
        // presets are read-only: unsaved text kept from before (e.g. a broken curve edit) is dropped
        const keep = !ro.has(t.path) && t.source && t.source !== t.saved;
        restored.push({ ...t, saved: disk, source: keep ? t.source : disk });
      }
      // A shared design in the URL (#d=...) opens on top of whatever was open before.
      let shared: SharedDesign | null = null;
      try {
        shared = await readShare();
      } catch {
        fail({ text: "That design link is damaged or incomplete: opened the usual files instead", kind: "error" });
      }
      if (shared) clearShare();
      let sharedKey: string | null = null;
      if (shared && shared.source !== undefined) {
        const t = localTab(shared.file, shared.source, has);
        restored.push(t);
        sharedKey = t.key;
      } else if (shared && list.includes(shared.file)) {
        const p = shared.file;
        if (!has(p)) {
          const source = await fetchFile(p);
          if (source !== null) restored.push(projectTab(p, source));
        }
        if (has(p)) sharedKey = p;
      } else if (shared) {
        fail({ text: `The shared design's file ${shared.file} isn't here`, kind: "error" });
      }
      if (shared && sharedKey) {
        let v = shared.values;
        if (shared.art) {
          try {
            v = receiveArt(shared.art, v, shared.source) as Values;
          } catch (err) {
            fail({ text: `The design's picture couldn't be kept: ${(err as Error).message}`, kind: "error" });
          }
        }
        const k = sharedKey;
        setValuesByKey((all) => ({ ...all, [k]: v }));
      }
      if (!restored.length) {
        const p = list.includes(DEFAULT_FILE) ? DEFAULT_FILE : (list.find((f) => !f.startsWith("lib/")) ?? list[0]);
        const source = (p && (await fetchFile(p))) || "cube(10);\n";
        restored.push(p ? projectTab(p, source) : localTab("untitled1", source, () => false));
      }
      setTabs(restored);
      setActiveKey(sharedKey ?? (has(saved.activeKey) ? saved.activeKey! : restored[0].key));
      setMainKey(
        sharedKey ?? (has(saved.mainKey) ? saved.mainKey! : (restored.find((t) => !isLibrary(t)) ?? restored[0]).key),
      );
      if (saved.pinned)
        buildSnapshot({ ...saved.pinned, files: saved.pinned.files ?? {} })
          .then(setPinned)
          .catch(() => {});
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once
  }, []);

  // ---- global shortcuts: render (F5, F6, Ctrl+Enter), save (Ctrl+S)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F6" || e.key === "F5" || ((e.ctrlKey || e.metaKey) && e.key === "Enter")) {
        e.preventDefault();
        render();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const t = live.current.tabs.find((x) => x.key === activeKey);
        if (t) saveTab(t);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [render, saveTab, activeKey]);

  // ---- setting values
  const setValue = (n: string, initial: ParamValue | undefined, v: ParamValue | undefined) => {
    if (!mainTab) return;
    trackSetting(n);
    const key = mainTab.key;
    setValuesByKey((all) => {
      const next = { ...(all[key] ?? {}) };
      if (v === undefined || (initial !== undefined && JSON.stringify(v) === JSON.stringify(initial))) delete next[n];
      else next[n] = v;
      return { ...all, [key]: next };
    });
  };
  const history = useValueHistory(mainTab?.key ?? "", values, (key, v) =>
    setValuesByKey((all) => ({ ...all, [key]: v })),
  );

  if (!ready || !activeTab || !mainTab) return <div className="loading">Loading…</div>;

  // ---------------------------------------------------------------------------------------------
  // Everything below needs the tabs loaded.

  const editorWShown = Math.max(MIN_EDITOR_W, Math.min(editorW, winW * 0.45));
  const panelWShown = Math.max(MIN_PANEL_W, Math.min(panelW, winW * 0.5));
  const groups = groupFiles(files, readOnly, ownFiles);
  const labelOf = (s: { name: string; path: string | null; label?: string }) =>
    s.label ?? (s.path ? voiceLabel(s.path) : s.name);
  const labelA = labelOf(mainTab);
  const labelB = pinned ? labelOf(pinned) : undefined;

  // ---- downloads
  const downloadPart = async (what: PartWhat) => {
    if (dl?.state === "busy") return;
    const base = downloadName(mainTab, values, isRO(mainTab));
    const squeeze = Number("shank_clearance" in values ? values.shank_clearance : param("shank_clearance")?.initial);
    const name =
      what === "ring"
        ? ringFile(base, squeeze).replace(/\.stl$/, "")
        : what === "ligature" || what === "cap"
          ? `${base}_${what}`
          : what === "model" && otherPart
            ? `${base}_${otherPart}`
            : base;
    const mouthpiece = what === "mouthpiece" || (what === "model" && !otherPart);
    if (what === "model" && svg && !stl) {
      download(svg, "image/svg+xml", `${name}.svg`);
      setDl({ what, state: "done" });
      return;
    }
    setDl({ what, state: "busy" });
    notify({ text: `Making ${name}.stl for the download…`, short: "Preparing the download…", kind: "busy" });
    try {
      const stlData =
        what === "ring"
          ? await partStl("shank_test_ring", { shank_clearance: squeeze })
          : what === "ligature" || what === "cap"
            ? await partStl(what)
            : await partStl(what === "mouthpiece" && otherPart ? "mouthpiece" : null);
      download(stlData, "model/stl", `${name}.stl`);
      track(
        "download",
        mouthpiece
          ? "mouthpiece"
          : what === "ring"
            ? "shank_test_ring"
            : what === "model"
              ? (otherPart ?? "model")
              : what,
        {
          ...(mouthpiece && summary
            ? { tip: summary.tip, facing: summary.facing, length: summary.length, air: summary.air }
            : {}),
          settings: designNumbers(params, values),
        },
      );
      notify({ text: `Downloaded ${name}.stl`, short: "Downloaded", kind: "ok" });
      setDl({ what, state: "done" });
      if (mouthpiece) setPrinted(true);
    } catch (err) {
      fail({ text: `Download failed: ${(err as Error).message}`, kind: "error" });
      setDl({ what, state: "error" });
    }
  };
  // A download button's text: what it does, or how its download is going.
  const dlLabel = (what: Download["what"], label: string) =>
    dl?.what !== what ? (
      label
    ) : dl.state === "busy" ? (
      <>
        <span className="spinner btn-spinner" aria-hidden="true" /> Preparing…
      </>
    ) : dl.state === "done" ? (
      "✓ Downloaded"
    ) : (
      "Download failed"
    );
  const dlBusy = (what: Download["what"]) => dl?.what === what && dl.state === "busy";
  // The print kit, one zip: the mouthpiece, shank test rings at three cork squeezes (and the design's
  // own), the ligature if made, and a check card (printKit.ts).
  const downloadKit = async () => {
    if (dl?.state === "busy") return;
    const name = downloadName(mainTab, values, isRO(mainTab));
    const get = (n: string) => (n in values ? values[n] : param(n)?.initial);
    const withLigature = !!param("ligature_length") && get("ligature_made") === true;
    const withCap = !!param("cap_wall") && get("cap_made") === true;
    setDl({ what: "kit", state: "busy" });
    notify({ text: `Making the print kit for ${labelA}…`, short: "Preparing the print kit…", kind: "busy" });
    try {
      const out: [string, Uint8Array<ArrayBuffer>][] = [];
      out.push([`${name}.stl`, new Uint8Array(await partStl(otherPart ? "mouthpiece" : null))]);
      for (const c of kitSqueezes(Number(get("shank_clearance"))))
        out.push([ringFile(name, c), new Uint8Array(await partStl("shank_test_ring", { shank_clearance: c }))]);
      if (withLigature) out.push([`${name}_ligature.stl`, new Uint8Array(await partStl("ligature"))]);
      if (withCap) out.push([`${name}_cap.stl`, new Uint8Array(await partStl("cap"))]);
      const r = await kitReports();
      const card = checkCard({
        name,
        title: labelA,
        ...r,
        get,
        files: out.map(([f]) => f),
        date: new Date().toLocaleDateString("sv-SE"),
      });
      out.push([`${name}_check_card.txt`, new TextEncoder().encode(card)]);
      const s = parseSummary(r.log);
      track("download", "print_kit", {
        tip: s.tip,
        facing: s.facing,
        length: s.length,
        air: s.air,
        ligature: withLigature,
        cap: withCap,
        settings: designNumbers(params, values),
      });
      download(zipSync(Object.fromEntries(out)), "application/zip", `${name}_print_kit.zip`);
      notify({ text: `Downloaded ${name}_print_kit.zip`, short: "Downloaded", kind: "ok" });
      setDl({ what: "kit", state: "done" });
      setPrinted(true);
    } catch (err) {
      fail({ text: `Print kit failed: ${(err as Error).message}`, kind: "error" });
      setDl({ what: "kit", state: "error" });
    }
  };
  const kitOK = !!param("shank_clearance") && !noReadouts;
  const printKitButton = (
    <div className="lig-head print-kit">
      <p className="muted">
        Everything for a first print in one zip: the mouthpiece, shank test rings at cork squeeze 0.10 / 0.20 / 0.30 mm,
        the ligature if made, and a check card with the numbers to measure the print against.
      </p>
      <div className="lig-actions">
        <button onClick={downloadKit} disabled={!stl || dlBusy("kit")} aria-live="polite">
          {dlLabel("kit", "Download print kit (.zip)")}
        </button>
      </div>
    </div>
  );
  // One self-contained file of plain OpenSCAD (bundle.ts): the settings, then the generator.
  const fullScad = () =>
    bundleDesign({
      source: mainTab.source,
      path: mainTab.path,
      values: titled,
      // an open tab's unsaved text is what the model on screen uses
      readFile: async (p) => tabs.find((t) => t.path === p)?.source ?? (await api.file(p)).source,
      date: new Date().toLocaleDateString("sv-SE"), // YYYY-MM-DD, local
    });
  const downloadScad = async () => {
    track("download", "scad");
    const name = `${downloadName(mainTab, values, isRO(mainTab))}.scad`;
    notify({ text: `Making ${name}…`, short: "Preparing the download…", kind: "busy" });
    try {
      const text = await fullScad();
      download(text, "text/plain", name);
      notify({
        text: `Downloaded ${name} (self-contained, ${Math.round(text.length / 1024)} KB)`,
        short: `Downloaded ${name}`,
        kind: "ok",
      });
    } catch (err) {
      fail({ text: `Download failed: ${(err as Error).message}`, kind: "error" });
    }
  };

  // ---- Save as, for the design: build the chosen files from the design on screen first (its values
  // go with the tab once it is kept in the browser), then download them, then keep it.
  const opts = { ...SAVE_DEFAULTS, ...saveOpts };
  const ligatureFile = ligMade && values.part !== "ligature";
  const capFile = capMade && values.part !== "cap";
  const saveDesignAs = async (typed: string) => {
    track("feature", "save_as", { ...opts });
    const p = scadFileName(typed);
    if (!p) return fail({ text: "Save as: give the design a name", kind: "error" });
    const name = baseName(p);
    const out: [string, Uint8Array<ArrayBuffer>][] = [];
    const enc = new TextEncoder();
    try {
      if (wantsFiles(opts, ligMade, capMade))
        notify({ text: `Making the files for ${name}…`, short: "Preparing the files…", kind: "busy" });
      if (opts.full) out.push([`${name}.scad`, enc.encode(await fullScad())]);
      // settings-only: the voice file with these values; its include as the site resolves it
      if (opts.settings)
        out.push([
          `${name}_settings.scad`,
          enc.encode(withValues(mainTab.source, titled).replace(/include\s*<(\.\.\/)+lib\//, "include <lib/")),
        ]);
      if (opts.stl) out.push([`${name}${otherPart ? `_${otherPart}` : ""}.stl`, new Uint8Array(await partStl(null))]);
      if (opts.ligature && ligatureFile) out.push([`${name}_ligature.stl`, new Uint8Array(await partStl("ligature"))]);
      if (opts.cap && capFile) out.push([`${name}_cap.stl`, new Uint8Array(await partStl("cap"))]);
    } catch (err) {
      return fail({ text: `Save as failed: ${(err as Error).message}`, kind: "error" });
    }
    const zipped = out.length > 1 && opts.zip;
    if (zipped) download(zipSync(Object.fromEntries(out)), "application/zip", `${name}.zip`);
    else for (const [n, data] of out) download(data, n.endsWith(".stl") ? "model/stl" : "text/plain", n);
    const got = zipped ? `${name}.zip` : out.map(([n]) => n).join(", ");
    if (opts.browser) {
      await doSaveAs(p, mainTab);
      if (out.length)
        notify({
          text: `Saved as “${voiceLabel(p)}” in this browser; downloaded ${got}`,
          short: "Saved and downloaded",
          kind: "ok",
        });
    } else {
      setSaveAs(null);
      notify({ text: `Downloaded ${got}`, short: "Downloaded", kind: "ok" });
    }
  };

  // ---- the user's own design (unsaved, or kept in this browser): Save, Close, Delete
  const mainIsOwn = !mainTab.path || ownFiles.has(mainTab.path);
  const mainChanged = Object.keys(values).length > 0 || isDirty(mainTab);
  const deleteOwn = async (p: string) => {
    if (armedDelete !== p) {
      setArmedDelete(p);
      notify({
        text: `Delete “${voiceLabel(p)}” from this browser? Click Delete again (Save as… can download a copy first)`,
        short: `Click Delete again to delete “${voiceLabel(p)}”`,
        kind: "idle",
      });
      return;
    }
    setArmedDelete(null);
    try {
      await api.remove(p);
      const own = tabs.find((x) => x.key === p);
      if (mainKey === p) await replaceWithPreset(p, own?.source ?? "");
      else setTabs((old) => old.filter((x) => x.key !== p));
      dropValues(p);
      refreshFiles().catch(() => {});
      notify({ text: `Deleted “${voiceLabel(p)}” from this browser`, kind: "ok" });
    } catch (err) {
      fail({ text: `Delete failed: ${(err as Error).message}`, kind: "error" });
    }
  };

  // ---- the ligature
  const makeLigature = () => {
    track("feature", "ligature");
    setValue("ligature_made", false, true);
    setLig((l) => ({ ...l, on: true, reed: true }));
  };
  // ---- the cap
  const makeCap = () => {
    track("feature", "cap");
    setValue("cap_made", false, true);
    setCapV((c) => ({ ...c, on: true }));
  };

  // ---- the facing chart shapes the facing: tip opening, facing length and the Gauge model's points
  const range = (n: string, lo: number, hi: number): [number, number] => [param(n)?.min ?? lo, param(n)?.max ?? hi];
  const filePoints = (name: string) => findPointLists(mainTab.source).find((l) => l.name === name)?.pts;
  const modelParam = param("facing_model");
  const expParam = param("facing_exponent");
  const gaugePts = (values.facing_gauge_points as Pt[] | undefined) ?? filePoints("facing_gauge_points") ?? [];
  const facingEdit =
    modelParam && param("tip_opening") && param("facing_length")
      ? {
          gauge: (values.facing_model ?? modelParam.initial) === "gauge" && gaugePts.length ? gaugePts : null,
          tipRange: range("tip_opening", 0.5, 4.5),
          lengthRange: range("facing_length", 10, 45),
          onGauge: (pts: Pt[] | null) => {
            setValue("facing_model", modelParam.initial, pts ? "gauge" : "power");
            setValue("facing_gauge_points", undefined, pts ?? undefined);
          },
          onTip: (mm: number) => setValue("tip_opening", param("tip_opening")!.initial, mm),
          onLength: (mm: number) => setValue("facing_length", param("facing_length")!.initial, mm),
        }
      : undefined;
  // A few facing curves to pick from: "As designed" while none of the facing's values is changed.
  const facingPick =
    modelParam && expParam
      ? {
          current: !["facing_model", "facing_exponent", "facing_gauge_points"].some((k) => k in values)
            ? "file"
            : (FACING_CHOICES.find(
                (c) =>
                  c.model &&
                  c.model === (values.facing_model ?? modelParam.initial) &&
                  !("facing_gauge_points" in values) &&
                  (c.exponent === undefined || c.exponent === (values.facing_exponent ?? expParam.initial)),
              )?.id ?? null),
          onPick: (id: string) => {
            const c = FACING_CHOICES.find((x) => x.id === id);
            setValue("facing_gauge_points", undefined, undefined);
            setValue("facing_model", modelParam.initial, c?.model ?? modelParam.initial);
            setValue("facing_exponent", expParam.initial, c?.exponent ?? expParam.initial);
          },
        }
      : undefined;
  // A Curves edit: a point list as a value (undefined, or the file's own points: no value). The
  // facing's gauge points only act with facing_model = "gauge", so editing them switches to it
  // (and Reset or Clear goes back to the file's facing model).
  const setPointList = (name: string, pts: Pt[] | undefined) => {
    setValue(name, filePoints(name), pts);
    if (name === "facing_gauge_points" && modelParam)
      setValue("facing_model", modelParam.initial, pts?.length ? "gauge" : undefined);
  };

  // ---- pieces shared by the desktop and phone layouts
  const fileInputs = (
    <>
      <input
        ref={fileInput}
        type="file"
        accept=".scad"
        multiple
        hidden
        onChange={(e) => {
          for (const f of Array.from(e.target.files ?? [])) openLocalFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={stlInput}
        type="file"
        accept=".stl"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pinStl(f);
          e.target.value = "";
        }}
      />
      <input
        ref={scadCompareInput}
        type="file"
        accept=".scad"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) pinSource(f.name, migrateScad(await f.text()), {});
        }}
      />
    </>
  );
  const voicePicker = (
    <VoicePicker
      value={mainTab.key}
      groups={groups}
      edited={(k) => Object.keys(valuesByKey[k] ?? {}).some((n) => n !== "part")}
      // unsaved, library and other open files
      others={tabs.filter(
        (t) => (!isLibrary(t) || t.key === mainTab.key) && !(t.path && (readOnly.has(t.path) || ownFiles.has(t.path))),
      )}
      onPick={async (k) => {
        const prev = mainTab;
        if (tabs.some((t) => t.key === k)) {
          activate(k);
          setMainKey(k);
        } else if (!(await openProjectFile(k))) return;
        // k is now the main (and active) tab, so the untouched preset can go
        if (prev.key !== k && isRO(prev) && !isDirty(prev)) setTabs((old) => old.filter((t) => t.key !== prev.key));
      }}
    />
  );
  const compareSelect = (
    <CompareSelect
      groups={groups}
      unsaved={tabs.filter((t) => !t.path && t.key !== mainTab.key)}
      onPick={pickCompare}
    />
  );
  const openProjectSelect = (
    <select
      value=""
      onChange={(e) => {
        if (e.target.value) {
          openProjectFile(e.target.value);
          setMenuOpen(false);
        }
      }}
      title="Open one of the project's files (or your saved ones) in a new tab"
    >
      <option value="">Open project file…</option>
      {(
        [
          ["Presets", files.filter((f) => PRESETS.includes(f))],
          ["Variants", files.filter(isVariant)],
          ["Extras", files.filter(isExtra)],
          ["Your designs", files.filter((f) => ownFiles.has(f))],
          ["Generator", files.filter((f) => f === GENERATOR)],
        ] as [string, string[]][]
      ).map(
        ([group, fs]) =>
          fs.length > 0 && (
            <optgroup key={group} label={group}>
              {fs.map((f) => (
                <option key={f} value={f} title={f}>
                  {f === GENERATOR ? "Generator (mouthpiece_base.scad)" : voiceLabel(f)}
                </option>
              ))}
            </optgroup>
          ),
      )}
    </select>
  );
  const qualityOptions = (labels: Record<Quality, string>) =>
    (Object.keys(labels) as Quality[]).map((q) => (
      <option key={q} value={q}>
        {labels[q]}
      </option>
    ));
  // with the viewer's tools (desktop)
  const qualityDropdown = (
    <select
      value={quality}
      onChange={(e) => setQuality(e.target.value as Quality)}
      title={QUALITY_HINT}
      aria-label="Quality"
    >
      {qualityOptions({ draft: "Quality: Draft", normal: "Quality: Normal", fine: "Quality: Fine" })}
    </select>
  );
  // in the phone menu
  const qualitySelect = (
    <label className="quality" title={QUALITY_HINT}>
      Quality{" "}
      <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
        {qualityOptions({ draft: "Draft (fastest)", normal: "Normal", fine: "Fine (slowest)" })}
      </select>
    </label>
  );
  const shareArtToggle = Object.values(imageRefs(values, isRO(mainTab) ? undefined : mainTab.source)).some(
    isUserArt,
  ) && (
    <label
      className="share-art"
      title="Put your own picture in the share link, so it opens with it. Makes the link longer (a few thousand characters)."
    >
      <input type="checkbox" checked={shareArt} onChange={(e) => setShareArt(e.target.checked)} /> Include picture
    </label>
  );
  const revertButton = (
    <button
      onClick={() => revertTab(activeTab)}
      disabled={!isDirty(activeTab)}
      title="Discard this tab's unsaved changes (reload the file from disk)"
    >
      Revert
    </button>
  );
  const saveButton = (
    <button
      onClick={() => saveTab(activeTab)}
      disabled={isRO(activeTab) || (!!activeTab.path && !isDirty(activeTab))}
      title={
        activeTab.path && !ownFiles.has(activeTab.path)
          ? "Part of the project: Save makes your own copy (Save as…)"
          : "Save in this browser (Ctrl+S)"
      }
    >
      Save
    </button>
  );

  // Save as: with the code open, a name box for the file in the editor; otherwise the design's panel.
  const saveTarget = coding ? activeTab : mainTab;
  const saveAsButton = (
    <button
      className={saveAs !== null && !coding ? "active" : undefined}
      onClick={() => {
        if (saveAs !== null) return setSaveAs(null);
        const n = isRO(saveTarget)
          ? saveTarget.path!.replace(/([^/]+)$/, "my_$1")
          : (saveTarget.path ?? saveTarget.name);
        setSaveAs(coding ? n : baseName(n).replace(/_/g, " "));
      }}
      title={
        coding
          ? "Save your own copy of this file under a new name (kept in this browser)"
          : "Save this design under a new name: in this browser, and/or as files (.scad, STL, zipped or not)"
      }
    >
      Save as…
    </button>
  );
  const saveAsControl = !coding ? (
    <span className="save-as-wrap">
      {saveAsButton}
      {saveAs !== null && (
        <SaveAsPanel
          name={saveAs}
          onName={setSaveAs}
          opts={opts}
          onOpt={(k, v) => setSaveOpts((o) => ({ ...SAVE_DEFAULTS, ...o, [k]: v }))}
          partLabel={partName(values.part)}
          ligature={ligatureFile}
          cap={capFile}
          onSubmit={() => saveDesignAs(saveAs)}
          onCancel={() => setSaveAs(null)}
        />
      )}
    </span>
  ) : saveAs === null ? (
    saveAsButton
  ) : (
    <form
      className="save-as"
      onSubmit={(e) => {
        e.preventDefault();
        doSaveAs(saveAs, saveTarget);
      }}
    >
      <input
        autoFocus
        value={saveAs}
        placeholder="Name"
        aria-label="Name of the design"
        onChange={(e) => setSaveAs(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setSaveAs(null)}
      />
      <button type="submit">Save</button>
      <button type="button" onClick={() => setSaveAs(null)}>
        ✕
      </button>
    </form>
  );

  // The design's file actions: Save (your own design: its settings go into it), Save as… (always:
  // a preset or a variant becomes your own design), Open…, Close and Delete.
  const closeArmed = armedClose === mainTab.key;
  const deleteArmed = armedDelete === mainTab.path;
  const fileActions = (
    <span className="file-actions">
      {mainIsOwn && !mainTab.path && (
        <button
          onClick={() => doSaveAs(mainTab.name, mainTab)}
          title="Keep this design in this browser (it then shows under Your designs; only here: Save as… downloads a file to really keep it)"
        >
          Save
        </button>
      )}
      {mainIsOwn && mainTab.path && (
        <button
          onClick={() => saveTab(mainTab)}
          disabled={!mainChanged}
          title={
            mainChanged
              ? "Save your changes into this browser's copy (Ctrl+S). Only this browser has it: Save as… downloads a file"
              : "No changes since it was saved"
          }
        >
          Save
        </button>
      )}
      {!coding && saveAsControl}
      {!coding && (
        <button
          onClick={() => fileInput.current?.click()}
          title="Open a design (.scad) from this device: a Download .scad, or a file from OpenSCAD"
        >
          Open…
        </button>
      )}
      {mainIsOwn && (
        <button
          onClick={() => closeTab(mainTab.key)}
          className={closeArmed ? "armed" : undefined}
          title={closeArmed ? "Not saved: click again to discard it" : "Close this design"}
        >
          {closeArmed ? "Discard?" : "Close"}
        </button>
      )}
      {mainIsOwn && mainTab.path && (
        <button
          onClick={() => deleteOwn(mainTab.path!)}
          className={deleteArmed ? "armed" : undefined}
          title="Delete this design from this browser"
        >
          {deleteArmed ? "Delete?" : "Delete"}
        </button>
      )}
    </span>
  );

  const tabBar = (
    <TabBar
      tabs={tabs}
      activeKey={activeKey}
      mainKey={mainTab.key}
      armedClose={armedClose}
      isReadOnly={isRO}
      canClose={canClose}
      onActivate={activate}
      onClose={closeTab}
    />
  );
  const shownStatus = notice ?? status;
  const partsNote =
    !notice && status.kind === "ok" && model.partsBusy.length ? ` · updating ${model.partsBusy.join(" + ")}…` : "";
  const statusBar = (
    <div className={`status ${shownStatus.kind}`}>
      <span>{(coding ? shownStatus.text : (shownStatus.short ?? shownStatus.text)) + partsNote}</span>
      {coding && <span className="backend">{backend && `OpenSCAD · ${backend}`}</span>}
    </div>
  );
  // One quiet line on what the open file is: a design's settings, or the generator they feed.
  const fileNote =
    activeTab.path === GENERATOR ? (
      <div className="file-note">
        Builds every design. Its values are only defaults: each design's settings replace them.
      </div>
    ) : includesGenerator(activeTab.source) ? (
      <div className="file-note">
        Settings for {tabLabel(activeTab)}, as the sliders set them. Built by the{" "}
        <button className="link" onClick={() => openProjectFile(GENERATOR)}>
          Generator
        </button>
        .
      </div>
    ) : null;
  const editorEl = (
    <Editor
      ref={editor}
      docKey={activeTab.key}
      doc={activeTab.source}
      readOnly={isRO(activeTab)}
      onChange={updateSource}
      onRun={render}
    />
  );
  const consoleEl = <Console log={log} onGoto={goto} onClear={() => model.setLog("")} />;
  const gotIt = () => {
    setHintSeen(true);
    writeFlag(HINT_KEY);
  };
  // Phone: one short line, so the model stays in view.
  const hintEl =
    !hintSeen && isPhone ? (
      <div className="hint-card short">
        <span>
          <b>Design your own mouthpiece, free:</b> pick a voice, change the settings below, then download the STL.
        </span>
        <button onClick={gotIt}>Got it</button>
      </div>
    ) : (
      !hintSeen && (
        <div className="hint-card">
          <b>Design your own saxophone mouthpiece, free</b>
          <ol>
            <li>Pick a voice (soprano, alto, tenor, baritone).</li>
            <li>
              Adjust the tip, facing, chamber and baffle (sections on the left); the model and the readouts follow.
              {GLOSSARY_URL && (
                <>
                  {" "}
                  New to the words?{" "}
                  <a href={GLOSSARY_URL} target="_blank" rel="noreferrer">
                    Glossary
                  </a>
                </>
              )}
            </li>
            <li>
              Download the STL and print it
              {PRINTING_GUIDE_URL && (
                <>
                  {" "}
                  (see the{" "}
                  <a href={PRINTING_GUIDE_URL} target="_blank" rel="noreferrer">
                    printing guide
                  </a>
                  )
                </>
              )}
              . Share sends the design as a link.
            </li>
          </ol>
          <button onClick={gotIt}>Got it</button>
        </div>
      )
    );
  const viewerEl = (
    <Viewer
      stl={stl}
      svg={svg}
      compare={pinned?.stl ?? null}
      frameKey={`${mainTab.key}|${otherPart ?? ""}`}
      part={tab}
      fitKey={`${tab}|${tab === "ligature" ? !!model.ligStl : tab === "cap" ? !!model.capStl : ""}`}
      compact={isPhone}
      focus={focus}
      labelA={labelA}
      labelB={labelB}
      compareKey={pinned ? `${pinned.path ?? ""}|${pinned.name}` : undefined}
      onClearB={clearB}
      busy={status.kind === "busy" || notice?.kind === "busy"}
      busyLabel={
        dlBusy("ligature")
          ? "Making the ligature for download…"
          : dlBusy("cap")
            ? "Making the cap for download…"
            : dlBusy("model")
              ? "Making the STL for download…"
              : undefined
      }
      overlay={hintEl}
      quality={isPhone ? undefined : qualityDropdown}
      ligature={
        ligOK
          ? { on: ligView.on, beside: lig.beside, reedOn: ligView.reed, stl: model.ligStl, reed: model.reedStl }
          : null
      }
      onLigature={
        ligOK
          ? (c) => {
              if (c.on && !ligMade) makeLigature();
              setLig((l) => ({ ...l, ...c }));
            }
          : undefined
      }
      cap={capOK ? { on: capView.on, beside: capV.beside, stl: model.capStl } : null}
      showModel={ligOK || capOK ? showMp : undefined}
      onShowModel={ligOK || capOK ? setShowMp : undefined}
      onCap={
        capOK
          ? (c) => {
              if (c.on && !capMade) makeCap();
              setCapV((v) => ({ ...v, ...c }));
            }
          : undefined
      }
    />
  );
  const facingEl =
    !otherPart && summary && facing && facing.length > 1 && summary.tip !== null && summary.facing !== null ? (
      <FacingChart
        facing={facing}
        tip={summary.tip}
        length={summary.facing}
        edit={facingEdit}
        pick={facingPick}
        compare={pinned?.facing ? { facing: pinned.facing, label: labelB ?? "" } : undefined}
      />
    ) : null;
  // The side section (Chamber & baffle, Body & beak): the generator's mouthpiece only. Each
  // section's "Edit shape" drags its own lines (the generator's *_adjust offsets).
  const profileEl = (section: ShapeSection) =>
    !otherPart && stl && param("shank_clearance") ? (
      <div className={`design-facing${status.kind === "busy" ? " stale" : ""}`}>
        <ProfileChart
          stl={stl}
          final={!shownDraft.current}
          design={mainTab.key}
          sig={valuesSig}
          compare={
            pinned?.stl && (!pinned.mesh || pinned.mesh.aligned) ? { stl: pinned.stl, label: labelB ?? "" } : null
          }
          outside={section === "body"}
          edit={filePoints(LINES.top.param) ? { section, shape: model.shape, values, onSet: setPointList } : undefined}
        />
        {section === "body" && (
          <TipChart
            stl={stl}
            final={!shownDraft.current}
            design={mainTab.key}
            sig={valuesSig}
            compare={
              pinned?.stl && (!pinned.mesh || pinned.mesh.aligned) ? { stl: pinned.stl, label: labelB ?? "" } : null
            }
          />
        )}
      </div>
    ) : undefined;
  // Desktop: the readouts as a strip above the controls. Phone: the readouts are a tab of their own.
  const readoutsEl = otherPart ? (
    <PartNote part={otherPart} log={log} />
  ) : tab !== "mouthpiece" ? (
    <PartNote
      part={tab}
      log=""
      made={tab === "ligature" ? ligMade : capMade}
      ligInfo={model.ligInfo}
      capInfo={model.capInfo}
    />
  ) : (
    <Readouts
      summary={summary}
      wall={wall}
      busy={status.kind === "busy"}
      compact={!isPhone}
      compare={pinned ? { summary: pinned.summary ?? null, air: pinned.air ?? null } : null}
    />
  );
  // The part tabs: the mouthpiece, and the ligature and cap made from it (a dot once made). A part tab
  // shows the part on the mouthpiece, so it puts "What to print" back to the mouthpiece.
  const partTabs: { id: PartTab; label: string; made?: boolean }[] | undefined =
    param("ligature_length") || param("cap_wall")
      ? [
          { id: "mouthpiece", label: "Mouthpiece" },
          ...(param("ligature_length") ? [{ id: "ligature" as const, label: "Ligature", made: ligMade }] : []),
          ...(param("cap_wall") ? [{ id: "cap" as const, label: "Cap", made: capMade }] : []),
        ]
      : undefined;
  // Opening a tab sets the view for it, as a start (the toggles change it from there): the ligature's
  // tab shows the ligature without the cap; the cap's shows the cap and the printed ligature under it;
  // the mouthpiece's brings the mouthpiece back if it was hidden.
  const openPartTab = (t: PartTab) => {
    if (t !== "mouthpiece" && otherPart) setValue("part", "mouthpiece", undefined);
    if (t === "mouthpiece") {
      setShowMp(true);
      setCapV((v) => ({ ...v, on: false })); // its renders stop while the mouthpiece is edited
    }
    if (t === "ligature") {
      setLig((l) => ({ ...l, on: true }));
      setCapV((v) => ({ ...v, on: false }));
    }
    if (t === "cap") {
      setCapV((v) => ({ ...v, on: true }));
      if (capOverPrinted) setLig((l) => ({ ...l, on: true }));
    }
    setPartTab(t);
    if (t !== "mouthpiece") track("feature", `tab_${t}`);
  };
  const capHead = (
    <CapHead
      made={capMade}
      view={capV}
      info={model.capInfo}
      numbers={isPhone}
      alone={!showMp}
      onAlone={(a) => setShowMp(!a)}
      downloadLabel={dlLabel("cap", "Download cap STL")}
      downloading={dlBusy("cap")}
      onMake={makeCap}
      onView={(c) => setCapV((v) => ({ ...v, ...c }))}
      onDownload={() => downloadPart("cap")}
      onRemove={() => setValue("cap_made", false, undefined)}
    />
  );
  const ligHead = (
    <LigatureHead
      made={ligMade}
      view={lig}
      info={model.ligInfo}
      numbers={isPhone}
      alone={!showMp}
      onAlone={(a) => setShowMp(!a)}
      downloadLabel={dlLabel("ligature", "Download ligature STL")}
      downloading={dlBusy("ligature")}
      onMake={makeLigature}
      onView={(c) => setLig((l) => ({ ...l, ...c }))}
      onDownload={() => downloadPart("ligature")}
      onRemove={() => setValue("ligature_made", false, undefined)}
    />
  );
  // Going deeper, after the settings: the file's point lists, and A/B compare while a B is pinned.
  // Most shape changes are "Edit shape" on the side section (Body & beak, Chamber & baffle).
  const curvesEl = (
    <CurveEditor
      title={mainTab.path ?? mainTab.name}
      source={mainTab.source}
      target={target}
      values={values}
      visible
      compact={isPhone}
      onSetList={setPointList}
      onFocusList={focusOn}
    />
  );
  const compareEl = pinned && current && (
    <ComparePanel
      a={current}
      b={pinned}
      labelA={labelA}
      labelB={labelB ?? pinned.name}
      onSwap={swap}
      onClear={clearB}
      onUseB={(n, v) => setValue(n, param(n)?.initial, v)}
    />
  );
  const deeperEl = (
    <>
      <Fold id="d:curves" title="Exact points" summary={designOK ? "advanced: Edit shape is easier" : undefined}>
        {curvesEl}
      </Fold>
      {compareEl && (
        <Fold id="d:compare" title="Compare A/B" summary={`with ${labelB ?? pinned!.name}`}>
          {compareEl}
        </Fold>
      )}
    </>
  );
  // `only`: the desktop rail's pick (a section's title; "" = every setting, for a file that isn't the
  // generator's): no part tabs or deeper sections there, the rail has them.
  const designEl = (withReadouts: boolean, other?: React.ReactNode, only?: string, charts = false) => (
    <DesignPanel
      params={params}
      values={values}
      failed={status.kind === "error" && params.length === 0}
      loading={paramsKey !== mainTab.key}
      title={voiceLabel(mainTab.path ?? mainTab.name)}
      onChange={(n, v) => setValue(n, undefined, v)}
      onResetAll={() => setValuesByKey((all) => ({ ...all, [mainTab.key]: {} }))}
      onCompareOriginal={compareOriginal}
      zoom={zoom}
      onZoomChange={setZoom}
      onFocusParam={focusOn}
      readouts={withReadouts && !noReadouts ? readoutsEl : other}
      history={history}
      facing={
        facingEl ? (
          <div className={`design-facing${status.kind === "busy" ? " stale" : ""}`}>{facingEl}</div>
        ) : undefined
      }
      profile={profileEl}
      ligature={ligOK ? { on: ligMade, shown: lig.on, head: ligHead } : undefined}
      cap={capOK ? { on: capMade, head: capHead } : undefined}
      tab={tab}
      tabs={only === undefined ? partTabs : undefined}
      onTab={openPartTab}
      only={only || undefined}
      charts={charts}
      printKit={kitOK ? printKitButton : undefined}
      showNames={coding}
      deeper={only === undefined ? deeperEl : undefined}
      about={fileAbout(mainTab.source)}
      printed={printed ? () => setPrinted(false) : undefined}
      fitNote={
        kitOK && (
          <p className="fit-note muted">
            Check the fit first: a{" "}
            <button className="link" onClick={() => downloadPart("ring")} disabled={!stl || dlBusy("ring")}>
              shank test ring
            </button>{" "}
            prints in minutes and slides on your cork like the mouthpiece will. No calipers? The value here suits a
            typical neck; the ring shows if yours differs.
          </p>
        )
      }
    />
  );
  // The download follows the part tab: the ligature or the cap once made, else the model on screen.
  const dlWhat: "model" | "ligature" | "cap" =
    tab === "ligature" && ligMade ? "ligature" : tab === "cap" && capMade ? "cap" : "model";
  const downloadDisabled = (!stl && !svg) || dlBusy(dlWhat);
  const dlName = dlWhat === "model" ? (svg ? "SVG" : otherPart ? "STL" : "mouthpiece STL") : `${dlWhat} STL`;
  // The main button shows any download in progress (the menu closes when one starts).
  const dlMain = (label: string) =>
    dl?.state === "busy" && dl.what !== dlWhat ? dlLabel(dl.what, label) : dlLabel(dlWhat, label);
  // Everything there is to download, in one list (desktop: Download's ▾; phone: the ☰ menu).
  const squeezeNow = Number("shank_clearance" in values ? values.shank_clearance : param("shank_clearance")?.initial);
  const downloadItems = (close: () => void) => {
    const go = (fn: () => void) => () => {
      close();
      fn();
    };
    const item = (what: Download["what"], label: string, sub: string, fn: () => void, off = !stl) => (
      <button key={what} className="dl-item" onClick={go(fn)} disabled={off || dl?.state === "busy"}>
        <span>{label}</span>
        <small>{sub}</small>
      </button>
    );
    if (!kitOK)
      return [
        item(
          "model",
          `Model (.${svg && !stl ? "svg" : "stl"})`,
          "the model on screen",
          () => downloadPart("model"),
          !stl && !svg,
        ),
      ];
    return [
      item("mouthpiece", "Mouthpiece (.stl)", "placed standing on its shank end, as printed", () =>
        downloadPart("mouthpiece"),
      ),
      item(
        "ring",
        "Shank test ring (.stl)",
        `print it first to check the fit on your cork (squeeze ${squeezeNow.toFixed(2)} mm)`,
        () => downloadPart("ring"),
      ),
      ligMade &&
        item("ligature", "Ligature (.stl)", "the ring ligature made for this mouthpiece", () =>
          downloadPart("ligature"),
        ),
      capMade && item("cap", "Cap (.stl)", "the cap made for this mouthpiece", () => downloadPart("cap")),
      item(
        "kit",
        "Print kit (.zip)",
        "all of these, test rings at 0.10 / 0.20 / 0.30 squeeze, and a check card",
        downloadKit,
      ),
      <hr key="hr" />,
      <button key="scad" className="dl-item" onClick={go(downloadScad)}>
        <span>Design file (.scad)</span>
        <small>opens here again with Open…, or in OpenSCAD</small>
      </button>,
    ];
  };
  const downloadMenu = (
    <Menu
      label="▾"
      title="Everything to download: the test ring, the print kit, the ligature, the cap, the design file"
      className="dl-menu"
    >
      {(close) => <div className="menu-list">{downloadItems(close)}</div>}
    </Menu>
  );
  const shareBox = shareLink && (
    <div className="share-box">
      <span>Copy this link to share the design:</span>
      <input readOnly value={shareLink} autoFocus onFocus={(e) => e.target.select()} />
      <button onClick={() => setShareLink(null)} aria-label="Close">
        ✕
      </button>
    </div>
  );
  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (e.currentTarget === e.target) setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      for (const f of Array.from(e.dataTransfer.files)) {
        if (/\.stl$/i.test(f.name))
          pinStl(f); // an STL: compare with it (B)
        else openLocalFile(f);
      }
    },
  };
  const dropHint = dragging && (
    <div className="drop-hint">Drop .scad files to open them, or an .stl to compare with it</div>
  );
  const appClass = `app${coding ? "" : " design"}${dragging ? " dragging" : ""}`;
  const printingGuideLink = PRINTING_GUIDE_URL && (
    <a className="button" href={PRINTING_GUIDE_URL} target="_blank" rel="noreferrer">
      Printing guide
    </a>
  );
  const glossaryLink = GLOSSARY_URL && (
    <a className="button" href={GLOSSARY_URL} target="_blank" rel="noreferrer">
      Glossary (the words, with pictures)
    </a>
  );
  const sourceLink = REPO_URL && (
    <a className="button" href={REPO_URL} target="_blank" rel="noreferrer">
      Source code (GitHub)
    </a>
  );

  const rail = buildRail({
    selected: railSel,
    tools: !isPhone,
    designOK,
    ligOK,
    capOK,
    has: (n) => !!param(n),
    changed: (n) => n in values,
    ligMade,
    capMade,
    pinned: !!pinned,
    codeOpen,
    tab,
    select: setRailSel,
    toggleCode: () => setCodeOpen(!codeOpen),
    openPart: openPartTab,
    showDock: setDockTab,
    focusOn,
  });
  // ---- phone: viewer on top, one panel below (Design goes as deep as you open it; the code has its
  // own tabs), everything else in the ☰ menu
  if (isPhone) {
    // the code and the console: opened from the ☰ menu, with a way back to the design
    const panels: [typeof phonePanel, string][] = [
      ["code", "Code"],
      ["console", "Console"],
    ];
    const mpReadouts = designOK && tab === "mouthpiece" && !otherPart;
    const act = (fn: () => void) => () => {
      fn();
      setMenuOpen(false);
    };
    const pane = (k: typeof phonePanel, content: React.ReactNode, cls = "") => (
      <div className={`phone-pane${cls}${phonePanel === k ? "" : " hidden"}`}>{content}</div>
    );
    return (
      <div className={`${appClass} phone`} {...dropProps}>
        {fileInputs}
        <header className="phone-bar">
          <button
            className="menu-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            ☰
          </button>
          <span className="phone-brand" title="Open Mouthpiece">
            <Logo height={14} />
            <span className="name">Open Mouthpiece</span>
          </span>
          {voicePicker}
          {coding && !auto ? (
            <button className="primary" onClick={render}>
              Render
            </button>
          ) : (
            <button
              className="primary dl-button"
              onClick={() => setMenuOpen(true)}
              disabled={downloadDisabled}
              aria-live="polite"
              title={`Download the ${dlWhat === "model" ? "model" : dlWhat} to print`}
            >
              {dl?.state === "busy" ? dlMain("Download") : "Download"}
            </button>
          )}
        </header>
        {menuOpen && (
          <div className="phone-menu" onClick={(e) => e.target === e.currentTarget && setMenuOpen(false)}>
            <div className="phone-menu-body">
              <div className="phone-menu-brand">
                <Logo height={16} />
                <b>Open Mouthpiece</b>
                <button className="close" onClick={() => setMenuOpen(false)} aria-label="Close the menu">
                  ✕
                </button>
              </div>
              <div className="menu-heading">Download</div>
              {downloadItems(() => setMenuOpen(false))}
              <hr />
              {qualitySelect}
              {fileActions}
              <button onClick={act(share)}>Share this design (copy link)</button>
              {shareArtToggle}
              <hr />
              {compareSelect}
              <button onClick={act(pinCurrent)} disabled={!stl}>
                Pin this model as B (compare)
              </button>
              <button onClick={act(compareOriginal)} disabled={!stl}>
                Compare with the original
              </button>
              {printingGuideLink}
              {sourceLink}
              {DONATE_URL && (
                <a className="button donate" href={DONATE_URL} target="_blank" rel="noreferrer">
                  ♥ Support Open Mouthpiece (donate)
                </a>
              )}
              <details className="phone-look">
                <summary>About and help</summary>
                <Credits />
                <div className="phone-code-actions">
                  {glossaryLink}
                  {printingGuideLink}
                </div>
              </details>
              <details className="phone-look">
                <summary>Appearance</summary>
                <AppearancePanel />
              </details>
              <details className="phone-look">
                <summary>Code editor and files</summary>
                <div className="phone-code-actions">
                  <button onClick={act(() => setPhonePanel("code"))}>Code editor (OpenSCAD) and console</button>
                  {openProjectSelect}
                  {saveButton}
                  {coding && saveAsControl}
                  {revertButton}
                  <button onClick={act(() => download(activeTab.source, "text/plain", activeTab.name))}>
                    Download {activeTab.name} (as in the editor)
                  </button>
                  <label className="auto">
                    <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Re-render
                    automatically after code edits
                  </label>
                </div>
              </details>
            </div>
          </div>
        )}
        {shareBox}
        <section className="phone-viewer" style={{ flexBasis: `${phoneViewerH}dvh` }}>
          {viewerEl}
          {mpReadouts && (
            <div className="phone-readouts">
              <ReadoutLine
                summary={summary}
                wall={wall}
                busy={status.kind === "busy"}
                open={phoneReadouts}
                onToggle={() => setPhoneReadouts((o) => !o)}
              />
              {phoneReadouts && <div className="phone-readout-cards">{readoutsEl}</div>}
            </div>
          )}
          {statusBar}
        </section>
        <div
          className="phone-split"
          role="separator"
          aria-label="Drag to resize the view"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
            setPhoneViewerH(Math.min(85, Math.max(20, (e.clientY / window.innerHeight) * 100)));
          }}
          onPointerUp={() => {
            try {
              localStorage.setItem(PHONE_VIEW_KEY, String(Math.round(phoneViewerH)));
            } catch {
              // storage unavailable: the height just isn't remembered
            }
          }}
        />

        {phonePanel !== "design" && (
          <nav className="phone-tabs">
            <button className="back" onClick={() => setPhonePanel("design")}>
              ← Design
            </button>
            {panels.map(([k, label]) => (
              <button key={k} className={phonePanel === k ? "active" : ""} onClick={() => setPhonePanel(k)}>
                {label}
              </button>
            ))}
          </nav>
        )}
        <section className="phone-panel">
          {pane(
            "design",
            designEl(
              false,
              mpReadouts && summary?.notes.length ? <Notes notes={summary.notes} /> : undefined,
              rail.sections.length ? (rail.section?.title ?? "") : undefined,
              true,
            ),
          )}
          {pane(
            "code",
            <>
              {tabBar}
              {fileNote}
              {editorEl}
            </>,
            " code",
          )}
          {pane("console", consoleEl)}
        </section>
        {phonePanel === "design" && rail.sections.length > 0 && (
          <Rail items={rail.items.filter((i) => !i.group)} onPick={rail.pick} horizontal />
        )}
        {dropHint}
      </div>
    );
  }

  // ---- desktop: the viewer and the panel (as deep as you open it); the code column on the left
  // when opened (the "Code" strip, or More ▾)
  const menuAction = (close: () => void, fn: () => void) => () => {
    close();
    fn();
  };
  const moreMenu = (
    <Menu label="More ▾" title="Compare, the code editor">
      {(close) => (
        <div className="menu-list">
          <div className="menu-item" onChange={close}>
            {compareSelect}
          </div>
          <button
            onClick={menuAction(close, pinCurrent)}
            disabled={!stl}
            title="Freeze the current model and its settings as B, to compare against while you change things"
          >
            Pin this model as B (compare)
          </button>
          <button
            onClick={menuAction(close, compareOriginal)}
            disabled={!stl}
            title="Compare with the design as it was: a preset as published, your design as saved"
          >
            Compare with the original
          </button>
          {coding && (
            <button onClick={menuAction(close, () => fileInput.current?.click())}>Open .scad from this device…</button>
          )}
          <button onClick={menuAction(close, () => setCodeOpen(!codeOpen))}>
            {codeOpen ? "Hide the code editor" : "Show the code editor (OpenSCAD) and console"}
          </button>
          {printingGuideLink}
          {sourceLink}
        </div>
      )}
    </Menu>
  );
  const toolPanel = (title: string, body: React.ReactNode) => (
    <div className="design-panel">
      {!noReadouts && readoutsEl}
      <div className="tool-head">{title}</div>
      <div className="design-scroll tool-body">{body}</div>
    </div>
  );
  const railPanel =
    rail.now === "compare"
      ? toolPanel(
          "Compare A/B",
          <>
            {compareEl || (
              <p className="muted">
                Pin a design as B to compare it with the one you're changing: the view, the charts and the readouts show
                both.
              </p>
            )}
            <div className="tool-actions">
              <button onClick={pinCurrent} disabled={!stl} title="Freeze the current model and its settings as B">
                Pin this model as B
              </button>
              <button
                onClick={compareOriginal}
                disabled={!stl}
                title="The design as it was: a preset as published, your design as saved"
              >
                Compare with the original
              </button>
              <div className="menu-item">{compareSelect}</div>
            </div>
          </>,
        )
      : rail.now === "points"
        ? toolPanel("Exact points", curvesEl)
        : rail.now === "about"
          ? toolPanel(
              "About",
              <>
                <Credits />
                <div className="tool-actions">
                  {glossaryLink}
                  {printingGuideLink}
                  {sourceLink}
                </div>
              </>,
            )
          : designEl(true, undefined, rail.section?.title ?? "");
  // The dock's charts (the mouthpiece's, on every part's tab: the layout stays put).
  const bodyChart = profileEl("body"),
    chamberChart = profileEl("chamber");
  const dockTabs = (
    [
      facingEl && {
        id: "facing",
        label: "Facing curve",
        content: <div className={`design-facing${status.kind === "busy" ? " stale" : ""}`}>{facingEl}</div>,
      },
      bodyChart && { id: "body", label: "Outside", content: bodyChart },
      chamberChart && { id: "chamber", label: "Inside", content: chamberChart },
    ] as (DockTab | false | null | undefined)[]
  ).filter((t): t is DockTab => !!t);
  return (
    <TextVariables.Provider value={textVars}>
      <div className={appClass} {...dropProps}>
        {fileInputs}
        <header className="toolbar">
          <strong className="brand">
            <Logo />
            Open Mouthpiece
          </strong>
          {voicePicker}
          {fileActions}
          <span className="spacer" />
          {DONATE_URL && (
            <a
              className="donate-link"
              href={DONATE_URL}
              target="_blank"
              rel="noreferrer"
              title="Open Mouthpiece is free, with no ads or accounts. A donation helps keep it that way."
            >
              ♥ Support
            </a>
          )}
          {shareArtToggle}
          <button onClick={share} title="Copy a link that opens this design" aria-live="polite">
            {copied ? "Copied ✓" : "Share"}
          </button>
          <div className="dl-split">
            <button
              className="primary dl-button"
              disabled={downloadDisabled}
              onClick={() => downloadPart(dlWhat)}
              title={`Download the ${dlWhat === "model" ? "model" : dlWhat} to print`}
              aria-live="polite"
            >
              {dlMain(`Download ${dlName}`)}
            </button>
            {downloadMenu}
          </div>
          {moreMenu}
          <AppearanceMenu />
        </header>
        {shareBox}
        <Workspace
          rail={rail.items}
          onPick={rail.pick}
          codeOpen={codeOpen}
          code={
            <>
              <div className="filebar">
                <button
                  className="hide-code"
                  onClick={() => setCodeOpen(false)}
                  title="Hide the code editor and console (more room for the model)"
                  aria-label="Hide the code editor"
                >
                  ‹
                </button>
                {openProjectSelect}
                {saveButton}
                {saveAsControl}
                {revertButton}
                <button
                  onClick={() => download(activeTab.source, "text/plain", activeTab.name)}
                  title="Download this tab's text as it is in the editor"
                >
                  Download tab
                </button>
                <span className="spacer" />
                <label className="auto" title="Re-render automatically after edits">
                  <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto
                </label>
                <button className={auto ? "" : "primary"} onClick={render} title="Render (F6 / Ctrl+Enter)">
                  Render
                </button>
              </div>
              {tabBar}
              {fileNote}
              {editorEl}
              {consoleEl}
            </>
          }
          editorW={editorWShown}
          panelW={panelWShown}
          setEditorW={setEditorW}
          setPanelW={setPanelW}
          panel={railPanel}
          view={
            <>
              {viewerEl}
              {statusBar}
            </>
          }
          dock={
            <ShapeDock
              tabs={dockTabs}
              active={dockTab}
              open={dockOpen}
              big={dockBig}
              onBig={setDockBig}
              onActive={setDockTab}
              actions={
                dockTab === "chamber" &&
                param("baffle_height") && (
                  <button className="link" onClick={() => focusOn("baffle_height")} disabled={!zoom}>
                    {zoom ? "Cut the view open to see the inside" : "Turn on Auto-zoom (⋯) to cut the view open"}
                  </button>
                )
              }
              onOpen={setDockOpen}
            />
          }
        />
        {dropHint}
      </div>
    </TextVariables.Provider>
  );
}
