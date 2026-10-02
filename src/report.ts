// Error reports to the site's own log (the Cloudflare Worker's /api/log -> Workers Logs), so a
// problem a player hits shows up without them having to tell us. Anonymous and small: what went
// wrong, which kind of design (a preset's name, or "own design"), the NAMES of the settings changed
// from it (never their values, lettering or file text), the app build and the browser. Only on the
// published site (not in `npm run dev` or on localhost), at most a few per page, never repeated,
// and off when the ⚙ menu's "Send error reports" is unchecked.
import { getPref } from "./uiPrefs";

declare const __BUILD__: string;

export interface ReportContext {
  design: string; // "alto.scad", "variants/alto_ash.scad", or "own design"
  changed: string[]; // names of the settings changed from the file
}

const MAX_PER_PAGE = 8;
const sent = new Set<string>();
let context: ReportContext = { design: "", changed: [] };
export const setReportContext = (c: ReportContext) => {
  context = c;
};

export const currentDesign = () => context.design;

// The ⚙ menu's "Share anonymous usage" covers these reports and the usage events (src/usage.ts);
// the pref keeps its old name, so whoever turned error reports off stays out of both.
export const reportsEnabled = () =>
  import.meta.env.PROD &&
  !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) &&
  getPref("errorReports", true);

export function report(kind: string, message: string, extra: Record<string, unknown> = {}) {
  try {
    if (!reportsEnabled()) return;
    const key = `${kind}|${message}`;
    if (sent.has(key) || sent.size >= MAX_PER_PAGE) return;
    sent.add(key);
    const body = JSON.stringify({
      kind,
      message: message.slice(0, 500),
      ...extra,
      design: context.design,
      changed: context.changed.slice(0, 40),
      build: typeof __BUILD__ === "string" ? __BUILD__ : "?",
      ua: navigator.userAgent.slice(0, 200),
    });
    const url = new URL("api/log", document.baseURI).href;
    if (!navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" })))
      fetch(url, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(
        () => {},
      );
  } catch {
    // reporting must never break the page
  }
}

// A render that never came back (the page froze): a marker is set while a render runs and cleared
// when it ends, or when the page is closed normally (a frozen page can't run that); one still there
// on the next visit is reported then.
const RENDER_MARK = "open-mouthpiece-rendering";
export function renderStarted(design: string) {
  try {
    localStorage.setItem(RENDER_MARK, JSON.stringify({ at: Date.now(), design }));
  } catch {
    /* no storage */
  }
}
export function renderEnded() {
  try {
    localStorage.removeItem(RENDER_MARK);
  } catch {
    /* no storage */
  }
}
export function reportUnfinishedRender() {
  try {
    const m = localStorage.getItem(RENDER_MARK);
    localStorage.removeItem(RENDER_MARK);
    if (!m) return;
    const { at, design } = JSON.parse(m) as { at: number; design: string };
    const age = Math.round((Date.now() - at) / 1000);
    report("unfinished-render", `the last visit ended during a render (${design}), ${age}s ago`);
  } catch {
    /* no storage */
  }
}

// Uncaught errors in the page.
export function watchPageErrors() {
  window.addEventListener("pagehide", renderEnded);
  window.addEventListener("error", (e) => {
    // the browser's harmless "ResizeObserver loop ..." notice (no script file) isn't a page error
    if (/^ResizeObserver loop/.test(e.message ?? "")) return;
    report("page-error", `${e.message} @ ${e.filename?.split("/").pop()}:${e.lineno}`);
  });
  window.addEventListener("unhandledrejection", (e) =>
    report("page-error", `unhandled: ${String((e.reason as Error)?.message ?? e.reason)}`),
  );
}
