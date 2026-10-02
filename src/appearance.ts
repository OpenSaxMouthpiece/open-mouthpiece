// Appearance settings (the ⚙ menu): light/dark theme (or follow the system), the model's colour and
// the viewer's background, grid and axes. Kept in this browser with the other UI preferences.
// Importing this module applies the theme to <html data-theme> and keeps it applied.
import { useSyncExternalStore } from "react";
import { getPref, subscribePrefs, usePref } from "./uiPrefs";

export type ThemeChoice = "system" | "dark" | "light";
export interface Look {
  theme: ThemeChoice;
  model: string; // model colour, #rrggbb
  background: "theme" | "solid" | "gradient";
  bg: string; // background colour for solid / gradient
  grid: boolean;
  axes: boolean;
}
export const DEFAULT_LOOK: Look = {
  theme: "dark",
  model: "#f2c14e",
  background: "theme",
  bg: "#3a4150",
  grid: true,
  axes: false,
};
const KEY = "look";

export const MODEL_COLORS: [string, string][] = [
  ["Gold", "#f2c14e"],
  ["Ivory", "#ece3cc"],
  ["Black", "#2c2e33"],
  ["Silver", "#b9c0cb"],
  ["Red", "#c8413a"],
  ["Green", "#3f9e6e"],
  ["Purple", "#8a63d2"],
];
export const BG_COLORS: [string, string][] = [
  ["Slate", "#3a4150"],
  ["Night", "#101218"],
  ["Studio grey", "#8a8f99"],
  ["Paper", "#f4f1ea"],
  ["Sky", "#bcd4ea"],
];

const lookOf = (v: Partial<Look> | undefined): Look => ({ ...DEFAULT_LOOK, ...(v ?? {}) });
export function useLook(): [Look, (change: Partial<Look>) => void] {
  const [stored, setStored] = usePref<Partial<Look> | undefined>(KEY, undefined);
  return [lookOf(stored), (change) => setStored((old) => ({ ...(old ?? {}), ...change }))];
}

// The theme in effect ("system" follows the operating system's light/dark setting).
const mq = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: light)") : null;
export const effectiveTheme = (t: ThemeChoice): "dark" | "light" =>
  t === "system" ? (mq?.matches ? "light" : "dark") : t;
function apply() {
  const look = lookOf(getPref<Partial<Look> | undefined>(KEY, undefined));
  const root = document.documentElement,
    theme = effectiveTheme(look.theme);
  if (root.dataset.theme !== theme) root.dataset.theme = theme;
  root.style.setProperty("--model", look.model); // the A swatch and label
  root.style.setProperty("--model-text", luminance(look.model) > 0.45 ? "#1b1d22" : "#ffffff");
}
apply();
subscribePrefs(apply);
mq?.addEventListener("change", apply);

// Watch the theme in effect (the viewer and the editor follow it).
const onSystem = (fn: () => void) => {
  mq?.addEventListener("change", fn);
  return () => mq?.removeEventListener("change", fn);
};
export function useTheme(): "dark" | "light" {
  const [look] = useLook();
  useSyncExternalStore(onSystem, () => mq?.matches ?? false); // re-render when the system switches
  return effectiveTheme(look.theme);
}

// The viewer's background: a CSS background for the canvas's container, and whether it is light
// (grid, edges and labels pick contrasting colours).
const THEME_BG = { dark: "#23262e", light: "#e8ebf0" };
export function viewerBackground(
  look: Look,
  theme: "dark" | "light",
): { css: string; stops: [string, number][]; light: boolean } {
  const base = look.background === "theme" ? THEME_BG[theme] : look.bg;
  const light = luminance(base) > 0.45;
  const stops: [string, number][] =
    look.background === "gradient"
      ? [
          [mix(base, "#ffffff", 0.18), 0],
          [base, 0.55],
          [mix(base, "#000000", 0.3), 1],
        ]
      : [[base, 0]];
  const css =
    stops.length > 1 ? `linear-gradient(180deg, ${stops.map(([c, t]) => `${c} ${t * 100}%`).join(", ")})` : base;
  return { css, stops, light };
}

export function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((c) => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function mix(a: string, b: string, t: number) {
  const x = rgb(a),
    y = rgb(b);
  return `#${x
    .map((c, i) =>
      Math.round(c + (y[i] - c) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
function rgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0x808080;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
