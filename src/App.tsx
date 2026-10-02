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
import { DesignPanel } from "./components/DesignPanel";
import { FacingChart } from "./components/FacingChart";
import { Readouts } from "./components/Readouts";
import { TabBar } from "./components/TabBar";
import { CompareSelect, groupFiles, VoicePicker, type ComparePick } from "./components/FilePickers";
import { SaveAsPanel, SAVE_DEFAULTS, wantsFiles, type SaveOpts } from "./components/SaveAsPanel";
import { LigatureHead } from "./components/LigatureHead";
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
import { FACING_CHOICES, hasDesignParams } from "./design";
import { parseFacing, parseSummary } from "./readouts";
import { findPointLists, type Pt } from "./curves";
import { clearShare, encodeShare, readShare, type SharedDesign } from "./share";
import { migrateScad } from "./migrate";
import { imageRefs, isUserArt, receiveArt, sharedArt } from "./userArt";
import { DONATE_URL, PRINTING_GUIDE_URL, REPO_URL } from "./links";
import { setSectionsOpen, usePref } from "./uiPrefs";
import {
  DEFAULT_FILE,
  LOCAL,
  NO_VALUES,
  baseName,
  download,
  downloadName,
  fileName,
  isDirty,
  isLibrary,
  localTab,
  otherPartOf,
  partName,
  projectTab,
  reportDesign,
  scadFileName,
  voiceLabel,
  type Tab,
  type Values,
} from "./app/files";
import { loadSession, readFlag, saveSession, writeFlag, type LigatureView, type Quality } from "./app/session";
import { startDrag, useMediaQuery, useWindowWidth } from "./hooks/useMediaQuery";
import { useValueHistory } from "./hooks/useValueHistory";
import { useParamFocus } from "./hooks/useParamFocus";
import { useModelRender, type RenderState, type Status } from "./hooks/useModelRender";

const HINT_KEY = "open-mouthpiece-hint-v1";
// Point lists set as values (the Customizer can't show them), kept while the parameter that uses
// them is there: the facing chart's gauge points (facing_model = "gauge").
const POINT_VALUES: Record<string, string> = { facing_gauge_points: "facing_model" };
const QUALITY_HINT =
  "Model detail: Draft is fastest, Fine slowest. Changes show a quick draft first, then this quality once you pause. Downloads are always at least Normal.";
const MIN_EDITOR_W = 260;
const MIN_PANEL_W = 320;

type Download = { what: "model" | "ligature"; state: "busy" | "done" | "error" };

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

  // ---- settings and layout
  const [auto, setAuto] = useState(saved.auto ?? true);
  const [zoom, setZoom] = useState(saved.zoom ?? true);
  const [quality, setQuality] = useState<Quality>(saved.quality ?? "normal");
  const [editorW, setEditorW] = useState(saved.editorW ?? Math.round(window.innerWidth * 0.36));
  const [panelW, setPanelW] = usePref("panelW", 380); // the right panel (drag its edge)
  const [codeOpen, setCodeOpen] = usePref("codeOpen", false); // the code editor + console column (desktop)
  const winW = useWindowWidth();
  const isPhone = useMediaQuery("(max-width: 1024px)"); // phones and portrait tablets
  const [phonePanel, setPhonePanel] = useState<"design" | "readouts" | "code" | "console">("design");
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
  const [hintSeen, setHintSeen] = useState(() => readFlag(HINT_KEY)); // the first-visit hint card
  const [shareLink, setShareLink] = useState<string | null>(null); // shown when the clipboard refuses
  const [shareArt, setShareArt] = useState(false); // put the user's own picture in the share link
  const [saveAs, setSaveAs] = useState<string | null>(null); // the Save as name while it's open
  const [saveOpts, setSaveOpts] = usePref<SaveOpts>("saveAs", SAVE_DEFAULTS);
  const [armedClose, setArmedClose] = useState<string | null>(null); // close clicked once on an unsaved tab
  const [armedDelete, setArmedDelete] = useState<string | null>(null); // Delete clicked once on a saved design
  const [dragging, setDragging] = useState(false); // a file dragged over the page
  // How the ligature is shown (a view setting); whether one is made is the design's ligature_made.
  const [lig, setLig] = useState<LigatureView>({ on: true, beside: false, reed: false, ...saved.ligature });
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
  const reportsOn = designOK && (!isPhone || phonePanel === "design" || phonePanel === "readouts");
  // Not a mouthpiece: no readouts (while the params load they're assumed, so the layout doesn't jump).
  const noReadouts = !designOK && !!mainTab && paramsKey === mainTab.key;
  const param = (n: string) => params.find((p) => p.name === n);
  // The file has the ligature's settings (a mouthpiece made by the generator), and the mouthpiece is what's shown.
  const ligOK = !!param("ligature_length") && !otherPart;
  // A ligature is made when the design says so (ligature_made: kept in saves, downloads and links).
  const ligMade =
    ligOK && ("ligature_made" in values ? values.ligature_made : param("ligature_made")?.initial) === true;
  const ligView = { ...lig, on: ligMade && lig.on };

  // Latest state for async callbacks.
  const liveState = {
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
  const live = useRef(liveState);
  live.current = liveState;

  // ---- rendering (hooks/useModelRender.ts) and zoom to parameter (hooks/useParamFocus.ts)
  const { focus, focusOn, setFocusData, prefetchFocus } = useParamFocus(live);
  const model = useModelRender({ state: live as React.RefObject<RenderState>, setStatus, setFocusData, prefetchFocus });
  const { stl, svg, log, facing, wall, air, render, renderPass, partStl } = model;
  const summary = useMemo(() => (log ? parseSummary(log) : null), [log]);

  // Errors go to the site's log (src/report.ts), with the render's first OpenSCAD error line.
  useEffect(() => {
    if (status.kind === "error")
      report("error", status.text, { openscad: /^ERROR: .*$/m.exec(log)?.[0]?.slice(0, 300) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per error, with the log of that moment
  }, [status.kind, status.text]);
  useEffect(
    () => setReportContext({ design: reportDesign(mainTab?.path ?? null), changed: Object.keys(values) }),
    [mainTab?.path, values],
  );
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
    });
  }, [ready, tabs, activeKey, mainKey, valuesByKey, auto, zoom, editorW, pinned, quality, lig]);

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
  const openLocalFile = async (file: File) => openTab(localTab(file.name, migrateScad(await file.text()), taken));

  const newFile = () => {
    let n = 1;
    while (taken(`${LOCAL}untitled${n}.scad`)) n++;
    openTab(localTab(`untitled${n}`, "cube(10);\n", taken));
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
    const rest = tabs.filter((x) => x.key !== key);
    setTabs(rest);
    if (activeKey === key && rest.length) activate(rest[rest.length - 1].key, rest);
    if (mainKey === key) setMainKey(rest.find((x) => !isLibrary(x))?.key ?? rest[0]?.key ?? "");
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
    const t = live.current.tabs.find((x) => x.key === mainKey);
    if (!t) return;
    const src = isRO(t) ? undefined : t.source;
    const vals = { ...live.current.values };
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
    }, 400);
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
  const pinCurrent = () => {
    if (!current) return;
    setPinned({ ...current, values: { ...current.values }, files: { ...current.files } });
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
    setPinned({ ...current });
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
  const labelOf = (s: { name: string; path: string | null }) => (s.path ? voiceLabel(s.path) : s.name);
  const labelA = labelOf(mainTab);
  const labelB = pinned ? labelOf(pinned) : undefined;

  // ---- downloads
  const downloadPart = async (what: "model" | "ligature") => {
    if (dl?.state === "busy") return;
    const suffix = what === "ligature" ? "_ligature" : otherPart ? `_${otherPart}` : "";
    const name = downloadName(mainTab, values, isRO(mainTab)) + suffix;
    if (what === "model" && svg && !stl) {
      download(svg, "image/svg+xml", `${name}.svg`);
      setDl({ what, state: "done" });
      return;
    }
    setDl({ what, state: "busy" });
    notify({ text: `Making ${name}.stl for the download…`, short: "Preparing the download…", kind: "busy" });
    try {
      download(await partStl(what === "ligature" ? "ligature" : null), "model/stl", `${name}.stl`);
      notify({ text: `Downloaded ${name}.stl`, short: "Downloaded", kind: "ok" });
      setDl({ what, state: "done" });
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
  // One self-contained file of plain OpenSCAD (bundle.ts): the settings, then the generator.
  const fullScad = () =>
    bundleDesign({
      source: mainTab.source,
      path: mainTab.path,
      values,
      // an open tab's unsaved text is what the model on screen uses
      readFile: async (p) => tabs.find((t) => t.path === p)?.source ?? (await api.file(p)).source,
      date: new Date().toLocaleDateString("sv-SE"), // YYYY-MM-DD, local
    });
  const downloadScad = async () => {
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
  const saveDesignAs = async (typed: string) => {
    const p = scadFileName(typed);
    if (!p) return fail({ text: "Save as: give the design a name", kind: "error" });
    const name = baseName(p);
    const out: [string, Uint8Array<ArrayBuffer>][] = [];
    const enc = new TextEncoder();
    try {
      if (wantsFiles(opts, ligMade))
        notify({ text: `Making the files for ${name}…`, short: "Preparing the files…", kind: "busy" });
      if (opts.full) out.push([`${name}.scad`, enc.encode(await fullScad())]);
      // settings-only: the voice file with these values; its include as the site resolves it
      if (opts.settings)
        out.push([
          `${name}_settings.scad`,
          enc.encode(withValues(mainTab.source, values).replace(/include\s*<(\.\.\/)+lib\//, "include <lib/")),
        ]);
      if (opts.stl) out.push([`${name}${otherPart ? `_${otherPart}` : ""}.stl`, new Uint8Array(await partStl(null))]);
      if (opts.ligature && ligatureFile) out.push([`${name}_ligature.stl`, new Uint8Array(await partStl("ligature"))]);
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
      const rest = tabs.filter((x) => x.key !== p);
      setTabs(rest);
      dropValues(p);
      if (mainKey === p) {
        const next = rest.find((x) => !isLibrary(x));
        if (next) activate(next.key, rest);
        else openProjectFile(DEFAULT_FILE);
      }
      refreshFiles().catch(() => {});
      notify({ text: `Deleted “${voiceLabel(p)}” from this browser`, kind: "ok" });
    } catch (err) {
      fail({ text: `Delete failed: ${(err as Error).message}`, kind: "error" });
    }
  };

  // ---- the ligature
  const makeLigature = () => {
    setValue("ligature_made", false, true);
    setLig((l) => ({ ...l, on: true, reed: true }));
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
      {files.map((f) => (
        <option key={f} value={f}>
          {f}
        </option>
      ))}
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
      onActivate={activate}
      onClose={closeTab}
    />
  );
  const statusBar = (
    <div className={`status ${(notice ?? status).kind}`}>
      <span>{coding ? (notice ?? status).text : ((notice ?? status).short ?? (notice ?? status).text)}</span>
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
  const consoleEl = <Console log={log} onGoto={goto} onClear={() => model.setLog("")} />;
  const hintEl = !hintSeen && (
    <div className="hint-card">
      <b>Design your own saxophone mouthpiece</b>
      <ol>
        <li>Pick a voice (soprano, alto, tenor, baritone).</li>
        <li>Adjust the tip, facing, chamber and baffle; the model and the readouts follow.</li>
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
      <button
        onClick={() => {
          setHintSeen(true);
          writeFlag(HINT_KEY);
        }}
      >
        Got it
      </button>
    </div>
  );
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
      busy={status.kind === "busy" || notice?.kind === "busy"}
      busyLabel={
        dlBusy("ligature")
          ? "Making the ligature for download…"
          : dlBusy("model")
            ? "Making the STL for download…"
            : undefined
      }
      simple={!coding}
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
  // Desktop: the readouts as a strip above the controls. Phone: the readouts are a tab of their own.
  const readoutsEl = otherPart ? (
    <PartNote part={otherPart} log={log} />
  ) : (
    <Readouts
      summary={summary}
      wall={wall}
      busy={status.kind === "busy"}
      compact={!isPhone}
      compare={pinned ? { summary: pinned.summary ?? null, air: pinned.air ?? null } : null}
    />
  );
  const ligHead = (
    <LigatureHead
      made={ligMade}
      view={lig}
      info={model.ligInfo}
      downloadLabel={dlLabel("ligature", "Download ligature STL")}
      downloading={dlBusy("ligature")}
      onMake={makeLigature}
      onView={(c) => setLig((l) => ({ ...l, ...c }))}
      onDownload={() => downloadPart("ligature")}
      onRemove={() => setValue("ligature_made", false, undefined)}
    />
  );
  // Going deeper, after All parameters: the file's curves, and A/B compare while a B is pinned.
  const deeperEl = (
    <>
      <Fold id="d:curves" title="Curves">
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
      </Fold>
      {pinned && current && (
        <Fold id="d:compare" title="Compare A/B" summary={`with ${labelB ?? pinned.name}`}>
          <ComparePanel
            a={current}
            b={pinned}
            labelA={labelA}
            labelB={labelB ?? pinned.name}
            onSwap={swap}
            onClear={clearB}
            onUseB={(n, v) => setValue(n, param(n)?.initial, v)}
          />
        </Fold>
      )}
    </>
  );
  const designEl = (withReadouts: boolean) => (
    <DesignPanel
      params={params}
      values={values}
      failed={status.kind === "error" && params.length === 0}
      loading={paramsKey !== mainTab.key}
      title={voiceLabel(mainTab.path ?? mainTab.name)}
      onChange={(n, v) => setValue(n, undefined, v)}
      onResetAll={() => setValuesByKey((all) => ({ ...all, [mainTab.key]: {} }))}
      zoom={zoom}
      onZoomChange={setZoom}
      onFocusParam={focusOn}
      readouts={withReadouts && !noReadouts ? readoutsEl : undefined}
      history={history}
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
  const downloadDisabled = (!stl && !svg) || dlBusy("model");
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
  const sourceLink = REPO_URL && (
    <a className="button" href={REPO_URL} target="_blank" rel="noreferrer">
      Source code (GitHub)
    </a>
  );

  // ---- phone: viewer on top, one panel below (Design goes as deep as you open it; the code has its
  // own tabs), everything else in the ☰ menu
  if (isPhone) {
    const panels: [typeof phonePanel, string][] = [
      ["design", "Design"],
      ...(designOK ? [["readouts", "Readouts"] as [typeof phonePanel, string]] : []),
      ["code", "Code"],
      ["console", "Console"],
    ];
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
          {voicePicker}
          {coding && !auto ? (
            <button className="primary" onClick={render}>
              Render
            </button>
          ) : (
            <button
              className="primary dl-button"
              onClick={() => downloadPart("model")}
              disabled={downloadDisabled}
              aria-live="polite"
            >
              {dlLabel("model", svg ? "SVG" : "STL")}
            </button>
          )}
        </header>
        {menuOpen && (
          <div className="phone-menu" onClick={(e) => e.target === e.currentTarget && setMenuOpen(false)}>
            <div className="phone-menu-body">
              <button onClick={act(() => downloadPart("model"))} disabled={downloadDisabled}>
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
              {printingGuideLink}
              {sourceLink}
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
          {pane("design", designEl(false))}
          {designOK && pane("readouts", readoutsEl)}
          {pane(
            "code",
            <>
              {tabBar}
              {editorEl}
            </>,
            " code",
          )}
          {pane("console", consoleEl)}
        </section>
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
          {coding && (
            <button onClick={menuAction(close, () => fileInput.current?.click())}>Open .scad from this device…</button>
          )}
          {coding && (
            <button
              onClick={menuAction(close, downloadScad)}
              title="One self-contained .scad file (your settings + the generator): opens in any OpenSCAD, and here again with Open"
            >
              Download the design as .scad
            </button>
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
  return (
    <div className={appClass} {...dropProps}>
      {fileInputs}
      <header className="toolbar">
        <strong className="brand">Open Mouthpiece</strong>
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
        <button onClick={share} title="Copy a link that opens this design">
          Share
        </button>
        <button
          className="primary dl-button"
          disabled={downloadDisabled}
          onClick={() => downloadPart("model")}
          title="Download the model to print"
          aria-live="polite"
        >
          {dlLabel("model", `Download ${svg ? "SVG" : "STL"}`)}
        </button>
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
        {codeOpen && (
          <div
            className="splitter"
            onPointerDown={(e) => {
              const w0 = editorWShown;
              startDrag(e, (dx) => setEditorW(Math.max(MIN_EDITOR_W, Math.min(window.innerWidth - 500, w0 + dx))));
            }}
          />
        )}
        <section className="center">
          {viewerEl}
          {statusBar}
        </section>
        <div
          className="splitter panel-edge"
          title="Drag to resize the panel"
          onPointerDown={(e) => {
            const w0 = panelWShown;
            startDrag(e, (dx) =>
              setPanelW(Math.round(Math.max(MIN_PANEL_W, Math.min(window.innerWidth * 0.5, w0 - dx)))),
            );
          }}
        />
        <aside className="right">{designEl(true)}</aside>
      </main>
      {dropHint}
    </div>
  );
}
