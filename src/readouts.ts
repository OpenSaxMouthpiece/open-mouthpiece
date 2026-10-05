// The readouts, parsed from what the generator echoes: the summary lines of every
// render, and the echo-only reports (part = "facing_report" / "clearance_report").
import { parseAirVolume } from "./compare";

export interface Summary {
  length: number | null; // mm
  tip: number | null; // mm
  facing: number | null; // mm
  air: number | null; // cm3
  notes: string[]; // validate() warnings, in plain words
}

export function parseSummary(log: string): Summary {
  const m = /Overall length: ([\d.]+)mm, tip_opening: ([\d.]+)mm, facing_length: ([\d.]+)mm/.exec(log);
  const notes = [...log.matchAll(/ECHO: "WARNING: ([^"]*)"/g)].map((w) => plainNote(w[1]));
  return {
    length: m ? Number(m[1]) : null,
    tip: m ? Number(m[2]) : null,
    facing: m ? Number(m[3]) : null,
    air: parseAirVolume(log),
    notes: [...new Set(notes)],
  };
}

// A note about a value the generator adjusted by itself (a guarantee kept): "... shortened to /
// moved to / limited to ...". The others ask the player to do something (text cut off, reed too
// long, a renamed setting, ...).
export const isAdjustment = (note: string) => /\b(shortened|moved|limited) to\b/.test(note);

// "shank_depth 50mm limited to 40mm — ..." -> "Shank depth 50mm limited to 40mm — ..."
function plainNote(s: string) {
  const t = s.replace(/\b([a-z]+(?:_[a-z]+)+)\b/g, (w) => w.replace(/_/g, " "));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Facing gap (mm) against distance from the tip (mm): "FACING d h" lines.
export function parseFacing(log: string): [number, number][] {
  return [...log.matchAll(/FACING ([\d.eE+-]+) ([\d.eE+-]+)/g)].map(
    (m) => [Number(m[1]), Number(m[2])] as [number, number],
  );
}

// Thinnest wall: "CLEARANCE w at z=.. (where)"; z from the shank end.
export interface Wall {
  wall: number;
  where: string;
  z: number;
}
export function parseClearance(log: string): Wall | null {
  const m = /CLEARANCE ([\d.]+) at z=([-\d.e]+) \(([^)]*)\)/.exec(log);
  return m ? { wall: Number(m[1]), z: Number(m[2]), where: m[3] } : null;
}

// The ligature made for the mouthpiece (part = "ligature" / "ligature_seated"): "LIGATURE <length>
// <front edge behind the window> <inside width, height at the rear> <same at the front> <inside
// girth at the rear> <mm further forward per 0.1mm thicker reed> <mm further forward it first
// touches the reed (the grip)>" (-1 = no taper), and its warnings.
export interface LigatureInfo {
  length: number;
  front: number; // mm behind the window's back end (negative: over the window)
  rear: [number, number]; // inside width, height at the rear (shank) end
  frontSize: [number, number]; // same at the front end
  girth: number; // inside, around, at the rear
  shift: number | null; // mm it seats further forward per 0.1mm thicker reed
  touch: number | null; // mm further forward it first touches the reed (then it's pushed on to squeeze it)
  notes: string[];
}
export function parseLigature(log: string): LigatureInfo | null {
  const m = /LIGATURE ((?:[-\d.eE+]+ ?){8,9})/.exec(log);
  if (!m) return null;
  const n = m[1].trim().split(" ").map(Number);
  const notes = [...log.matchAll(/ECHO: "WARNING: (ligature[^"]*)"/g)].map((w) => plainNote(w[1]));
  return {
    length: n[0],
    front: n[1],
    rear: [n[2], n[3]],
    frontSize: [n[4], n[5]],
    girth: n[6],
    shift: n[7] >= 0 ? n[7] : null,
    touch: n.length > 8 && n[8] >= 0 ? n[8] : null,
    notes,
  };
}

// The cap made for the mouthpiece (part = "cap"): "CAP <length> <rear edge z> <inside width, height at
// the collar> <squeeze>", and its warnings.
export interface CapInfo {
  length: number;
  inside: [number, number]; // inside width, height at the collar
  squeeze: number; // how much smaller than what it sits on the collar is (mm)
  notes: string[];
}
export function parseCap(log: string): CapInfo | null {
  const m = /CAP ((?:[-\d.eE+]+ ?){5})/.exec(log);
  if (!m) return null;
  const n = m[1].trim().split(" ").map(Number);
  const notes = [...log.matchAll(/ECHO: "WARNING: ((?:the cap|cap_)[^"]*)"/g)].map((w) => plainNote(w[1]));
  return { length: n[0], inside: [n[2], n[3]], squeeze: n[4], notes };
}
export function capText(c: CapInfo | null): string {
  if (!c) return "";
  return ` ${c.length.toFixed(0)} mm long, inside ${c.inside[0].toFixed(1)} × ${c.inside[1].toFixed(1)} mm at the collar, which squeezes ${Math.max(0, c.squeeze).toFixed(2)} mm.`;
}

// Feeler-gauge stops for checking a facing (inches).
export const GAUGES_IN = [0.0015, 0.01, 0.024, 0.034, 0.05];

// Facing length as players and refacers quote it: where a .0015" feeler stops, from the tip (mm).
export const gaugeFacingLength = (facing: [number, number][] | null) =>
  facing && facing.length > 1 ? (gaugeStops(facing)[0]?.at ?? null) : null;

// Where the facing gap equals a gauge's thickness (distance from the tip, mm), by interpolation.
export function gaugeStops(facing: [number, number][]): { gauge: number; at: number }[] {
  const out: { gauge: number; at: number }[] = [];
  for (const g of GAUGES_IN) {
    const h = g * 25.4;
    for (let i = 1; i < facing.length; i++) {
      const [d0, h0] = facing[i - 1],
        [d1, h1] = facing[i];
      if ((h0 - h) * (h1 - h) <= 0 && h0 !== h1) {
        out.push({ gauge: g, at: d0 + ((h0 - h) / (h0 - h1)) * (d1 - d0) });
        break;
      }
    }
  }
  return out;
}

// The ligature's numbers as sentences (appended to the Ligature section's or the part's text).
export function ligatureText(g: LigatureInfo | null): string {
  if (!g) return "";
  const front = g.front >= 0 ? `${g.front} mm behind` : `${-g.front} mm over`;
  const parts = [
    ` Inside ${g.rear[0].toFixed(1)} × ${g.rear[1].toFixed(1)} mm at the back, ${g.girth.toFixed(1)} mm around;` +
      ` front edge ${front} the window's end.`,
  ];
  if (g.touch)
    parts.push(` It touches the reed ${g.touch.toFixed(1)} mm before this; push it the rest of the way to grip.`);
  if (g.shift !== null) parts.push(` A reed 0.1 mm thicker seats it ${g.shift.toFixed(1)} mm further forward.`);
  return parts.join("");
}
