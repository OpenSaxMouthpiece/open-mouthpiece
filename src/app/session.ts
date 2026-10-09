// The session kept in this browser between visits: open tabs, changed values, layout, model B.
import type { PartTab } from "../design";
import type { Snapshot } from "../compare";
import {
  CHAMBER_BEFORE,
  chamberBefore,
  migrateChamberValues,
  migratePath,
  migrateScad,
  migrateValues,
} from "../migrate";
import type { Tab, Values } from "./files";

const STORE_KEY = "open-mouthpiece-session-v1";
const OLD_STORE_KEY = "scad-playground-v2"; // read once, then removed on the next save

// Render quality = the model's render_fn (points per ring, rings per mm), for files that declare
// it and when the user hasn't set it in the Customizer.
export type Quality = "draft" | "normal" | "fine";
export const QUALITY_FN: Record<Quality, number> = { draft: 32, normal: 64, fine: 96 };

export interface LigatureView {
  on: boolean; // shown on (or beside) the model
  beside: boolean;
  reed: boolean; // a model reed shown with it
}

export interface CapView {
  on: boolean; // shown on (or beside) the model
  beside: boolean;
}

export interface Session {
  tabs: Tab[];
  activeKey: string;
  mainKey: string;
  valuesByKey: Record<string, Values>;
  auto: boolean;
  zoom: boolean;
  editorW: number;
  pinned: Omit<Snapshot, "stl" | "params"> | null; // re-rendered on load
  quality: Quality;
  ligature?: Partial<LigatureView>;
  cap?: Partial<CapView>;
  partTab?: PartTab; // the settings tab open
  chamberMm?: true; // saved since chamber_width is in mm again (2026-10-10; see migrate.ts)
}

export function loadSession(): Partial<Session> {
  try {
    // variant paths from before their rename, wherever the session names them (migratePath)
    const s = JSON.parse(
      migratePath(localStorage.getItem(STORE_KEY) ?? localStorage.getItem(OLD_STORE_KEY) ?? "{}"),
    ) as Partial<Session>;
    // designs from before the parameter renames (migrate.ts)
    // a session from before chamber_width (mm): each design's values against its file as it was then
    if (!s.chamberMm) {
      const before = (key: string, text?: string | null) =>
        chamberBefore(text) ?? CHAMBER_BEFORE[key.replace(/^project\//, "")] ?? null;
      const old = new Map((s.tabs ?? []).map((t) => [t.key, t.source]));
      if (s.valuesByKey)
        s.valuesByKey = Object.fromEntries(
          Object.entries(s.valuesByKey).map(([k, v]) => [
            k,
            migrateChamberValues(migrateValues(v), before(k, old.get(k))),
          ]),
        );
      if (s.pinned)
        s.pinned = {
          ...s.pinned,
          values: migrateChamberValues(migrateValues(s.pinned.values), before(s.pinned.path ?? "", s.pinned.source)),
          source: migrateScad(s.pinned.source),
        };
    }
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

export function saveSession(s: Session) {
  try {
    localStorage.removeItem(OLD_STORE_KEY);
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    // storage unavailable or full: fine, nothing to persist
  }
}

export function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writeFlag(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // storage unavailable: the flag just isn't remembered
  }
}
