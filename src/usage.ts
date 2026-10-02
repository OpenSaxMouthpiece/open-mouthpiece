// Anonymous usage, so we can see how the app is used and what people print (the Worker's
// /api/usage -> the USAGE database; scripts/usage.mjs reads it). Small events: a visit (phone or
// desktop, window width, language, the site it came from), the design opened (a preset's name or
// "own design"), the NAMES of settings touched, sections opened, features used, and on a download
// the design's numbers (numeric and dropdown settings, readouts). Never lettering, pictures, file
// names or curve points; no IP address, no cookie, no ID that lasts past the page (a random visit
// id links one visit's events, nothing links visits). Only on the published site, and off when the
// ⚙ menu's "Share anonymous usage" is unchecked (the same pref as the error reports, src/report.ts).
import type { ParamValue, ScadParam } from "./api";
import { currentDesign, reportsEnabled } from "./report";

declare const __BUILD__: string;

interface UsageEvent {
  t: number; // ms since the visit started
  kind: string;
  name?: string;
  design: string;
  data?: Record<string, unknown>;
}

const START = Date.now();
const VISIT = Math.random().toString(36).slice(2, 10);
const MAX_EVENTS = 400; // per page
const FLUSH_MS = 20000;
const SETTING_GAP_MS = 5000; // a slider drag counts once

let queue: UsageEvent[] = [];
let total = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const lastSetting = new Map<string, number>();

function send(events: UsageEvent[]) {
  const body = JSON.stringify({
    visit: VISIT,
    build: typeof __BUILD__ === "string" ? __BUILD__ : "?",
    device: matchMedia("(max-width: 700px)").matches ? "phone" : "desktop",
    events,
  });
  const url = new URL("api/usage", document.baseURI).href;
  if (!navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" })))
    fetch(url, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(
      () => {},
    );
}

function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!queue.length) return;
  const batch = queue;
  queue = [];
  try {
    send(batch);
  } catch {
    // usage must never break the page
  }
}

export function track(kind: string, name?: string, data?: Record<string, unknown>) {
  try {
    if (!reportsEnabled() || total >= MAX_EVENTS) return;
    total++;
    queue.push({ t: Date.now() - START, kind, name, design: currentDesign(), data });
    if (queue.length >= 40) flush();
    else if (!timer) timer = setTimeout(flush, FLUSH_MS);
  } catch {
    // never break the page
  }
}

// A setting changed: once per setting per few seconds (a slider drag is many changes).
export function trackSetting(name: string) {
  const now = Date.now();
  if (now - (lastSetting.get(name) ?? 0) < SETTING_GAP_MS) return;
  lastSetting.set(name, now);
  track("setting", name);
}

// The design's numbers at a download: every numeric, on/off and dropdown setting (not text,
// pictures or curve points), whether changed or not, so each print is complete on its own.
export function designNumbers(params: ScadParam[], values: Record<string, ParamValue>) {
  const out: Record<string, ParamValue> = {};
  for (const p of params) {
    const v = p.name in values ? values[p.name] : p.initial;
    if (typeof v === "number" || typeof v === "boolean") out[p.name] = v;
    else if (typeof v === "string" && p.options?.length) out[p.name] = v;
  }
  return out;
}

// The visit itself, once.
export function trackVisit() {
  let ref = "";
  try {
    ref = document.referrer ? new URL(document.referrer).hostname : "";
  } catch {
    // no referrer
  }
  track("visit", undefined, {
    width: Math.round(innerWidth / 100) * 100,
    lang: navigator.language,
    ref: ref && ref !== location.hostname ? ref : "",
  });
}

addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flush();
});
addEventListener("pagehide", flush);
