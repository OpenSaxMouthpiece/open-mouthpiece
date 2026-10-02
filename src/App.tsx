// Open Mouthpiece: tabbed editor + Customizer + 3D viewer + console, rendering with OpenSCAD
// in the browser (WebAssembly, Manifold backend; no server). Works with any .scad source, and with
// multi-file projects: every render sees the unsaved text of all open project files, so editing an
// included base file re-renders the file that includes it.
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
import { DesignPanel } from "./components/DesignPanel";
import { FacingChart } from "./components/FacingChart";
import { Notes, Readouts } from "./components/Readouts";
import { renderEnded, renderStarted, report, setReportContext } from "./report";
import { parseAirVolume, type Snapshot } from "./compare";
import { FOCUS_ECHO, parseFocusEcho, toRequest, type FocusData, type FocusRequest } from "./focus";
import {
  FRAME_ECHO,
  parseFrameEcho,
  readStl,
  toDesignFrame,
  toPrintFrame,
  writeStl,
  type PrintFrame,
} from "./meshFrame";
import { FACING_CHOICES, hasDesignParams } from "./design";
import { parseClearance, parseFacing, parseLigature, parseSummary, type LigatureInfo } from "./readouts";
import { findPointLists, type Pt } from "./curves";
import { clearShare, encodeShare, readShare, type SharedDesign } from "./share";
import { migrateScad, migrateValues } from "./migrate";
import { imageRefs, isUserArt, receiveArt, sharedArt } from "./userArt";
import { DONATE_URL, PRINTING_GUIDE_URL } from "./links";
import { Menu } from "./components/Menu";
import { AppearanceMenu, AppearancePanel } from "./components/AppearanceMenu";
import { Fold } from "./components/Fold";
import { setSectionsOpen, usePref } from "./uiPrefs";

const STORE_KEY = "open-mouthpiece-session-v1";
const OLD_STORE_KEY = "scad-playground-v2"; // read once, then removed on the next save
const HINT_KEY = "open-mouthpiece-hint-v1";
const DEFAULT_FILE = "alto.scad";
const PRESETS = ["alto.scad", "tenor.scad", "baritone.scad", "soprano.scad"];

// An open file. Project files (from the site's project/) are read-only; the user's own files
// ("Save as…") are kept in this browser; files from the computer ("local") until saved.
interface Tab {
  key: string; // the path for project files, "local:<name>" otherwise
  path: string | null;
  name: string;
  source: string;
  saved: string | null; // text on disk (project files), for the modified marker
}

type Values = Record<string, ParamValue>;
const NO_VALUES: Values = {};
// Point lists set as values (the Customizer can't show them), kept while the parameter that uses
// them is there: the facing chart's gauge points (facing_model = "gauge").
const POINT_VALUES: Record<string, string> = { facing_gauge_points: "facing_model" };
const STL_CHOICE = "*stl"; // the compare menu's "STL file…" and ".scad file…" (not file names)
const SCAD_CHOICE = "*scad";

// Render quality = the model's render_fn (points per ring, rings per mm), for files that declare
// it and when the user hasn't set it in the Customizer. A change renders a quick draft first and
// the chosen quality once the user pauses (a newer change cancels it), so dragging only ever runs
// drafts. Downloads are never drafts: at Draft quality they are made at Normal.
type Quality = "draft" | "normal" | "fine";
const QUALITY_FN: Record<Quality, number> = { draft: 32, normal: 64, fine: 96 };
const REFINE_DELAY = 700; // ms of quiet after a draft before the full-quality render
// The readouts' reports (echo only, no geometry) ride along with a design's full-quality render:
// one OpenSCAD run instead of three (each run evaluates the whole generator again).
const REPORTS_ECHO = "\nfacing_report();\nclearance_report();\n";
// ...and their lines stay out of the console.
const withoutReports = (log: string) =>
  log
    .split("\n")
    .filter((l) => !/^ECHO: (PARAM_FOCUS|"(FACING|CLEARANCE))/.test(l))
    .join("\n");

interface Saved {
  tabs: Tab[];
  activeKey: string;
  mainKey: string;
  valuesByKey: Record<string, Values>;
  auto: boolean;
  zoom: boolean;
  editorW: number;
  pinned: Omit<Snapshot, "stl" | "params"> | null; // re-rendered on load
  quality: Quality;
  ligature?: { on: boolean; beside: boolean; reed?: boolean }; // the ligature / a reed shown on the model
}

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
function writeFlag(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* storage unavailable: the hint just comes back */
  }
}

function loadSaved(): Partial<Saved> {
  try {
    const s = JSON.parse(
      localStorage.getItem(STORE_KEY) ?? localStorage.getItem(OLD_STORE_KEY) ?? "{}",
    ) as Partial<Saved>;
    // designs from before the parameter renames (migrate.ts)
    if (s.tabs)
      s.tabs = s.tabs.map((t) => ({
        ...t,
        source: migrateScad(t.source),
        saved: t.saved === null ? null : migrateScad(t.saved),
      }));
    if (s.valuesByKey)
      s.valuesByKey = Object.fromEntries(Object.entries(s.valuesByKey).map(([k, v]) => [k, migrateValues(v)]));
    return s;
  } catch {
    return {};
  }
}

function download(data: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// True while the media query matches (e.g. a phone-sized screen); follows rotation/resizes.
function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

const isDirty = (t: Tab) => t.saved !== null && t.source !== t.saved;
const isLibrary = (t: Tab) => !!t.path && t.path.startsWith("lib/");
const baseName = (n: string) =>
  n
    .split("/")
    .pop()!
    .replace(/\.scad$/i, "");
// Save as for a design: what it makes (remembered in this browser).
type SaveOpts = { browser: boolean; full: boolean; settings: boolean; stl: boolean; ligature: boolean; zip: boolean };
const SAVE_DEFAULTS: SaveOpts = { browser: true, full: true, settings: false, stl: false, ligature: false, zip: false };
// The part the design makes, for "… STL" in Save as.
const partName = (part: unknown) =>
  typeof part !== "string" || part === "mouthpiece"
    ? "Mouthpiece"
    : (part.charAt(0).toUpperCase() + part.slice(1)).replace(/_/g, " ");
// The ligature's numbers in a sentence (after the section's or the part's text).
const ligLine = (g: LigatureInfo | null) =>
  g
    ? ` Inside ${g.rear[0].toFixed(1)} × ${g.rear[1].toFixed(1)} mm at the back, ${g.girth.toFixed(1)} mm around; front edge ${g.front >= 0 ? `${g.front} mm behind` : `${-g.front} mm over`} the window's end.${g.touch ? ` It touches the reed ${g.touch.toFixed(1)} mm before this; push it the rest of the way to grip.` : ""}${g.shift !== null ? ` A reed 0.1 mm thicker seats it ${g.shift.toFixed(1)} mm further forward.` : ""}`
    : "";
// A name typed for Save as -> a file name the browser store takes: spaces become "_", other odd
// characters go, ".scad" is added. "" when nothing usable is left.
const scadFileName = (typed: string) => {
  const n = typed
    .trim()
    .replace(/^\/+/, "")
    .replace(/\.scad$/i, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w./-]/g, "")
    .split("/")
    .filter((s) => s && s !== "." && s !== "..")
    .join("/");
  return n ? `${n}.scad` : "";
};
// The Ash/Birch/Cedar variants of the presets (scad/variants/<voice>_<family>.scad): "Alto Ash".
const isVariant = (p: string) => /^variants\/[^/]+\.scad$/.test(p);
const titleCase = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
// For error reports: a preset's or variant's path, or just "own design" (never the user's file name).
const reportDesign = (p: string | null) => (p && (PRESETS.includes(p) || isVariant(p)) ? p : "own design");
const SLOW_RENDER_S = 45;
const voiceLabel = (p: string) =>
  PRESETS.includes(p)
    ? titleCase(baseName(p))
    : isVariant(p)
      ? baseName(p).split("_").map(titleCase).join(" ")
      : baseName(p).replace(/_/g, " ");

export default function App() {
  const saved = useRef(loadSaved()).current;
  const editor = useRef<EditorHandle>(null);

  const [ready, setReady] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeKey, setActiveKey] = useState("");
  const [mainKey, setMainKey] = useState("");
  const [valuesByKey, setValuesByKey] = useState<Record<string, Values>>(saved.valuesByKey ?? {});
  const [files, setFiles] = useState<string[]>([]);
  const [readOnly, setReadOnly] = useState<Set<string>>(new Set()); // presets: open and try, "Save as…" to change
  // A download in progress or just finished, shown on its button (the render takes a few seconds).
  const [dl, setDl] = useState<{ what: "model" | "ligature"; state: "busy" | "done" | "error" } | null>(null);
  useEffect(() => {
    if (!dl || dl.state === "busy") return;
    const t = setTimeout(() => setDl(null), dl.state === "done" ? 3000 : 5000);
    return () => clearTimeout(t);
  }, [dl]);
  const [ownFiles, setOwnFiles] = useState<Set<string>>(new Set()); // the user's saved files (in this browser)
  const [backend, setBackend] = useState("");

  const [params, setParams] = useState<ScadParam[]>([]);
  const [auto, setAuto] = useState(saved.auto ?? true);
  const [zoom, setZoom] = useState(saved.zoom ?? true);
  const [quality, setQuality] = useState<Quality>(saved.quality ?? "normal");
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const [editorW, setEditorW] = useState(saved.editorW ?? Math.round(window.innerWidth * 0.36));
  const [panelW, setPanelW] = usePref("panelW", 380); // the right panel (drag its edge)
  const [codeOpen, setCodeOpen] = usePref("codeOpen", false); // the code editor + console column (desktop), closed by default
  const [winW, setWinW] = useState(window.innerWidth);

  const [stl, setStl] = useState<ArrayBuffer | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [log, setLog] = useState("");
  // text = the full line (shown with the code open); short = the plain version, when different
  const [status, setStatus] = useState<{ text: string; short?: string; kind: "idle" | "busy" | "ok" | "error" }>({
    text: "",
    kind: "idle",
  });
  // Errors go to the site's log (src/report.ts), with the render's first OpenSCAD error line.
  useEffect(() => {
    if (status.kind === "error")
      report("error", status.text, { openscad: /^ERROR: .*$/m.exec(log)?.[0]?.slice(0, 300) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.kind, status.text]);

  // The first-visit hint card, until dismissed.
  const [hintSeen, setHintSeen] = useState(() => readFlag(HINT_KEY));
  const [shareLink, setShareLink] = useState<string | null>(null); // shown when the clipboard refuses
  // Readouts: from the render log, plus the echo-only facing / clearance reports.
  const [facing, setFacing] = useState<[number, number][] | null>(null);
  const [wall, setWall] = useState<{ wall: number; where: string } | null>(null);
  const summary = useMemo(() => (log ? parseSummary(log) : null), [log]);

  const [air, setAir] = useState<number | null>(null); // inside air volume of the last render
  // The ligature made for the model: shown on it (or beside it) in the viewer, with a model reed.
  // How the ligature is shown (a view setting); whether one is made is the design's ligature_made.
  const [lig, setLig] = useState<{ on: boolean; beside: boolean; reed: boolean }>({
    on: true,
    beside: false,
    reed: false,
    ...saved.ligature,
  });
  const [ligStl, setLigStl] = useState<ArrayBuffer | null>(null);
  const [reedStl, setReedStl] = useState<ArrayBuffer | null>(null);
  const [ligInfo, setLigInfo] = useState<LigatureInfo | null>(null);
  const [pinned, setPinned] = useState<Snapshot | null>(null); // model B
  const [saveAs, setSaveAs] = useState<string | null>(null); // inline "Save as" path while open
  // What Save as makes (remembered): kept in this browser, and/or downloaded files, zipped or not.
  const [saveOpts, setSaveOpts] = usePref<SaveOpts>("saveAs", SAVE_DEFAULTS);
  const [armedClose, setArmedClose] = useState<string | null>(null);
  const [armedDelete, setArmedDelete] = useState<string | null>(null); // Delete of a saved design, armed (second click deletes)

  // Phone/tablet layout: viewer on top, one panel below (parameters / code / console / compare).
  const isPhone = useMediaQuery("(max-width: 1024px)"); // phones and portrait tablets
  const [phonePanel, setPhonePanel] = useState<"design" | "readouts" | "code" | "console">("design");
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (isPhone && phonePanel === "code") setTimeout(() => editor.current?.refresh(), 0); // CodeMirror re-measures once visible
  }, [isPhone, phonePanel]);
  useEffect(() => {
    if (codeOpen) setTimeout(() => editor.current?.refresh(), 0); // the code column shown again
  }, [codeOpen]);
  // "Deep" work (editing code): on a phone the Code tab, on a desktop the open code column. Without
  // it the app keeps to the design on screen: always re-renders, saves that design.
  const coding = isPhone ? phonePanel === "code" || phonePanel === "console" : codeOpen;

  const activeTab = tabs.find((t) => t.key === activeKey) ?? tabs[0];
  const mainTab = tabs.find((t) => t.key === mainKey) ?? activeTab;
  const values = (mainTab && valuesByKey[mainTab.key]) ?? NO_VALUES;
  useEffect(
    () => setReportContext({ design: reportDesign(mainTab?.path ?? null), changed: Object.keys(values) }),
    [mainTab?.path, values],
  );
  // Another part than the mouthpiece (the shank test ring): the mouthpiece's readouts don't apply.
  const otherPart = typeof values.part === "string" && values.part !== "mouthpiece" ? values.part : null;

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

  // Latest state for async callbacks.
  // A file without the Design screen's parameters (a scratch file) gets the plain Customizer instead.
  const designOK = useMemo(() => hasDesignParams(params.map((p) => p.name)), [params]);
  const reportsOn = designOK && (!isPhone || phonePanel === "design" || phonePanel === "readouts");
  // The file has the ligature's settings (a mouthpiece made by the generator), and the mouthpiece is what's shown.
  const ligOK = params.some((p) => p.name === "ligature_length") && !otherPart;
  // A ligature is made when the design says so (ligature_made: kept in saves, downloads and links).
  const ligMade =
    ligOK &&
    ("ligature_made" in values ? values.ligature_made : params.find((p) => p.name === "ligature_made")?.initial) ===
      true;
  const ligView = { ...lig, on: ligMade && lig.on };
  const live = useRef({
    target,
    values,
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
  });
  live.current = {
    target,
    values,
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
  };
  const isRO = (t: Tab | undefined) => !!t?.path && readOnly.has(t.path);

  // ---- window width (the saved editor width may come from a bigger window)
  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const editorWShown = Math.max(260, Math.min(editorW, winW * 0.45));
  const panelWShown = Math.max(320, Math.min(panelW, winW * 0.5));

  // ---- persistence (sources of project files are only kept while modified)
  useEffect(() => {
    if (!ready) return;
    try {
      const pin =
        pinned && !pinned.mesh
          ? { name: pinned.name, path: pinned.path, source: pinned.source, files: pinned.files, values: pinned.values }
          : null;
      const keptTabs = tabs.map((t) => (t.path && !isDirty(t) ? { ...t, source: "", saved: "" } : t));
      localStorage.removeItem(OLD_STORE_KEY);
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({
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
        } satisfies Saved),
      );
    } catch {
      // storage unavailable or full: fine, nothing to persist
    }
  }, [ready, tabs, activeKey, mainKey, valuesByKey, auto, zoom, editorW, pinned, quality, lig]);

  // ---- tabs
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
        const { source } = await api.file(p);
        openTab({ key: p, path: p, name: p.split("/").pop()!, source, saved: source });
        return true;
      } catch (err) {
        setStatus({ text: `Could not open ${p}: ${(err as Error).message}`, kind: "error" });
        return false;
      }
    },
    [activate, openTab],
  );

  const openLocalFile = useCallback(
    async (file: File) => {
      const source = migrateScad(await file.text());
      let key = `local:${file.name}`;
      for (let i = 2; live.current.tabs.some((t) => t.key === key); i++)
        key = `local:${baseName(file.name)} (${i}).scad`;
      openTab({ key, path: null, name: key.slice(6), source, saved: null });
    },
    [openTab],
  );

  const newFile = () => {
    let n = 1;
    while (live.current.tabs.some((t) => t.key === `local:untitled${n}.scad`)) n++;
    openTab({
      key: `local:untitled${n}.scad`,
      path: null,
      name: `untitled${n}.scad`,
      source: "cube(10);\n",
      saved: null,
    });
  };

  const closeTab = (key: string) => {
    const t = tabs.find((x) => x.key === key);
    if (!t) return;
    if ((isDirty(t) || (t.path === null && t.source.trim() !== "")) && armedClose !== key) {
      setArmedClose(key); // first click on a tab with unsaved text arms, second closes
      setStatus({
        text: `${t.name} isn't saved: close it again to discard it (or Save it first)`,
        short: `Close again to discard ${t.name}`,
        kind: "idle",
      });
      return;
    }
    setArmedClose(null);
    const rest = tabs.filter((x) => x.key !== key);
    setTabs(rest);
    if (activeKey === key && rest.length) activate(rest[rest.length - 1].key, rest);
    if (mainKey === key) setMainKey(rest.find((x) => !isLibrary(x))?.key ?? rest[0]?.key ?? "");
  };

  const updateSource = useCallback((key: string, text: string) => {
    if (live.current.readOnly.has(key)) return; // presets (project files are keyed by path)
    setTabs((old) => old.map((t) => (t.key === key && t.source !== text ? { ...t, source: text } : t)));
  }, []);

  // ---- saving
  const saveTab = useCallback(async (t: Tab) => {
    if (!t.path) {
      setSaveAs(t.name.endsWith(".scad") ? t.name : `${t.name}.scad`);
      return;
    }
    if (!live.current.ownFiles.has(t.path)) {
      setSaveAs(t.path.replace(/([^/]+)$/, "my_$1"));
      setStatus({ text: `${t.path} is part of the project: save your own copy (kept in this browser)`, kind: "idle" });
      return;
    }
    const vals = live.current.valuesByKey[t.key] ?? {};
    const source = Object.keys(vals).length ? withValues(t.source, vals) : t.source;
    try {
      await api.save(t.path, source);
      setTabs((old) => old.map((x) => (x.key === t.key ? { ...x, source, saved: source } : x)));
      setValuesByKey((v) => {
        const n = { ...v };
        delete n[t.key];
        return n;
      });
      setStatus({ text: `Saved ${voiceLabel(t.path)} in this browser`, kind: "ok" });
    } catch (err) {
      setStatus({ text: `Save failed: ${(err as Error).message}`, kind: "error" });
    }
  }, []);

  const doSaveAs = async (rel: string, which?: Tab) => {
    const t = which ?? activeTab;
    const p = scadFileName(rel);
    if (!t || !p) {
      setStatus({ text: "Save as: give the design a name", kind: "error" });
      return;
    }
    // The settings go into the saved file (it is the design); a preset goes back to as published,
    // your own design keeps its changes until you save it too.
    const fromPreset = isRO(t);
    const source = withValues(t.source, valuesByKey[t.key] ?? {});
    try {
      await api.save(p, source);
      setSaveAs(null);
      const moved: Tab = { key: p, path: p, name: p.split("/").pop()!, source, saved: source };
      setTabs((old) => [...old.filter((x) => x.key !== t.key && x.key !== p), moved]);
      setValuesByKey((v) => {
        const n = { ...v };
        delete n[p];
        if (fromPreset) delete n[t.key];
        return n;
      });
      setActiveKey(p);
      if (mainKey === t.key || !isLibrary(moved)) setMainKey(p);
      api
        .files()
        .then((r) => {
          setFiles(r.files);
          setReadOnly(new Set(r.readOnly ?? []));
          setOwnFiles(new Set(r.own ?? []));
        })
        .catch(() => {});
      setStatus({ text: `Saved as “${voiceLabel(p)}” in this browser`, kind: "ok" });
    } catch (err) {
      setStatus({ text: `Save failed: ${(err as Error).message}`, kind: "error" });
    }
  };

  // ---- rendering
  const renderAbort = useRef<AbortController | null>(null);
  const refineTimer = useRef<number | undefined>(undefined);
  const shownFn = useRef<number | null>(null); // render_fn of the model on screen (null: the file's own)
  // The render_fn the quality selector puts in, or null when the file has no render_fn parameter
  // or the user set it themselves.
  const qualityFn = (fn: number, vals: Values) =>
    live.current.params.some((p) => p.name === "render_fn") && !("render_fn" in vals) ? fn : null;
  const withFn = (vals: Values, fn: number | null): Values => (fn === null ? vals : { ...vals, render_fn: fn });

  // draft: a quick pass at Draft quality, followed by the chosen quality after a pause.
  const renderPass = useCallback(async (draft: boolean) => {
    const { target: t, values: vals, quality: q } = live.current;
    if (!t) return;
    clearTimeout(refineTimer.current);
    renderAbort.current?.abort();
    const ac = new AbortController();
    renderAbort.current = ac;
    const fn = qualityFn(draft ? QUALITY_FN.draft : QUALITY_FN[q], vals);
    const isDraft = draft && fn !== null && q !== "draft";
    setStatus({ text: `Rendering ${t.name}${isDraft ? " (draft)" : ""}…`, short: "Rendering…", kind: "busy" });
    renderStarted(reportDesign(t.path));
    const slow = window.setTimeout(
      () => report("slow-render", `a render is still running after ${SLOW_RENDER_S}s`),
      SLOW_RENDER_S * 1000,
    );
    // the full pass of a design with the readouts showing also makes them (and the zoom targets)
    const withReports = !isDraft && live.current.reportsOn;
    const focusToo = withReports && live.current.zoom;
    const source = withReports ? t.source + REPORTS_ECHO + (focusToo ? FOCUS_ECHO : "") : t.source;
    try {
      const run = api.render(source === t.source ? t : { ...t, source }, withFn(vals, fn), ac.signal).finally(() => {
        clearTimeout(slow);
        renderEnded();
      });
      if (focusToo)
        setFocusData(
          t,
          vals,
          run.then((r) => (r.ok ? parseFocusEcho(r.log) : null)).catch(() => null),
        );
      const r = await run;
      if (ac.signal.aborted) return;
      setLog(withReports ? withoutReports(r.log) : r.log);
      if (withReports && r.ok) {
        reportsAbort.current?.abort(); // an older separate run must not overwrite these
        setFacing(parseFacing(r.log));
        setWall(parseClearance(r.log));
      }
      const airCm3 = r.ok ? parseAirVolume(r.log) : null;
      setAir(airCm3);
      const airText = airCm3 !== null ? ` · air ${airCm3.toFixed(1)} cm³` : "";
      const secs = `${(r.ms / 1000).toFixed(2)}s`;
      if (!r.ok) {
        setStatus({
          text: `${t.name}: error (${secs}) — see console`,
          short:
            "This design didn't render (the model shown is the last one that did). Show the code editor (More ▾) to see why in its console.",
          kind: "error",
        });
      } else if (r.kind === "3d" && r.stl) {
        const buf = base64ToBuffer(r.stl);
        const tris = buf.byteLength >= 84 ? new DataView(buf).getUint32(80, true) : 0;
        setStl(buf);
        setSvg(null);
        shownFn.current = fn;
        const label = fn === null ? "" : isDraft ? " · draft, refining…" : ` · ${q}`;
        setStatus({
          text: `${t.name} · 3D · ${tris.toLocaleString()} triangles${airText} · ${secs}${label}`,
          short: `${isDraft ? "Draft" : "Ready"} · ${secs}${isDraft ? " · refining…" : ""}`,
          kind: "ok",
        });
        if (!isDraft && (live.current.lig.on || live.current.lig.reed) && live.current.ligOK) loadLigature(t, vals, fn);
        if (isDraft) refineTimer.current = window.setTimeout(() => renderPass(false), REFINE_DELAY);
        else if (!withReports && live.current.zoom) prefetchFocus(t, vals);
      } else if (r.kind === "2d" && r.svg) {
        setSvg(r.svg);
        setStl(null);
        setStatus({ text: `${t.name} · 2D · ${secs}`, kind: "ok" });
      } else {
        setStl(null);
        setSvg(null);
        // say why, so an emptied buffer or a report-only setting isn't a mystery
        const changed = Object.entries(vals).map(([k, v]) => `${k} = ${JSON.stringify(v)}`);
        const why = !t.source.trim()
          ? "the file's text is empty (Revert reloads it)"
          : changed.length
            ? `empty top-level object — changed values: ${changed.slice(0, 3).join(", ")}${changed.length > 3 ? " …" : ""}`
            : "empty top-level object";
        setStatus({ text: `${t.name}: nothing to show: ${why} · ${secs}`, kind: "error" });
      }
    } catch (err) {
      if (ac.signal.aborted) return;
      setStatus({ text: `OpenSCAD error: ${(err as Error).message}`, kind: "error" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const render = useCallback(() => renderPass(true), [renderPass]);
  // A new quality re-renders straight at it (the shape is the same, so no draft first).
  const firstQuality = useRef(true);
  useEffect(() => {
    if (firstQuality.current) {
      firstQuality.current = false;
      return;
    }
    if (ready && (stl || svg)) renderPass(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality]);

  // The ligature for the model just rendered (seated, in the model's frame) and/or a reed, after the
  // model itself: small renders (the band and the reed are simple lofts), each only while shown.
  const ligAbort = useRef<AbortController | null>(null);
  const loadLigature = async (t: RenderTarget, vals: Values, fn: number | null) => {
    ligAbort.current?.abort();
    const ac = new AbortController();
    ligAbort.current = ac;
    const { on, reed } = live.current.lig;
    try {
      if (on) {
        const r = await api.render(t, withFn({ ...vals, part: "ligature_seated" }, fn), ac.signal);
        if (ac.signal.aborted) return;
        setLigInfo(parseLigature(r.log));
        setLigStl(r.ok && r.stl ? base64ToBuffer(r.stl) : null);
      }
      if (reed) {
        const q = await api.render(t, withFn({ ...vals, part: "reed_model" }, fn), ac.signal);
        if (ac.signal.aborted) return;
        setReedStl(q.ok && q.stl ? base64ToBuffer(q.stl) : null);
      }
    } catch {
      // superseded or failed: the last ligature stays
    }
  };
  // Turned on (or back to the mouthpiece): make it for the model on screen.
  useEffect(() => {
    if (!(ligView.on || ligView.reed) || !ligOK || !ready || !stl || !live.current.target) return;
    loadLigature(live.current.target, live.current.values, shownFn.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ligView.on, ligView.reed, ligOK]);
  // Another design: its own ligature comes with its first render.
  useEffect(() => {
    setLigStl(null);
    setReedStl(null);
    setLigInfo(null);
  }, [mainKey]);

  // Echo-only reports for the readouts (facing curve, thinnest wall), after each render while they show.
  const reportsAbort = useRef<AbortController | null>(null);
  const loadReports = async (t: RenderTarget, vals: Values) => {
    reportsAbort.current?.abort();
    const ac = new AbortController();
    reportsAbort.current = ac;
    setWall(null); // "…" while the new model's wall is measured (not the last model's number)
    try {
      // the zoom targets ride along (param_focus() doesn't depend on part): no extra run
      const zoomToo = live.current.zoom;
      const fp = api.echo(
        zoomToo ? { ...t, source: t.source + FOCUS_ECHO } : t,
        { ...vals, part: "facing_report" },
        ac.signal,
      );
      if (zoomToo)
        setFocusData(
          t,
          vals,
          fp.then((r) => parseFocusEcho(r.log)).catch(() => null),
        );
      const f = await fp;
      if (ac.signal.aborted) return;
      setFacing(parseFacing(f.log));
      const c = await api.echo(t, { ...vals, part: "clearance_report" }, ac.signal);
      if (ac.signal.aborted) return;
      setWall(parseClearance(c.log));
    } catch {
      // superseded or failed: the cards keep their last values
    }
  };
  // The readouts come into view (the readouts strip): fetch the reports for the current model.
  useEffect(() => {
    if (reportsOn && ready && stl && live.current.target) loadReports(live.current.target, live.current.values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportsOn]);

  // ---- share link: the design (file + changed values, plus the text of a non-preset file).
  // The user's own pictures go along only with "Include picture"; otherwise a picture parameter
  // using one goes out as none.
  const [shareArt, setShareArt] = useState(false);
  const share = async () => {
    const t = live.current.tabs.find((x) => x.key === mainKey);
    if (!t) return;
    const isPreset = !!t.path && live.current.readOnly.has(t.path);
    const src = isPreset ? undefined : t.source;
    const values = { ...live.current.values };
    const art = shareArt ? sharedArt(values, src) : {};
    if (!shareArt) for (const [k, v] of Object.entries(imageRefs(values, src))) if (isUserArt(v)) values[k] = "";
    try {
      const link = await encodeShare({
        file: t.path ?? t.name,
        values,
        ...(src === undefined ? {} : { source: src }),
        ...(Object.keys(art).length ? { art } : {}),
      });
      try {
        await navigator.clipboard.writeText(link);
        setShareLink(null);
        setStatus({
          text: `Link copied (${link.length} characters)`,
          short: "Link copied: paste it anywhere to share this design",
          kind: "ok",
        });
      } catch {
        setShareLink(link); // clipboard refused (e.g. plain http on the LAN): show it to copy by hand
      }
    } catch (err) {
      setStatus({ text: `Could not make a link: ${(err as Error).message}`, kind: "error" });
    }
  };

  // ---- Customizer parameters follow the main file (debounced).
  useEffect(() => {
    if (!ready || !target) return;
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await api.params(target, ac.signal);
        setParams(r.parameters);
        const names = new Set(r.parameters.map((p) => p.name));
        const key = mainTab!.key;
        setValuesByKey((all) => {
          const v = all[key] ?? {};
          const lists = new Set(findPointLists(mainTab!.source).map((l) => l.name)); // Curves edits
          const kept = Object.fromEntries(
            Object.entries(v).filter(
              ([k]) => names.has(k) || lists.has(k) || (k in POINT_VALUES && names.has(POINT_VALUES[k])),
            ),
          );
          return Object.keys(kept).length === Object.keys(v).length ? all : { ...all, [key]: kept };
        });
      } catch {
        // syntax errors etc. surface in the render log; keep the old panel meanwhile
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, targetSig]);

  // ---- auto-render: quick after a parameter change or a switch of main file, slower while typing.
  const lastMain = useRef("");
  const valuesSig = JSON.stringify(values);
  const autoOn = auto || !coding; // the Render button and Auto live with the code
  useEffect(() => {
    if (!ready || !autoOn || !mainTab) return;
    const switched = lastMain.current !== mainTab.key;
    lastMain.current = mainTab.key;
    const t = setTimeout(render, switched ? 0 : 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, autoOn, targetSig, render]);

  // ---- zoom to parameter: the file's param_focus() says where each parameter acts; the viewer
  // flies there. Files without it simply don't zoom. It's an OpenSCAD run of its own (seconds in
  // the browser), so it's fetched after each final render (with the facing report when that runs),
  // and a touch uses the latest data for the file at once, even from a slightly older model state
  // (parts barely move between changes), while the current state's data loads for later touches.
  const focusData = useRef<{ sig: string; data: Promise<FocusData | null> } | null>(null);
  const focusLatest = useRef<{ file: string; data: FocusData } | null>(null);
  const lastFocus = useRef({ name: "", at: 0, n: 0 });
  const setFocusData = (t: RenderTarget, vals: Values, data: Promise<FocusData | null>) => {
    focusData.current = { sig: JSON.stringify([t, vals]), data };
    data.then((d) => {
      if (d) focusLatest.current = { file: t.path ?? t.name, data: d };
    });
  };
  const prefetchFocus = (t: RenderTarget, vals: Values) =>
    setFocusData(
      t,
      vals,
      api
        .echo({ ...t, source: t.source + FOCUS_ECHO }, vals)
        .then((r) => parseFocusEcho(r.log))
        .catch(() => null),
    );
  const focusOn = useCallback(async (name: string) => {
    const { target: t, values: vals, zoom: on } = live.current;
    if (!on || !t) return;
    const now = performance.now(),
      last = lastFocus.current;
    if (last.name === name && now - last.at < 600) return; // pointerdown + focus of the same touch
    const n = last.n + 1;
    lastFocus.current = { name, at: now, n };
    if (focusData.current?.sig !== JSON.stringify([t, vals])) prefetchFocus(t, vals);
    const latest = focusLatest.current;
    const data = latest && latest.file === (t.path ?? t.name) ? latest.data : await focusData.current!.data;
    const item = data?.items[name];
    if (lastFocus.current.n !== n || !data || !item) return; // superseded, or nothing to show
    setFocus(toRequest(name, n, item, data.frame));
  }, []);

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
      api.echo(t, { ...base.values, part: "facing_report" }).catch(() => null),
    ]); // B's facing curve, for the chart
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
  const pinCurrent = () => {
    if (!current) return;
    setPinned({ ...current, values: { ...current.values }, files: { ...current.files } });
    showCompare();
  };

  const pinProjectFile = async (p: string) => {
    try {
      setStatus({ text: `Rendering ${voiceLabel(p)} to compare with…`, kind: "busy" });
      const open = live.current.tabs.find((t) => t.key === p);
      const source = open ? open.source : (await api.file(p)).source;
      setPinned(
        await buildSnapshot({
          name: p.split("/").pop()!,
          path: p,
          source,
          files: live.current.target?.files ?? {},
          values: readOnly.has(p) ? {} : (valuesByKey[p] ?? {}),
        }),
      ); // a preset as published
      showCompare();
      setStatus({ text: `Comparing with ${voiceLabel(p)}`, kind: "ok" });
    } catch (err) {
      setStatus({ text: `Could not pin ${p}: ${(err as Error).message}`, kind: "error" });
    }
  };

  // An STL from this device as B: lined up with the model when it looks like a mouthpiece.
  const stlInput = useRef<HTMLInputElement>(null);
  const pinStl = async (file: File) => {
    try {
      setStatus({ text: `Reading ${file.name}…`, kind: "busy" });
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
      setStatus(
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
      setStatus({ text: `Could not read ${file.name}: ${(err as Error).message}`, kind: "error" });
    }
  };
  const pinSource = async (name: string, source: string, values: Values) => {
    try {
      setStatus({ text: `Rendering ${name} as B…`, kind: "busy" });
      setPinned(await buildSnapshot({ name, path: null, source, files: live.current.target?.files ?? {}, values }));
      showCompare();
      setStatus({ text: `Comparing with ${name}`, kind: "ok" });
    } catch (err) {
      setStatus({ text: `Could not compare with ${name}: ${(err as Error).message}`, kind: "error" });
    }
  };
  const scadCompareInput = useRef<HTMLInputElement>(null);
  const clearB = () => setPinned(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meshB, targetSig, valuesSig]);

  const swap = async () => {
    if (!pinned || !current || pinned.mesh) return;
    const b = pinned;
    setPinned({ ...current });
    const key = b.path ?? `local:${b.name}`;
    const onDisk = b.path
      ? await api
          .file(b.path)
          .then((r) => r.source)
          .catch(() => null)
      : null;
    setTabs((old) => {
      const tabB: Tab = { key, path: b.path, name: b.name, source: b.source, saved: b.path ? onDisk : null };
      const next = old.some((t) => t.key === key)
        ? old.map((t) => (t.key === key ? { ...t, source: b.source } : t))
        : [...old, tabB];
      return next;
    });
    setValuesByKey((v) => ({ ...v, [key]: b.values }));
    setActiveKey(key);
    setMainKey(key);
    setStl(b.stl);
    setSvg(null);
  };

  // ---- console "→ file:line"
  const gotoRef = useRef<{ key: string; line: number } | null>(null);
  const goto = async (line: number, file: string | null) => {
    const tabsNow = live.current.tabs;
    const t = file
      ? (tabsNow.find((x) => x.path === file || x.name === file) ?? null)
      : (tabsNow.find((x) => x.key === mainKey) ?? null);
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

  // ---- startup
  useEffect(() => {
    (async () => {
      api
        .health()
        .then((h) => setBackend(h.backend))
        .catch(() => setBackend("offline"));
      const listing = await api
        .files()
        .catch(() => ({ files: [] as string[], readOnly: [] as string[], own: [] as string[] }));
      const list = listing.files,
        ro = new Set(listing.readOnly ?? []);
      setFiles(list);
      setReadOnly(ro);
      setOwnFiles(new Set(listing.own ?? []));
      const restored: Tab[] = [];
      for (const t of saved.tabs ?? []) {
        if (!t.path) {
          restored.push(t);
          continue;
        }
        const disk = await api
          .file(t.path)
          .then((r) => r.source)
          .catch(() => null);
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
        setStatus({ text: "That design link is damaged or incomplete: opened the usual files instead", kind: "error" });
      }
      if (shared) clearShare();
      let sharedKey: string | null = null;
      if (shared && shared.source === undefined && list.includes(shared.file)) {
        const p = shared.file;
        if (!restored.some((t) => t.key === p)) {
          const source = await api
            .file(p)
            .then((r) => r.source)
            .catch(() => null);
          if (source !== null) restored.push({ key: p, path: p, name: p.split("/").pop()!, source, saved: source });
        }
        if (restored.some((t) => t.key === p)) sharedKey = p;
      } else if (shared && shared.source !== undefined) {
        const name = shared.file
          .split("/")
          .pop()!
          .replace(/\.scad$/i, "");
        let key = `local:${name}.scad`;
        for (let i = 2; restored.some((t) => t.key === key); i++) key = `local:${name} (${i}).scad`;
        restored.push({ key, path: null, name: key.slice(6), source: shared.source, saved: null });
        sharedKey = key;
      } else if (shared) {
        setStatus({ text: `The shared design's file ${shared.file} isn't here`, kind: "error" });
      }
      if (shared && sharedKey) {
        let v = shared.values;
        if (shared.art) {
          try {
            v = receiveArt(shared.art, v, shared.source) as Values;
          } catch (err) {
            setStatus({ text: `The design's picture couldn't be kept: ${(err as Error).message}`, kind: "error" });
          }
        }
        const k = sharedKey;
        setValuesByKey((all) => ({ ...all, [k]: v }));
      }
      if (!restored.length) {
        const p = list.includes(DEFAULT_FILE) ? DEFAULT_FILE : (list.find((f) => !f.startsWith("lib/")) ?? list[0]);
        const source = p
          ? await api
              .file(p)
              .then((r) => r.source)
              .catch(() => "cube(10);\n")
          : "cube(10);\n";
        restored.push(
          p
            ? { key: p, path: p, name: p.split("/").pop()!, source, saved: source }
            : { key: "local:untitled1.scad", path: null, name: "untitled1.scad", source, saved: null },
        );
      }
      setTabs(restored);
      const has = (k?: string) => !!k && restored.some((t) => t.key === k);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- global shortcuts
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

  // ---- drag-and-drop .scad files anywhere
  const [dragging, setDragging] = useState(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    for (const f of Array.from(e.dataTransfer.files)) {
      if (/\.stl$/i.test(f.name))
        pinStl(f); // an STL: compare with it (B)
      else openLocalFile(f);
    }
  };

  // ---- editor/viewer splitter
  // Drag the right panel's edge (both desktop screens).
  const startPanelDrag = (e: React.PointerEvent) => {
    const x0 = e.clientX,
      w0 = panelWShown;
    const move = (ev: PointerEvent) =>
      setPanelW(Math.round(Math.max(320, Math.min(window.innerWidth * 0.5, w0 - (ev.clientX - x0)))));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const startDrag = (e: React.PointerEvent) => {
    const x0 = e.clientX,
      w0 = editorWShown;
    const move = (ev: PointerEvent) =>
      setEditorW(Math.max(260, Math.min(window.innerWidth - 500, w0 + ev.clientX - x0)));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const setValue = (n: string, initial: ParamValue | undefined, v: ParamValue | undefined) => {
    if (!mainTab) return;
    const key = mainTab.key;
    setValuesByKey((all) => {
      const next = { ...(all[key] ?? {}) };
      if (v === undefined || (initial !== undefined && JSON.stringify(v) === JSON.stringify(initial))) delete next[n];
      else next[n] = v;
      return { ...all, [key]: next };
    });
  };

  // Undo / redo of setting changes, per design (Ctrl+Z / Ctrl+Y outside the code editor and text
  // boxes, and the Design panel's arrows). Every change of the values counts (sliders, Reset, facing
  // picks, "use B"); quick changes of the same setting (a slider drag) are one step.
  const hist = useRef(new Map<string, { past: Values[]; future: Values[]; last: Values; at: number; keys: string }>());
  const applyingHist = useRef(false);
  const [, bumpHist] = useState(0);
  const histKey = mainTab?.key ?? "";
  const curValues = valuesByKey[histKey] ?? NO_VALUES;
  useEffect(() => {
    if (!histKey) return;
    const h = hist.current.get(histKey);
    if (!h) {
      hist.current.set(histKey, { past: [], future: [], last: curValues, at: 0, keys: "" });
      return;
    }
    if (h.last === curValues) return;
    if (applyingHist.current) {
      applyingHist.current = false;
    } else {
      const keys = [...new Set([...Object.keys(h.last), ...Object.keys(curValues)])]
        .filter((k) => JSON.stringify(h.last[k]) !== JSON.stringify(curValues[k]))
        .join(",");
      const now = performance.now();
      if (!(now - h.at < 700 && keys === h.keys && h.past.length)) h.past.push(h.last);
      if (h.past.length > 200) h.past.shift();
      h.future = [];
      h.at = now;
      h.keys = keys;
    }
    h.last = curValues;
    bumpHist((n) => n + 1);
  }, [histKey, curValues]);
  const stepValues = (redo: boolean) => {
    const h = hist.current.get(histKey);
    const v = (redo ? h?.future : h?.past)?.pop();
    if (!h || !v) return;
    (redo ? h.past : h.future).push(h.last);
    h.at = 0;
    applyingHist.current = true;
    setValuesByKey((all) => ({ ...all, [histKey]: v }));
  };
  const histNow = hist.current.get(histKey);
  const stepRef = useRef(stepValues);
  stepRef.current = stepValues;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k !== "z" && k !== "y") return;
      const t = e.target as HTMLElement | null;
      if (t?.closest(".cm-editor") || t?.matches("textarea, input[type=text], input[type=number], input[type=search]"))
        return; // their own undo
      e.preventDefault();
      stepRef.current(k === "y" || e.shiftKey);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const fileInput = useRef<HTMLInputElement>(null);

  if (!ready || !activeTab || !mainTab) return <div className="loading">Loading…</div>;

  const renderable = tabs.filter((t) => !isLibrary(t) || t.key === mainTab.key);
  // The STL on screen, unless it's a draft (or Draft quality): then the model is made at the chosen
  // quality (Normal at least) for the download.
  const downloadResult = async () => {
    const part = typeof values.part === "string" && values.part !== "mouthpiece" ? `_${values.part}` : "";
    const name = `${isRO(mainTab) && Object.keys(values).some((k) => k !== "part") ? "my_" : ""}${baseName(mainTab.name)}${part}`; // as Download .scad names it
    if (svg && !stl) {
      download(svg, "image/svg+xml", `${name}.svg`);
      setDl({ what: "model", state: "done" });
      return;
    }
    if (!stl || dl?.state === "busy") return;
    const { target: t, values: vals, quality: q } = live.current;
    const fn = qualityFn(QUALITY_FN[q === "draft" ? "normal" : q], vals);
    if (fn === null || fn === shownFn.current || !t) {
      download(stl, "model/stl", `${name}.stl`);
      setDl({ what: "model", state: "done" });
      return;
    }
    setDl({ what: "model", state: "busy" });
    setStatus({
      text: `Making the full-quality model for the download…`,
      short: "Preparing the download…",
      kind: "busy",
    });
    try {
      const r = await api.render(t, withFn(vals, fn));
      if (!r.ok || !r.stl) throw new Error("the render failed (the console says why)");
      download(base64ToBuffer(r.stl), "model/stl", `${name}.stl`);
      setStatus({
        text: `Downloaded ${name}.stl (render_fn ${fn}) · ${(r.ms / 1000).toFixed(2)}s`,
        short: "Downloaded",
        kind: "ok",
      });
      setDl({ what: "model", state: "done" });
    } catch (err) {
      setStatus({ text: `Download failed: ${(err as Error).message}`, kind: "error" });
      setDl({ what: "model", state: "error" });
    }
  };
  // A download button's text: what it does, or how its download is going.
  const dlLabel = (what: "model" | "ligature", label: string) =>
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
  const dlBusy = (what: "model" | "ligature") => dl?.what === what && dl.state === "busy";
  // The ligature on its own, ready to print (standing on its wide end), at full quality.
  const downloadLigature = async () => {
    const t = live.current.target;
    if (!t || dl?.state === "busy") return;
    const name = `${isRO(mainTab) && Object.keys(values).some((k) => k !== "part") ? "my_" : ""}${baseName(mainTab.name)}_ligature`;
    const fn = qualityFn(QUALITY_FN[quality === "draft" ? "normal" : quality], values);
    setDl({ what: "ligature", state: "busy" });
    setStatus({ text: `Making the ligature for the download…`, short: "Preparing the download…", kind: "busy" });
    try {
      const r = await api.render(t, withFn({ ...values, part: "ligature" }, fn));
      if (!r.ok || !r.stl) throw new Error("the render failed (the console says why)");
      download(base64ToBuffer(r.stl), "model/stl", `${name}.stl`);
      setStatus({ text: `Downloaded ${name}.stl · ${(r.ms / 1000).toFixed(2)}s`, short: "Downloaded", kind: "ok" });
      setDl({ what: "ligature", state: "done" });
    } catch (err) {
      setStatus({ text: `Download failed: ${(err as Error).message}`, kind: "error" });
      setDl({ what: "ligature", state: "error" });
    }
  };
  const usesOwnArt =
    !!mainTab && Object.values(imageRefs(values, isRO(mainTab) ? undefined : mainTab.source)).some(isUserArt);
  const shareArtToggle = usesOwnArt && (
    <label
      className="share-art"
      title="Put your own picture in the share link, so it opens with it. Makes the link longer (a few thousand characters)."
    >
      <input type="checkbox" checked={shareArt} onChange={(e) => setShareArt(e.target.checked)} /> Include picture
    </label>
  );
  const QUALITY_HINT =
    "Model detail: Draft is fastest, Fine slowest. Changes show a quick draft first, then this quality once you pause. Downloads are always at least Normal.";
  // with the view tools, like "Cut open"
  const qualityDropdown = (
    <select
      value={quality}
      onChange={(e) => setQuality(e.target.value as Quality)}
      title={QUALITY_HINT}
      aria-label="Quality"
    >
      <option value="draft">Quality: Draft</option>
      <option value="normal">Quality: Normal</option>
      <option value="fine">Quality: Fine</option>
    </select>
  );
  const qualitySelect = (
    <label className="quality" title={QUALITY_HINT}>
      Quality{" "}
      <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
        <option value="draft">Draft (fastest)</option>
        <option value="normal">Normal</option>
        <option value="fine">Fine (slowest)</option>
      </select>
    </label>
  );

  // ---- pieces shared by the desktop and phone layouts
  const fileInputEl = (
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
      {files.map((f) => (
        <option key={f} value={f}>
          {f}
        </option>
      ))}
    </select>
  );
  const openOthers = tabs.filter((t) => !t.path && t.key !== mainTab.key);
  const compareSelect = (
    <select
      value=""
      className="compare-select"
      onChange={(e) => {
        const v = e.target.value;
        if (v === STL_CHOICE) stlInput.current?.click();
        else if (v === SCAD_CHOICE) scadCompareInput.current?.click();
        else if (v.startsWith("local:")) {
          const t = tabs.find((x) => x.key === v);
          if (t) pinSource(t.name, t.source, valuesByKey[t.key] ?? {});
        } else if (v) pinProjectFile(v);
        if (v) setMenuOpen(false);
      }}
      title="Compare with another mouthpiece: a preset, one of your designs, or a file from this device (an STL of a mouthpiece you own a model of, or a .scad). You can also drop a file on the page."
    >
      <option value="">Compare with…</option>
      <optgroup label="From this device">
        <option value={STL_CHOICE}>STL file…</option>
        <option value={SCAD_CHOICE}>.scad file…</option>
      </optgroup>
      <optgroup label="Presets">
        {files
          .filter((f) => readOnly.has(f) && !isVariant(f))
          .map((f) => (
            <option key={f} value={f}>
              {voiceLabel(f)}
            </option>
          ))}
      </optgroup>
      {files.some((f) => readOnly.has(f) && isVariant(f)) && (
        <optgroup label="Variants">
          {files
            .filter((f) => readOnly.has(f) && isVariant(f))
            .map((f) => (
              <option key={f} value={f}>
                {voiceLabel(f)}
              </option>
            ))}
        </optgroup>
      )}
      {files.some((f) => ownFiles.has(f)) && (
        <optgroup label="Your designs">
          {files
            .filter((f) => ownFiles.has(f))
            .map((f) => (
              <option key={f} value={f}>
                {voiceLabel(f)}
              </option>
            ))}
        </optgroup>
      )}
      {openOthers.length > 0 && (
        <optgroup label="Open files (not saved)">
          {openOthers.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
  const revertTab = (t: Tab) => {
    if (t.saved === null) return;
    setTabs((old) => old.map((x) => (x.key === t.key ? { ...x, source: x.saved ?? x.source } : x)));
    setStatus({ text: `Reverted ${t.path} to the saved file`, kind: "ok" });
  };
  const revertButton = (
    <button
      onClick={() => revertTab(activeTab)}
      disabled={!isDirty(activeTab)}
      title="Discard this tab's unsaved changes (reload the file from disk)"
    >
      Revert
    </button>
  );
  const saveTarget = coding ? activeTab : mainTab; // without the code open, Save as saves the design on screen
  const setOpt = (k: keyof SaveOpts, v: boolean) => setSaveOpts((o) => ({ ...SAVE_DEFAULTS, ...o, ...{ [k]: v } }));
  const opts = { ...SAVE_DEFAULTS, ...saveOpts };
  const wantsFiles = opts.full || opts.settings || opts.stl || (opts.ligature && ligMade);
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
  const saveAsPanel = saveAs !== null && (
    <form
      className="save-as-panel"
      onSubmit={(e) => {
        e.preventDefault();
        saveDesignAs(saveAs);
      }}
      onKeyDown={(e) => e.key === "Escape" && setSaveAs(null)}
    >
      <label className="save-name">
        Name <input autoFocus value={saveAs} placeholder="Name" onChange={(e) => setSaveAs(e.target.value)} />
      </label>
      <label title="It then shows under Your designs. Only in this browser on this device: clearing the site's data or switching browsers loses it">
        <input type="checkbox" checked={opts.browser} onChange={(e) => setOpt("browser", e.target.checked)} /> Keep a
        copy in this browser <span className="muted">quick, not a backup</span>
      </label>
      <div className="save-group">Download</div>
      <label title="Your settings + the generator in one plain OpenSCAD file: opens in any OpenSCAD, and here with Open…">
        <input type="checkbox" checked={opts.full} onChange={(e) => setOpt("full", e.target.checked)} /> Full .scad{" "}
        <span className="muted">works anywhere</span>
      </label>
      <label title="Just your settings (a few KB); the geometry comes from this site when you open it here">
        <input type="checkbox" checked={opts.settings} onChange={(e) => setOpt("settings", e.target.checked)} />{" "}
        Settings-only .scad <span className="muted">for this site</span>
      </label>
      <label title="The model to print, at full quality">
        <input type="checkbox" checked={opts.stl} onChange={(e) => setOpt("stl", e.target.checked)} />{" "}
        {partName(values.part)} STL
      </label>
      {ligMade && values.part !== "ligature" && (
        <label title="The ligature on its own, standing on its front edge, ready to print">
          <input type="checkbox" checked={opts.ligature} onChange={(e) => setOpt("ligature", e.target.checked)} />{" "}
          Ligature STL
        </label>
      )}
      <label title="One .zip with every file above, instead of separate downloads">
        <input
          type="checkbox"
          checked={opts.zip}
          disabled={!wantsFiles}
          onChange={(e) => setOpt("zip", e.target.checked)}
        />{" "}
        Zip the files into one download
      </label>
      {opts.browser && !wantsFiles && (
        <p className="save-warn">Only this browser has it. Download a .scad to really keep it.</p>
      )}
      <div className="save-buttons">
        <button type="button" onClick={() => setSaveAs(null)}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={!scadFileName(saveAs) || (!opts.browser && !wantsFiles)}>
          {!wantsFiles ? "Keep in browser" : opts.browser ? "Save" : "Download"}
        </button>
      </div>
    </form>
  );
  const saveAsControl = !coding ? (
    <span className="save-as-wrap">
      {saveAsButton}
      {saveAsPanel}
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
  const tabBar = (
    <div className="tabbar">
      {tabs.map((t) => (
        <div
          key={t.key}
          className={`tab${t.key === activeKey ? " active" : ""}${t.key === mainTab.key ? " main" : ""}`}
          title={`${t.path ?? `${t.name} (from your computer — not saved)`}${t.key === mainTab.key ? " · rendered" : isLibrary(t) ? " · included by other files" : ""}`}
          onClick={() => activate(t.key)}
        >
          {t.key === mainTab.key && (
            <span className="main-dot" title="This file is rendered">
              ▶
            </span>
          )}
          {isRO(t) && (
            <span className="lock" title="Part of the project, read-only (Save as… for your own copy)">
              🔒
            </span>
          )}
          <span className="tab-name">{t.path && t.path.includes("/") ? t.path : t.name}</span>
          {(isDirty(t) || !t.path) && (
            <span className="dirty" title={t.path ? "Unsaved changes (used in renders)" : "Not saved"}>
              ●
            </span>
          )}
          <button
            className={`close${armedClose === t.key ? " armed" : ""}`}
            title={armedClose === t.key ? "Unsaved — click again to discard" : "Close"}
            onClick={(e) => {
              e.stopPropagation();
              closeTab(t.key);
            }}
          >
            {armedClose === t.key ? "!" : "×"}
          </button>
        </div>
      ))}
    </div>
  );
  const statusBar = (
    <div className={`status ${status.kind}`}>
      <span>{coding ? status.text : (status.short ?? status.text)}</span>
      {coding && <span className="backend">{backend && `OpenSCAD · ${backend}`}</span>}
    </div>
  );
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
  const consoleEl = <Console log={log} onGoto={goto} onClear={() => setLog("")} />;
  const dismissHint = () => {
    setHintSeen(true);
    writeFlag(HINT_KEY);
  };
  const hintEl = !hintSeen && (
    <div className="hint-card">
      <b>Design your own saxophone mouthpiece</b>
      <ol>
        <li>Pick a voice (alto, tenor, baritone, soprano).</li>
        <li>Adjust the tip, facing, chamber and baffle; the model and the readouts follow.</li>
        <li>
          Download the STL and print it
          {PRINTING_GUIDE_URL ? (
            <>
              {" "}
              (see the{" "}
              <a href={PRINTING_GUIDE_URL} target="_blank" rel="noreferrer">
                printing guide
              </a>
              )
            </>
          ) : (
            ""
          )}
          . Share sends the design as a link.
        </li>
      </ol>
      <button onClick={dismissHint}>Got it</button>
    </div>
  );
  const labelOf = (s: { name: string; path: string | null }) => (s.path ? voiceLabel(s.path) : s.name);
  const labelA = labelOf(mainTab),
    labelB = pinned ? labelOf(pinned) : undefined;
  const viewerEl = (
    <Viewer
      stl={stl}
      svg={svg}
      compare={pinned?.stl ?? null}
      frameKey={`${mainTab.key}|${otherPart ?? ""}`}
      compact={isPhone}
      focus={focus}
      labelA={labelA}
      labelB={labelB}
      compareKey={pinned ? `${pinned.path ?? ""}|${pinned.name}` : undefined}
      onClearB={clearB}
      busy={status.kind === "busy"}
      busyLabel={
        dl?.state === "busy"
          ? dl.what === "ligature"
            ? "Making the ligature for download…"
            : "Making the STL for download…"
          : undefined
      }
      simple={!coding}
      overlay={hintEl}
      quality={isPhone ? undefined : qualityDropdown}
      ligature={ligOK ? { on: ligView.on, beside: lig.beside, reedOn: ligView.reed, stl: ligStl, reed: reedStl } : null}
      onLigature={
        ligOK
          ? (c) => {
              if (c.on && !ligMade) makeLigature();
              setLig((l) => ({ ...l, ...c }));
            }
          : undefined
      }
    />
  );
  const resetAll = () => setValuesByKey((all) => ({ ...all, [mainTab.key]: {} }));
  function makeLigature() {
    setValue("ligature_made", false, true);
    setLig((l) => ({ ...l, on: true, reed: true }));
  }
  // The facing chart shapes the facing: tip opening, facing length and the Gauge model's points.
  const param = (n: string) => params.find((p) => p.name === n);
  const range = (n: string, lo: number, hi: number): [number, number] => [param(n)?.min ?? lo, param(n)?.max ?? hi];
  const modelParam = param("facing_model");
  const gaugePts =
    (values.facing_gauge_points as Pt[] | undefined) ??
    findPointLists(mainTab.source).find((l) => l.name === "facing_gauge_points")?.pts ??
    [];
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
  // A Curves edit: a point list as a value (undefined, or the file's own points: no value). The
  // facing's gauge points only act with facing_model = "gauge", so editing them switches to it
  // (and Reset or Clear goes back to the file's facing model).
  const setPointList = (name: string, pts: Pt[] | undefined) => {
    setValue(name, findPointLists(mainTab.source).find((l) => l.name === name)?.pts, pts);
    if (name === "facing_gauge_points" && modelParam)
      setValue("facing_model", modelParam.initial, pts?.length ? "gauge" : undefined);
  };
  // A few facing curves to pick from (both screens): "As designed" while none of the facing's values is changed.
  const expParam = param("facing_exponent");
  const facingKeys = ["facing_model", "facing_exponent", "facing_gauge_points"];
  const facingPick =
    modelParam && expParam
      ? {
          current: !facingKeys.some((k) => k in values)
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
  // Desktop: the readouts as a strip above the controls. Phone: the readouts are a tab of their own.
  // The facing chart is with the controls, under "Tip & facing", on both.
  const readoutsEl = otherPart ? (
    <div className="readouts-note muted">
      {otherPart === "ligature" ? (
        <>
          Ligature, as printed: standing on its flat front edge (the tongue points up), no supports (PETG or similar
          flexes without cracking). Slide it on over the tip with the reed in place and push it back until snug. The
          reed is the tight spot. Reed not held: raise <b>Reed grip</b>; it stops too far forward: lower it, or set{" "}
          <b>Reed thickness</b> to your reed.{ligLine(parseLigature(log))}
        </>
      ) : otherPart === "shank_test_ring" ? (
        <>
          Shank test ring: print it first and push it onto your neck cork. It should go on snugly with a slight twist,
          like a mouthpiece. Too tight: lower <b>Cork squeeze</b>; too loose: raise it (or set <b>Neck cork diameter</b>{" "}
          to your cork).
        </>
      ) : (
        <>
          Showing <b>{otherPart.replace(/_/g, " ")}</b>, not the mouthpiece: the readouts come back with “What to print”
          set to mouthpiece.
        </>
      )}
    </div>
  ) : (
    <Readouts
      summary={summary}
      wall={wall}
      busy={status.kind === "busy"}
      compact={!isPhone}
      compare={pinned ? { summary: pinned.summary ?? null, air: pinned.air ?? null } : null}
    />
  );
  const ligHead = !ligMade ? (
    <div className="lig-head">
      <p className="muted">
        A ring ligature made from this mouthpiece's own shape: it slides on over the tip with the reed and wedges in
        place, so it fits whatever you change.
      </p>
      <button onClick={makeLigature}>Make a ligature for this mouthpiece</button>
    </div>
  ) : !lig.on ? (
    <div className="lig-head">
      <p className="muted">Made for this design, hidden from the view.{ligLine(ligInfo)}</p>
      <div className="lig-actions">
        <button onClick={() => setLig((l) => ({ ...l, on: true }))}>Show it</button>
        <button onClick={downloadLigature} disabled={dlBusy("ligature")} aria-live="polite">
          {dlLabel("ligature", "Download ligature STL")}
        </button>
        <button
          onClick={() => setValue("ligature_made", false, undefined)}
          title="This design no longer has a ligature"
        >
          Remove
        </button>
      </div>
    </div>
  ) : (
    <div className="lig-head">
      <p className="muted">Shown in red on the mouthpiece.{ligLine(ligInfo)}</p>
      {ligInfo?.notes.length ? <Notes notes={ligInfo.notes} /> : null}
      <div className="lig-actions">
        <select
          value={lig.beside ? "beside" : "on"}
          onChange={(e) => setLig((l) => ({ ...l, beside: e.target.value === "beside" }))}
          aria-label="Where the ligature is shown"
        >
          <option value="on">On the mouthpiece</option>
          <option value="beside">Beside it</option>
        </select>
        <label className="lig-reed">
          <input
            type="checkbox"
            checked={lig.reed}
            onChange={(e) => setLig((l) => ({ ...l, reed: e.target.checked }))}
          />{" "}
          Show a reed
        </label>
        <button onClick={downloadLigature} disabled={dlBusy("ligature")} aria-live="polite">
          {dlLabel("ligature", "Download ligature STL")}
        </button>
        <button onClick={() => setLig((l) => ({ ...l, on: false }))}>Hide</button>
        <button
          onClick={() => setValue("ligature_made", false, undefined)}
          title="This design no longer has a ligature"
        >
          Remove
        </button>
      </div>
    </div>
  );
  const curvesEl = (visible: boolean) => (
    <CurveEditor
      title={mainTab.path ?? mainTab.name}
      source={mainTab.source}
      target={target}
      values={values}
      visible={visible}
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
      onUseB={(n, v) => setValue(n, params.find((p) => p.name === n)?.initial, v)}
    />
  );
  // Going deeper, after All parameters: the file's curves, and A/B compare while a B is pinned.
  const deeperEl = (
    <>
      <Fold id="d:curves" title="Curves">
        {curvesEl(true)}
      </Fold>
      {pinned && current && (
        <Fold id="d:compare" title="Compare A/B" summary={`with ${labelB ?? pinned.name}`}>
          {compareEl}
        </Fold>
      )}
    </>
  );
  const designEl = (withReadouts: boolean) => (
    <DesignPanel
      params={params}
      values={values}
      failed={status.kind === "error" && params.length === 0}
      title={voiceLabel(mainTab.path ?? mainTab.name)}
      onChange={(n, v) => setValue(n, undefined, v)}
      onResetAll={resetAll}
      zoom={zoom}
      onZoomChange={setZoom}
      onFocusParam={focusOn}
      readouts={withReadouts ? readoutsEl : undefined}
      history={{ canUndo: !!histNow?.past.length, canRedo: !!histNow?.future.length, step: stepValues }}
      facing={
        facingEl ? (
          <div className={`design-facing${status.kind === "busy" ? " stale" : ""}`}>{facingEl}</div>
        ) : undefined
      }
      ligature={ligOK ? { on: ligMade, shown: lig.on, head: ligHead } : undefined}
      showNames={coding}
      deeper={deeperEl}
    />
  );
  // Which mouthpiece: presets first, then the user's own files.
  const presets = files.filter((f) => readOnly.has(f));
  const own = files.filter((f) => ownFiles.has(f));
  const others = renderable.filter((t) => !t.path || !(presets.includes(t.path) || own.includes(t.path))); // unsaved, library, sweep
  const voicePicker = (
    <select
      className="voice-picker"
      value={mainTab.key}
      title="Which mouthpiece to design (the file that is rendered)"
      onChange={async (e) => {
        const k = e.target.value,
          prev = mainTab;
        if (tabs.some((t) => t.key === k)) {
          activate(k);
          setMainKey(k);
        } else if (!(await openProjectFile(k))) return;
        // the picker made k the main (and active) tab, so the untouched preset can go
        if (prev.key !== k && isRO(prev) && !isDirty(prev)) setTabs((old) => old.filter((t) => t.key !== prev.key));
      }}
    >
      <optgroup label="Presets">
        {presets
          .filter((f) => !isVariant(f))
          .map((f) => (
            <option key={f} value={f}>
              {voiceLabel(f)}
            </option>
          ))}
      </optgroup>
      {presets.some(isVariant) && (
        <optgroup label="Variants">
          {presets.filter(isVariant).map((f) => (
            <option key={f} value={f}>
              {voiceLabel(f)}
            </option>
          ))}
        </optgroup>
      )}
      {own.length > 0 && (
        <optgroup label="Your designs">
          {own.map((f) => (
            <option key={f} value={f}>
              {voiceLabel(f)}
            </option>
          ))}
        </optgroup>
      )}
      {others.length > 0 && (
        <optgroup label="Open files">
          {others.map((t) => (
            <option key={t.key} value={t.key}>
              {voiceLabel(t.path ?? t.name)}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
  // Save as, for the design: build the chosen files from the design on screen first (its values go
  // with the tab once it is kept in the browser), then download them, then keep it.
  const saveDesignAs = async (typed: string) => {
    const p = scadFileName(typed);
    if (!p) return setStatus({ text: "Save as: give the design a name", kind: "error" });
    const name = baseName(p).split("/").pop()!;
    const files: [string, Uint8Array<ArrayBuffer>][] = [];
    const enc = new TextEncoder();
    try {
      if (wantsFiles) setStatus({ text: `Making the files for ${name}…`, short: "Preparing the files…", kind: "busy" });
      if (opts.full) files.push([`${name}.scad`, enc.encode(await fullScad())]);
      // settings-only: the voice file with these values; its include as the site resolves it
      if (opts.settings)
        files.push([
          `${name}_settings.scad`,
          enc.encode(withValues(mainTab.source, values).replace(/include\s*<(\.\.\/)+lib\//, "include <lib/")),
        ]);
      if (opts.stl)
        files.push([
          `${name}${values.part && values.part !== "mouthpiece" ? `_${values.part}` : ""}.stl`,
          new Uint8Array(await partStl(null)),
        ]);
      if (opts.ligature && ligMade && values.part !== "ligature")
        files.push([`${name}_ligature.stl`, new Uint8Array(await partStl("ligature"))]);
    } catch (err) {
      return setStatus({ text: `Save as failed: ${(err as Error).message}`, kind: "error" });
    }
    if (files.length > 1 && opts.zip) download(zipSync(Object.fromEntries(files)), "application/zip", `${name}.zip`);
    else for (const [n, data] of files) download(data, n.endsWith(".stl") ? "model/stl" : "text/plain", n);
    const got = files.length > 1 && opts.zip ? `${name}.zip` : files.map(([n]) => n).join(", ");
    if (opts.browser) {
      await doSaveAs(p, mainTab);
      if (files.length)
        setStatus({
          text: `Saved as “${voiceLabel(p)}” in this browser; downloaded ${got}`,
          short: "Saved and downloaded",
          kind: "ok",
        });
    } else {
      setSaveAs(null);
      setStatus({ text: `Downloaded ${got}`, short: "Downloaded", kind: "ok" });
    }
  };
  // The model on screen (part null) or another part, at download quality (the one on screen when it
  // already is).
  const partStl = async (part: string | null): Promise<ArrayBuffer> => {
    const { target: t, values: vals, quality: q } = live.current;
    if (!t) throw new Error("no model yet");
    const fn = qualityFn(QUALITY_FN[q === "draft" ? "normal" : q], vals);
    if (!part && stl && (fn === null || fn === shownFn.current)) return stl;
    const r = await api.render(t, withFn(part ? { ...vals, part } : vals, fn));
    if (!r.ok || !r.stl) throw new Error("the render failed (the console says why)");
    return base64ToBuffer(r.stl);
  };
  const fullScad = () =>
    bundleDesign({
      source: mainTab.source,
      path: mainTab.path,
      values,
      // an open tab's unsaved text is what the model on screen uses
      readFile: async (p) => tabs.find((t) => t.path === p)?.source ?? (await api.file(p)).source,
      date: new Date().toLocaleDateString("sv-SE"), // YYYY-MM-DD, local
    });
  // One self-contained file of plain OpenSCAD (bundle.ts): the settings, then the generator.
  const downloadScad = async () => {
    const name = `${isRO(mainTab) ? "my_" : ""}${baseName(mainTab.name)}.scad`;
    setStatus({ text: `Making ${name}…`, short: "Preparing the download…", kind: "busy" });
    try {
      const text = await fullScad();
      download(text, "text/plain", name);
      setStatus({
        text: `Downloaded ${name} (self-contained, ${Math.round(text.length / 1024)} KB)`,
        short: `Downloaded ${name}`,
        kind: "ok",
      });
    } catch (err) {
      setStatus({ text: `Download failed: ${(err as Error).message}`, kind: "error" });
    }
  };
  // The user's own design (unsaved, or kept in this browser): it can be closed or deleted.
  const mainIsOwn = !mainTab.path || ownFiles.has(mainTab.path);
  const deleteOwn = async (p: string) => {
    if (armedDelete !== p) {
      setArmedDelete(p);
      setStatus({
        text: `Delete ${p} from this browser? Click Delete again (Download .scad first to keep a copy)`,
        short: `Click again to delete ${p}`,
        kind: "idle",
      });
      return;
    }
    setArmedDelete(null);
    try {
      await api.remove(p);
      const rest = tabs.filter((x) => x.key !== p);
      setTabs(rest);
      setValuesByKey((v) => {
        const n = { ...v };
        delete n[p];
        return n;
      });
      if (mainKey === p) {
        const next = rest.find((x) => !isLibrary(x));
        if (next) activate(next.key, rest);
        else openProjectFile(DEFAULT_FILE);
      }
      api
        .files()
        .then((r) => {
          setFiles(r.files);
          setReadOnly(new Set(r.readOnly ?? []));
          setOwnFiles(new Set(r.own ?? []));
        })
        .catch(() => {});
      setStatus({ text: `Deleted ${p} from this browser`, kind: "ok" });
    } catch (err) {
      setStatus({ text: `Delete failed: ${(err as Error).message}`, kind: "error" });
    }
  };
  // The design's file actions: Save (your own design: its settings go into it), Save as… (always:
  // a preset or a variation becomes your own design), Open…, Close and Delete.
  const mainChanged = Object.keys(values).length > 0 || isDirty(mainTab);
  const fileActions = (
    <span className="file-actions">
      {mainIsOwn && !mainTab.path && (
        <button
          onClick={() => doSaveAs(mainTab.name.endsWith(".scad") ? mainTab.name : `${mainTab.name}.scad`, mainTab)}
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
          className={armedClose === mainTab.key ? "armed" : undefined}
          title={armedClose === mainTab.key ? "Not saved: click again to discard it" : "Close this design"}
        >
          {armedClose === mainTab.key ? "Discard?" : "Close"}
        </button>
      )}
      {mainIsOwn && mainTab.path && (
        <button
          onClick={() => deleteOwn(mainTab.path!)}
          className={armedDelete === mainTab.path ? "armed" : undefined}
          title="Delete this design from this browser"
        >
          {armedDelete === mainTab.path ? "Delete?" : "Delete"}
        </button>
      )}
    </span>
  );
  const shareButton = (
    <button onClick={share} title="Copy a link that opens this design">
      Share
    </button>
  );
  const donateLink = DONATE_URL && (
    <a
      className="donate-link"
      href={DONATE_URL}
      target="_blank"
      rel="noreferrer"
      title="Open Mouthpiece is free, with no ads or accounts. A donation helps keep it that way."
    >
      ♥ Support
    </a>
  );
  // Desktop: the less-used file actions in a "More" menu, so the bar keeps to what a player needs.
  const moreMenu = (
    <Menu label="More ▾" title="Compare, the code editor">
      {(close) => (
        <div className="menu-list">
          <div className="menu-item" onChange={close}>
            {compareSelect}
          </div>
          <button
            onClick={() => {
              close();
              pinCurrent();
            }}
            disabled={!stl}
            title="Freeze the current model and its settings as B, to compare against while you change things"
          >
            Pin this model as B (compare)
          </button>
          {coding && (
            <button
              onClick={() => {
                close();
                fileInput.current?.click();
              }}
            >
              Open .scad from this device…
            </button>
          )}
          {coding && (
            <button
              onClick={() => {
                close();
                downloadScad();
              }}
              title="One self-contained .scad file (your settings + the generator): opens in any OpenSCAD, and here again with Open"
            >
              Download the design as .scad
            </button>
          )}
          {!isPhone && (
            <button
              onClick={() => {
                close();
                setCodeOpen(!codeOpen);
              }}
            >
              {codeOpen ? "Hide the code editor" : "Show the code editor (OpenSCAD) and console"}
            </button>
          )}
          {PRINTING_GUIDE_URL && (
            <a className="button" href={PRINTING_GUIDE_URL} target="_blank" rel="noreferrer">
              Printing guide
            </a>
          )}
        </div>
      )}
    </Menu>
  );
  const downloadButton = (
    <button
      className="primary dl-button"
      disabled={(!stl && !svg) || dlBusy("model")}
      onClick={downloadResult}
      title="Download the model to print"
      aria-live="polite"
    >
      {dlLabel("model", `Download ${svg ? "SVG" : "STL"}`)}
    </button>
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
    onDrop,
  };

  const drop = dragging && (
    <div className="drop-hint">Drop .scad files to open them, or an .stl to compare with it</div>
  );

  // ---- phone: viewer on top, one panel below (Design goes as deep as you open it; the code has its
  // own tabs), everything else in the ☰ menu
  if (isPhone) {
    const panels: [typeof phonePanel, string][] = [
      ["design", "Design"],
      ...(designOK ? ([["readouts", "Readouts"]] as [typeof phonePanel, string][]) : []),
      ["code", "Code"],
      ["console", "Console"],
    ];
    const act = (fn: () => void) => () => {
      fn();
      setMenuOpen(false);
    };
    return (
      <div className={`app phone${coding ? "" : " design"}${dragging ? " dragging" : ""}`} {...dropProps}>
        {fileInputEl}
        <header className="phone-bar">
          <button
            className="menu-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            ☰
          </button>
          {voicePicker}
          {coding && !auto ? (
            <button className="primary" onClick={render}>
              Render
            </button>
          ) : (
            <button
              className="primary dl-button"
              onClick={downloadResult}
              disabled={(!stl && !svg) || dlBusy("model")}
              aria-live="polite"
            >
              {dlLabel("model", svg ? "SVG" : "STL")}
            </button>
          )}
        </header>
        {menuOpen && (
          <div className="phone-menu" onClick={(e) => e.target === e.currentTarget && setMenuOpen(false)}>
            <div className="phone-menu-body">
              <button onClick={act(downloadResult)} disabled={!stl && !svg}>
                Download {svg ? "SVG" : "STL"}
              </button>
              {qualitySelect}
              {fileActions}
              <button onClick={act(share)}>Share this design (copy link)</button>
              {shareArtToggle}
              <hr />
              {compareSelect}
              <button onClick={act(pinCurrent)} disabled={!stl}>
                Pin this model as B (compare)
              </button>
              {PRINTING_GUIDE_URL && (
                <a className="button" href={PRINTING_GUIDE_URL} target="_blank" rel="noreferrer">
                  Printing guide
                </a>
              )}
              {DONATE_URL && (
                <a className="button donate" href={DONATE_URL} target="_blank" rel="noreferrer">
                  ♥ Support Open Mouthpiece (donate)
                </a>
              )}
              <details className="phone-look">
                <summary>Appearance</summary>
                <AppearancePanel />
              </details>
              <details className="phone-look">
                <summary>Code files</summary>
                <div className="phone-code-actions">
                  {openProjectSelect}
                  <button onClick={act(newFile)}>New file</button>
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
        <section className="phone-viewer">
          {viewerEl}
          {statusBar}
        </section>
        <nav className="phone-tabs">
          {panels.map(([k, label]) => (
            <button key={k} className={phonePanel === k ? "active" : ""} onClick={() => setPhonePanel(k)}>
              {label}
            </button>
          ))}
        </nav>
        <section className="phone-panel">
          <div className={`phone-pane${phonePanel === "design" ? "" : " hidden"}`}>{designEl(false)}</div>
          {designOK && <div className={`phone-pane${phonePanel === "readouts" ? "" : " hidden"}`}>{readoutsEl}</div>}
          <div className={`phone-pane code${phonePanel === "code" ? "" : " hidden"}`}>
            {tabBar}
            {editorEl}
          </div>
          <div className={`phone-pane${phonePanel === "console" ? "" : " hidden"}`}>{consoleEl}</div>
        </section>
        {drop}
      </div>
    );
  }

  // ---- desktop: the viewer and the panel (as deep as you open it); the code column on the left
  // when opened (the "Code" strip, or More ▾)
  return (
    <div className={`app${coding ? "" : " design"}${dragging ? " dragging" : ""}`} {...dropProps}>
      {fileInputEl}
      <header className="toolbar">
        <strong className="brand">Open Mouthpiece</strong>
        {voicePicker}
        {fileActions}
        <span className="spacer" />
        {donateLink}
        {shareArtToggle}
        {shareButton}
        {downloadButton}
        {moreMenu}
        <AppearanceMenu />
      </header>
      {shareBox}
      <main
        className="workspace"
        style={{ gridTemplateColumns: `${codeOpen ? `${editorWShown}px 6px` : "30px"} 1fr 5px ${panelWShown}px` }}
      >
        {!codeOpen && (
          <button
            className="editor-strip"
            onClick={() => setCodeOpen(true)}
            title="Show the code editor (OpenSCAD) and console"
          >
            ›<span>Code</span>
          </button>
        )}
        <section className="left" style={codeOpen ? undefined : { display: "none" }}>
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
            <button onClick={newFile} title="New scratch file">
              New
            </button>
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
          {editorEl}
          {consoleEl}
        </section>
        {codeOpen && <div className="splitter" onPointerDown={startDrag} />}
        <section className="center">
          {viewerEl}
          {statusBar}
        </section>
        <div className="splitter panel-edge" onPointerDown={startPanelDrag} title="Drag to resize the panel" />
        <aside className="right">{designEl(true)}</aside>
      </main>
      {drop}
    </div>
  );
}
