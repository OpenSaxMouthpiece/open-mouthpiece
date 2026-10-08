// The rail's places (desktop: the icon rail down the left; phone: the bar along the bottom): the
// generator's sections (the parts made from it after a line, then printing), the tools at the
// bottom. A file that isn't the generator's has one place: its settings. Plain data in, the rail's
// items and what's open out; App keeps the remembered choice (prefs "rail", "dockTab").
import type { RailItem } from "../components/Rail";
import { DESIGN_SECTIONS, type DesignSection, type PartTab } from "../design";

// A section's rail button: one short word and an icon.
const RAIL: Record<string, [label: string, icon: RailItem["icon"]]> = {
  "Tip & facing": ["Tip", "tip"],
  "Fit on the horn": ["Fit", "fit"],
  "Chamber & baffle": ["Chamber", "chamber"],
  "Body & beak": ["Body", "body"],
  Personalise: ["Engrave", "text"],
  Ligature: ["Ligature", "ligature"],
  Cap: ["Cap", "cap"],
  Printing: ["Print", "print"],
};
const TOOLS = ["compare", "points", "about"];
// A section's dock chart: the facing for the tip, the outside for the body, the inside for the chamber.
const DOCK_OF: Record<string, string> = {
  "Tip & facing": "facing",
  "Body & beak": "body",
  "Chamber & baffle": "chamber",
};

export interface RailInput {
  selected: string; // the remembered place (a section's title or a tool)
  designOK: boolean; // the file is the generator's (has its sections)
  ligOK: boolean;
  capOK: boolean;
  has: (name: string) => boolean; // the file declares this parameter
  changed: (name: string) => boolean; // the design changes this parameter
  ligMade: boolean;
  capMade: boolean;
  pinned: boolean; // a B to compare with
  codeOpen: boolean;
  tab: PartTab;
  // what a pick does
  select: (id: string) => void;
  toggleCode: () => void;
  openPart: (part: PartTab) => void;
  showDock: (id: string) => void;
  focusOn: (name: string) => void; // the view flies to the part a setting shapes (Auto-zoom)
}

export interface Rail {
  sections: DesignSection[];
  now: string; // the place open in the panel
  section: DesignSection | undefined; // ... when it's a section
  items: RailItem[];
  pick: (id: string) => void;
}

export function buildRail(r: RailInput): Rail {
  const sections = r.designOK
    ? DESIGN_SECTIONS.filter(
        (s) => (!s.ligature || r.ligOK) && (!s.cap || r.capOK) && s.items.some((i) => r.has(i.name)) && RAIL[s.title],
      )
    : [];
  const now =
    !TOOLS.includes(r.selected) && !sections.some((s) => s.title === r.selected)
      ? (sections[0]?.title ?? "settings")
      : r.selected;
  const pick = (id: string) => {
    if (id === "code") return r.toggleCode();
    r.select(id);
    const s = sections.find((x) => x.title === id);
    if (!s) return;
    const part: PartTab = s.ligature ? "ligature" : s.cap ? "cap" : "mouthpiece";
    if (part !== r.tab) r.openPart(part);
    if (DOCK_OF[id]) r.showDock(DOCK_OF[id]);
    const first = s.items.find((i) => r.has(i.name));
    if (first && part === "mouthpiece") r.focusOn(first.name);
  };
  const changedIn = (s: DesignSection) => [...s.items.map((i) => i.name), ...(s.more ?? [])].filter(r.changed).length;
  const tool = (id: string, label: string, title: string, icon: RailItem["icon"], extra: Partial<RailItem> = {}) =>
    ({ id, label, title, icon, active: now === id, group: "tools", ...extra }) satisfies RailItem;
  const items: RailItem[] = [
    ...(sections.length
      ? sections.map((s, i): RailItem => ({
          id: s.title,
          label: RAIL[s.title][0],
          title: s.title,
          icon: RAIL[s.title][1],
          active: now === s.title,
          dot: s.ligature ? r.ligMade : s.cap ? r.capMade : undefined,
          changed: changedIn(s) || undefined,
          sep: i > 0 && (!!s.ligature || s.title === "Printing" || (!!s.cap && !sections[i - 1].ligature)),
        }))
      : [{ id: "settings", label: "Settings", title: "Settings", icon: "settings" as const, active: true }]),
    tool("compare", "Compare", "Compare two designs (A/B)", "compare", { dot: r.pinned }),
    tool("points", "Points", "Exact points (advanced: Edit shape in the charts is easier)", "points"),
    tool("code", "Code", r.codeOpen ? "Hide the code editor" : "Show the code editor (OpenSCAD) and console", "code", {
      active: r.codeOpen,
    }),
    tool("about", "About", "About Open Mouthpiece", "about"),
  ];
  return { sections, now, section: sections.find((s) => s.title === now), items, pick };
}
