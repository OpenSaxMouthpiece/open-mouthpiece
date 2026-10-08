// Undo / redo of setting changes, per design (Ctrl+Z / Ctrl+Y outside the code editor and text
// boxes, and the settings panel's arrows). Every change of the values counts (sliders, Reset, facing
// picks, "use B"); quick changes of the same setting (a slider drag) are one step.
import { useEffect, useRef, useState } from "react";
import type { Values } from "../app/files";

interface History {
  past: Values[];
  future: Values[];
  last: Values;
  at: number; // time of the last change
  keys: string; // the settings it changed
}

const MERGE_MS = 700;
const MAX_STEPS = 200;

const sameValues = (a: Values, b: Values) => {
  const ka = Object.keys(a);
  return (
    ka.length === Object.keys(b).length && ka.every((k) => k in b && JSON.stringify(a[k]) === JSON.stringify(b[k]))
  );
};

export function useValueHistory(key: string, values: Values, setValues: (key: string, v: Values) => void) {
  const hist = useRef(new Map<string, History>());
  const applying = useRef(false);
  const [, bump] = useState(0);

  useEffect(() => {
    if (!key) return;
    const h = hist.current.get(key);
    if (!h) {
      hist.current.set(key, { past: [], future: [], last: values, at: 0, keys: "" });
      return;
    }
    if (h.last === values) return;
    if (applying.current) {
      applying.current = false;
    } else {
      const keys = [...new Set([...Object.keys(h.last), ...Object.keys(values)])]
        .filter((k) => JSON.stringify(h.last[k]) !== JSON.stringify(values[k]))
        .join(",");
      const now = performance.now();
      if (h.past.length && sameValues(h.past[h.past.length - 1], values)) {
        // back to where the last step started: that step is undone, not a new one
        h.past.pop();
        h.future = [];
        h.at = 0;
        h.last = values;
        bump((n) => n + 1);
        return;
      }
      if (!(now - h.at < MERGE_MS && keys === h.keys && h.past.length)) h.past.push(h.last);
      if (h.past.length > MAX_STEPS) h.past.shift();
      h.future = [];
      h.at = now;
      h.keys = keys;
    }
    h.last = values;
    bump((n) => n + 1);
  }, [key, values]);

  const step = (redo: boolean) => {
    const h = hist.current.get(key);
    const v = (redo ? h?.future : h?.past)?.pop();
    if (!h || !v) return;
    (redo ? h.past : h.future).push(h.last);
    h.at = 0;
    applying.current = true;
    setValues(key, v);
  };

  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k !== "z" && k !== "y") return;
      const t = e.target as HTMLElement | null;
      // the code editor and text boxes have their own undo
      if (t?.closest(".cm-editor") || t?.matches("textarea, input[type=text], input[type=number], input[type=search]"))
        return;
      e.preventDefault();
      stepRef.current(k === "y" || e.shiftKey);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const h = hist.current.get(key);
  return { canUndo: !!h?.past.length, canRedo: !!h?.future.length, step };
}
