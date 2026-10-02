// Small UI preferences kept in this browser (a convenience only: the page works without storage):
// which panel sections are open, descriptions shown, panel width, the appearance settings.
// One store with subscribers, so every component that reads a preference follows a change.
import { useCallback, useSyncExternalStore } from "react";

const KEY = "open-mouthpiece-ui-v1";
let prefs: Record<string, unknown> = (() => {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
})();
const subs = new Set<() => void>();
export const subscribePrefs = (fn: () => void) => {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
};

export function getPref<T>(key: string, initial: T): T {
  return (key in prefs ? prefs[key] : initial) as T;
}
export function setPref<T>(key: string, value: T) {
  prefs = { ...prefs, [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable: kept for this page only
  }
  subs.forEach((fn) => fn());
}

// `initial` must be a primitive or a stable (module-level) object: it is the snapshot while unset.
export function usePref<T>(key: string, initial: T): [T, (v: T | ((old: T) => T)) => void] {
  const value = useSyncExternalStore(subscribePrefs, () => getPref(key, initial));
  const set = useCallback(
    (v: T | ((old: T) => T)) => {
      setPref(key, typeof v === "function" ? (v as (old: T) => T)(getPref(key, initial)) : v);
    },
    [key, initial],
  );
  return [value, set];
}

// Which collapsible sections are open (all closed by default).
const OPEN = "open";
const NONE: string[] = [];
export const useSectionOpen = (id: string): [boolean, (on: boolean) => void] => {
  const [open, setOpen] = usePref<string[]>(OPEN, NONE);
  return [
    open.includes(id),
    (on: boolean) => setOpen((o) => (on ? [...o.filter((x) => x !== id), id] : o.filter((x) => x !== id))),
  ];
};
export const setSectionsOpen = (ids: string[], on: boolean) => {
  const o = getPref<string[]>(OPEN, []);
  setPref(OPEN, on ? [...new Set([...o, ...ids])] : o.filter((x) => !ids.includes(x)));
};
