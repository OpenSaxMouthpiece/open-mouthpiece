// Rendering the design on screen: a quick draft after each change, then the chosen quality once
// the user pauses (a newer change cancels it), so dragging only ever runs drafts. The full-quality
// run also makes the readouts' reports and the zoom targets (one OpenSCAD run instead of three:
// each run evaluates the whole generator again). After it: the ligature, a model reed and the cap, while shown.
import { useCallback, useRef, useState, type RefObject } from "react";
import { api, base64ToBuffer, type RenderResult, type RenderTarget, type ScadParam } from "../api";
import { parseAirVolume } from "../compare";
import { FOCUS_ECHO, parseFocusEcho, type FocusData } from "../focus";
import { parseShapeEcho, SHAPE_ECHO, type ShapeLines } from "../shapeEdit";
import {
  parseCap,
  parseClearance,
  parseFacing,
  parseLigature,
  type CapInfo,
  type LigatureInfo,
  type Wall,
} from "../readouts";
import { renderEnded, renderStarted, report } from "../report";
import { reportDesign, type Values } from "../app/files";
import { QUALITY_FN, type CapView, type LigatureView, type Quality } from "../app/session";

// action: a button beside the text (a finished download that needs a click of its own).
export type Status = {
  text: string;
  short?: string;
  kind: "idle" | "busy" | "ok" | "error";
  action?: { label: string; run: () => void };
};

export interface RenderState {
  target: RenderTarget | null;
  values: Values;
  params: ScadParam[];
  quality: Quality;
  reportsOn: boolean; // the readouts are on screen
  zoom: boolean; // zoom to parameter is on
  lig: LigatureView; // what of the ligature is shown
  ligOK: boolean; // the file can make a ligature
  cap: CapView; // whether the cap is shown
  capOK: boolean; // the file can make a cap
}

interface Options {
  state: RefObject<RenderState>;
  setStatus: (s: Status) => void;
  setFocusData: (t: RenderTarget, vals: Values, data: Promise<FocusData | null>) => void;
  prefetchFocus: (t: RenderTarget, vals: Values) => void;
}

const REFINE_DELAY = 700; // ms of quiet after a draft before the full-quality render
const SLOW_RENDER_S = 45; // reported to the site's log when a render takes longer
// The "Edit shape" lines ride along with the reports (no measurable cost).
const REPORTS_ECHO = "\nfacing_report();\nclearance_report();\n" + SHAPE_ECHO;
const FACING_ECHO = "\nfacing_report();\n" + SHAPE_ECHO;
// The reports' lines stay out of the console, and so do the WebAssembly build's harmless startup
// complaints (no locale files, no fontconfig file: the generator registers its fonts itself).
const NOISE = /^(Could not initialize localization|Fontconfig error: Cannot load default config file)/;
const withoutNoise = (log: string) =>
  log
    .split("\n")
    .filter((l) => !NOISE.test(l))
    .join("\n");
const withoutReports = (log: string) =>
  withoutNoise(log)
    .split("\n")
    .filter((l) => !/^ECHO: (PARAM_FOCUS|SHAPE_EDIT|"(FACING|CLEARANCE))/.test(l))
    .join("\n");
// Settings that only the accessories read: changing them leaves the mouthpiece as it is (checked by
// rendering the alto with ligature_made, cap_made and several ligature_* / cap_* values changed: the
// mouthpiece STL was byte-identical).
const ACCESSORY_KEY = /^(ligature_|cap_)/;
// Mouthpiece-interior settings the ligature and cap don't read (checked by rendering ligature_seated
// and cap_seated with baffle_, chamber_, throat_ and floor_ settings changed: byte-identical).
export const INTERIOR_PREFIXES = ["baffle_", "chamber_", "throat_", "floor_"];
const withoutKeys = (vals: Values, drop: (k: string) => boolean) =>
  Object.fromEntries(Object.entries(vals).filter(([k]) => !drop(k)));
const targetSig = (t: RenderTarget) =>
  JSON.stringify([t.path, t.name, t.source, Object.entries(t.files).map(([k, v]) => [k, v.length, v])]);
// The other accessories' settings each part ignores (checked the same way: the ligature with cap_*
// changed, the reed with ligature_* and cap_* changed, byte-identical). The cap reads ligature_*.
const IGNORES: Record<string, RegExp> = { ligature_seated: /^cap_/, reed_model: ACCESSORY_KEY };
const partSignature = (t: RenderTarget, vals: Values, fn: number | null, part: string) =>
  JSON.stringify([
    targetSig(t),
    part,
    fn,
    withoutKeys(vals, (k) => INTERIOR_PREFIXES.some((p) => k.startsWith(p)) || !!IGNORES[part]?.test(k)),
  ]);
const withFn = (vals: Values, fn: number | null): Values => (fn === null ? vals : { ...vals, render_fn: fn });

export function useModelRender({ state, setStatus, setFocusData, prefetchFocus }: Options) {
  const [stl, setStl] = useState<ArrayBuffer | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [log, setLog] = useState("");
  const [facing, setFacing] = useState<[number, number][] | null>(null);
  const [wall, setWall] = useState<Wall | null>(null);
  const [shape, setShape] = useState<ShapeLines | null>(null);
  const [air, setAir] = useState<number | null>(null); // inside air volume of the last render
  const [ligStl, setLigStl] = useState<ArrayBuffer | null>(null);
  const [reedStl, setReedStl] = useState<ArrayBuffer | null>(null);
  const [ligInfo, setLigInfo] = useState<LigatureInfo | null>(null);
  const [capStl, setCapStl] = useState<ArrayBuffer | null>(null);
  const [capInfo, setCapInfo] = useState<CapInfo | null>(null);

  const renderAbort = useRef<AbortController | null>(null);
  const reportsAbort = useRef<AbortController | null>(null);
  const refineTimer = useRef<number | undefined>(undefined);
  const shownFn = useRef<number | null>(null); // render_fn of the model on screen (null: the file's own)
  // The model on screen is a draft / has its readouts' reports (or they are on their way).
  const shownDraft = useRef(false);
  const shownReports = useRef(false);
  // What the mouthpiece on screen was last rendered from, and whether a render of it is running.
  const lastMain = useRef<{ tsig: string; vals: Values } | null>(null);
  const mainBusy = useRef(false);

  // The render_fn the quality selector puts in, or null when the file has no render_fn parameter
  // or the user set it themselves.
  const qualityFn = useCallback(
    (q: Quality, vals: Values) =>
      state.current!.params.some((p) => p.name === "render_fn") && !("render_fn" in vals) ? QUALITY_FN[q] : null,
    [state],
  );

  const restart = (ref: React.MutableRefObject<AbortController | null>) => {
    ref.current?.abort();
    ref.current = new AbortController();
    return ref.current;
  };

  // Accessory renders (ligature, reed, cap) run on their own worker lane beside the mouthpiece's, each
  // with its own abort and a signature of what it was made from: asked again for the same thing it
  // does nothing (it's running, or done). A cleared signature (aborted, failed, new design) re-runs.
  const sigs = useRef<Record<string, string>>({});
  const aborts = useRef<Record<string, AbortController | null>>({});
  const [partsBusy, setPartsBusy] = useState<string[]>([]);
  const busyOf = (name: string, on: boolean) =>
    setPartsBusy((b) => (on ? (b.includes(name) ? b : [...b, name]) : b.filter((x) => x !== name)));
  // Stops the accessory renders still running (they re-run when asked again); finished ones keep
  // their signature, so a later pass for the same thing (e.g. after an interior change) skips them.
  const stopParts = () => {
    for (const [k, ac] of Object.entries(aborts.current)) {
      if (!ac) continue;
      ac.abort();
      delete sigs.current[k];
    }
    aborts.current = {};
    setPartsBusy([]);
  };
  const runPart = useCallback(
    async (
      name: string,
      part: string,
      t: RenderTarget,
      vals: Values,
      fn: number | null,
      apply: (r: RenderResult) => void,
    ) => {
      const sig = partSignature(t, vals, fn, part);
      if (sigs.current[name] === sig) return;
      sigs.current[name] = sig;
      aborts.current[name]?.abort();
      const ac = (aborts.current[name] = new AbortController());
      busyOf(name, true);
      try {
        const r = await api.render(t, withFn({ ...vals, part }, fn), ac.signal, "parts");
        if (ac.signal.aborted) return;
        if (!r.ok) delete sigs.current[name];
        apply(r);
      } catch {
        // superseded or failed: the last one stays
        if (!ac.signal.aborted) delete sigs.current[name];
      } finally {
        if (aborts.current[name] === ac) {
          aborts.current[name] = null; // done: nothing to stop
          busyOf(name, false);
        }
      }
    },
    [],
  );

  // The ligature for the model (seated, in the model's frame) and/or a reed: small renders (the band
  // and the reed are simple lofts), each only while shown.
  const loadLigature = useCallback(
    async (t: RenderTarget, vals: Values, fn: number | null) => {
      const { on, reed } = state.current!.lig;
      await Promise.all([
        on &&
          runPart("ligature", "ligature_seated", t, vals, fn, (r) => {
            setLigInfo(parseLigature(r.log));
            setLigStl(r.ok && r.stl ? base64ToBuffer(r.stl) : null);
          }),
        reed &&
          runPart("reed", "reed_model", t, vals, fn, (r) => setReedStl(r.ok && r.stl ? base64ToBuffer(r.stl) : null)),
      ]);
    },
    [state, runPart],
  );

  // The cap for the model, seated on it (the model's frame), only while shown.
  const loadCap = useCallback(
    (t: RenderTarget, vals: Values, fn: number | null) =>
      runPart("cap", "cap_seated", t, vals, fn, (r) => {
        setCapInfo(parseCap(r.log));
        setCapStl(r.ok && r.stl ? base64ToBuffer(r.stl) : null);
      }),
    [runPart],
  );

  // The accessories that are shown, for these values.
  const loadParts = (t: RenderTarget, vals: Values, fn: number | null) => {
    const s = state.current!;
    if ((s.lig.on || s.lig.reed) && s.ligOK) loadLigature(t, vals, fn);
    if (s.cap.on && s.capOK) loadCap(t, vals, fn);
  };

  // The readouts' reports on their own (facing curve, thinnest wall), for when the readouts come
  // into view after a render made without them: one echo run.
  const loadReports = useCallback(
    async (t: RenderTarget, vals: Values) => {
      const ac = restart(reportsAbort);
      shownReports.current = true;
      setWall(null); // "…" while the new model's wall is measured (not the last model's number)
      try {
        // the zoom targets ride along (param_focus() doesn't depend on part): no extra run
        const zoomToo = state.current!.zoom;
        const fp = api.echo(
          { ...t, source: t.source + FACING_ECHO + (zoomToo ? FOCUS_ECHO : "") },
          { ...vals, part: "clearance_report" },
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
        setWall(parseClearance(f.log));
        setShape(parseShapeEcho(f.log, vals));
      } catch {
        // superseded or failed: the cards keep their last values
      }
    },
    [state, setFocusData],
  );

  // draft: a quick pass at Draft quality, followed by the chosen quality after a pause.
  const renderPass = useCallback(
    async (draft: boolean) => {
      const s = state.current!;
      const { target: t, values: vals, quality: q } = s;
      if (!t) return;
      clearTimeout(refineTimer.current);
      const ac = restart(renderAbort);
      mainBusy.current = true;
      lastMain.current = null;
      const fn = qualityFn(draft ? "draft" : q, vals);
      const isDraft = draft && fn !== null && q !== "draft";
      // The accessories start with the final render, on their own lane (not behind it); a draft
      // pass stops them, so dragging only runs drafts.
      if (isDraft) stopParts();
      else if (s.ligOK || s.capOK) loadParts(t, vals, fn);
      setStatus({ text: `Rendering ${t.name}${isDraft ? " (draft)" : ""}…`, short: "Rendering…", kind: "busy" });
      renderStarted(reportDesign(t.path));
      const slow = window.setTimeout(
        () => report("slow-render", `a render is still running after ${SLOW_RENDER_S}s`),
        SLOW_RENDER_S * 1000,
      );
      const withReports = !isDraft && s.reportsOn;
      const focusToo = withReports && s.zoom;
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
        setLog(withReports ? withoutReports(r.log) : withoutNoise(r.log));
        if (withReports && r.ok) {
          reportsAbort.current?.abort(); // an older separate run must not overwrite these
          setFacing(parseFacing(r.log));
          setWall(parseClearance(r.log));
          setShape(parseShapeEcho(r.log, vals));
        }
        const airCm3 = r.ok ? parseAirVolume(r.log) : null;
        setAir(airCm3);
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
          shownDraft.current = isDraft;
          shownReports.current = withReports;
          const airText = airCm3 !== null ? ` · air ${airCm3.toFixed(1)} cm³` : "";
          const label = fn === null ? "" : isDraft ? " · draft, refining…" : ` · ${q}`;
          setStatus({
            text: `${t.name} · 3D · ${tris.toLocaleString()} triangles${airText} · ${secs}${label}`,
            short: `${isDraft ? "Draft" : "Ready"} · ${secs}${isDraft ? " · refining…" : ""}`,
            kind: "ok",
          });
          lastMain.current = { tsig: targetSig(t), vals };
          if (isDraft) refineTimer.current = window.setTimeout(() => renderPass(false), REFINE_DELAY);
          else if (!withReports && s.zoom) prefetchFocus(t, vals);
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
      } finally {
        if (renderAbort.current === ac) mainBusy.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stopParts / loadParts only use refs and state setters
    [state, qualityFn, setStatus, setFocusData, prefetchFocus],
  );

  // A change: a draft pass then the chosen quality. When only accessory settings changed since the
  // mouthpiece on screen was rendered, the mouthpiece stays and just the accessories re-run.
  const render = useCallback(() => {
    const s = state.current!;
    const last = lastMain.current;
    if (last && s.target && !mainBusy.current && !shownDraft.current && last.tsig === targetSig(s.target)) {
      const keys = new Set([...Object.keys(last.vals), ...Object.keys(s.values)]);
      const part = (v: Values) => v.part ?? "mouthpiece";
      const same =
        part(last.vals) === "mouthpiece" &&
        part(s.values) === "mouthpiece" &&
        [...keys].every(
          (k) => ACCESSORY_KEY.test(k) || k === "part" || JSON.stringify(last.vals[k]) === JSON.stringify(s.values[k]),
        );
      if (same) {
        clearTimeout(refineTimer.current);
        loadParts(s.target, s.values, shownFn.current);
        return;
      }
    }
    return renderPass(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadParts only uses refs and state setters
  }, [state, renderPass]);

  // The model on screen (part null) or another part, for a download: at the chosen quality, Normal
  // at least (never a draft); the model on screen when it already is that. extra: settings on top
  // (the print kit's test rings at other clearances).
  const partStl = useCallback(
    async (part: string | null, extra?: Values): Promise<ArrayBuffer> => {
      const { target: t, values: vals, quality: q } = state.current!;
      if (!t) throw new Error("no model yet");
      const fn = qualityFn(q === "draft" ? "normal" : q, vals);
      if (!part && !extra && stl && (fn === null || fn === shownFn.current)) return stl;
      const r = await api.render(t, withFn({ ...vals, ...extra, ...(part ? { part } : {}) }, fn));
      if (!r.ok || !r.stl) throw new Error("the render failed (the console says why)");
      return base64ToBuffer(r.stl);
    },
    [state, qualityFn, stl],
  );

  // The numbers for the print kit's check card, fresh for the settings now: one echo-only run
  // (the summary, the facing and the thinnest wall).
  const kitReports = useCallback(async () => {
    const { target: t, values: vals } = state.current!;
    if (!t) throw new Error("no model yet");
    const r = await api.echo(
      { ...t, source: t.source + "\nfacing_report();\n" },
      { ...vals, part: "clearance_report" },
    );
    return { log: r.log, facing: parseFacing(r.log), wall: parseClearance(r.log) };
  }, [state]);

  // The readouts are showing but the model on screen came without their reports (it was rendered
  // before they showed, e.g. before the file's parameters had loaded at startup): fetch them.
  const ensureReports = useCallback(() => {
    const s = state.current!;
    if (s.reportsOn && s.target && !shownDraft.current && !shownReports.current) loadReports(s.target, s.values);
  }, [state, loadReports]);

  // The accessories shown but not made for the model on screen (they were turned on, or the model was
  // rendered before the file's parameters said it has them, as after a reload): make them. Asked
  // again for the same thing it does nothing (runPart's signatures); not for a draft.
  const ensureParts = useCallback(() => {
    const s = state.current!;
    if (s.target && !shownDraft.current && !mainBusy.current && (s.ligOK || s.capOK))
      loadParts(s.target, s.values, shownFn.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadParts only uses refs and state setters
  }, [state]);

  // A model shown without rendering it (B swapped in as A).
  const showModel = (buf: ArrayBuffer | null) => {
    setStl(buf);
    setSvg(null);
  };
  const clearLigature = () => {
    stopParts();
    sigs.current = {};
    setLigStl(null);
    setReedStl(null);
    setLigInfo(null);
    setCapStl(null);
    setCapInfo(null);
    stopParts();
  };

  return {
    stl,
    svg,
    log,
    setLog,
    facing,
    wall,
    shape,
    air,
    ligStl,
    reedStl,
    ligInfo,
    capStl,
    capInfo,
    partsBusy,
    loadCap,
    shownFn,
    shownDraft,
    render,
    renderPass,
    loadLigature,
    ensureReports,
    ensureParts,
    partStl,
    kitReports,
    showModel,
    clearLigature,
  };
}
