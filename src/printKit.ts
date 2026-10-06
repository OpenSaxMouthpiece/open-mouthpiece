// The print kit (App's "Download print kit"): the mouthpiece, shank test rings at three cork
// squeezes, the ligature if made, and a check card with the numbers to measure the print against.
// Like scripts/print_kit.mjs, from the app.
import { gaugeStops, parseSummary, type Wall } from "./readouts";
import { formatThou } from "./design";
import { PRINTING_GUIDE_URL } from "./links";

export const KIT_SQUEEZES = [0.1, 0.2, 0.3]; // shank_clearance of the test rings (mm)

// The squeezes to print rings at: the three standard ones, plus the design's own if it differs.
export const kitSqueezes = (own: number) =>
  KIT_SQUEEZES.some((c) => Math.abs(c - own) < 0.005) ? KIT_SQUEEZES : [...KIT_SQUEEZES, own].sort((a, b) => a - b);

export const ringFile = (name: string, c: number) => `${name}_ring_squeeze_${c.toFixed(2)}.stl`;

interface CardInput {
  name: string; // the design's name, as the files are named
  title: string; // what the player calls it
  log: string; // the kit's echo run: summary, FACING lines, CLEARANCE line
  facing: [number, number][];
  wall: Wall | null;
  get: (name: string) => unknown; // the design's settings now
  files: string[]; // what's in the kit, besides the card
  date: string;
}

const n = (v: unknown, d = 2) => (typeof v === "number" ? +v.toFixed(d) : "?");

export function checkCard({ name, title, log, facing, wall, get, files, date }: CardInput): string {
  const s = parseSummary(log);
  const cork = Number(get("neck_cork_diameter"));
  const squeeze = Number(get("shank_clearance"));
  const stops = gaugeStops(facing);
  const stock = Number(get("print_stock")) || 0;
  const L: string[] = [
    `Print kit: ${title}`,
    `Made ${date} with Open Mouthpiece (${location.origin}).`,
    "",
    "WHAT'S IN IT",
    ...files.map((f) => `  ${f}`),
    "",
    "HOW TO USE IT",
    "  1. Print the shank test rings first (a few minutes each; mark each one as it comes off the plate,",
    "     they look alike). Push each one onto your lightly greased neck cork:",
    "     the right one goes on with a firm push and doesn't wobble. In the app, set",
    "     Fit on the horn > Cork squeeze to that ring's number before printing the mouthpiece.",
    "     A bigger squeeze is a tighter fit.",
    "  2. Print the mouthpiece standing on its shank end, as the STL is placed. No supports needed.",
    "  3. Check the table and facing against the numbers below (glass plate + feeler gauges).",
    ...(PRINTING_GUIDE_URL ? [`     The printing guide has the details: ${PRINTING_GUIDE_URL}`] : []),
    "",
    "CHECK THE PRINT AGAINST",
    `  Tip opening (tip rail to a straightedge on the table): ${s.tip === null ? "?" : `${n(s.tip)} mm (${formatThou(s.tip)})`}`,
    `  Facing length (tip to the break, where the rails leave the flat table): ${s.facing === null ? "?" : `${n(s.facing, 1)} mm from the tip`}`,
    `  Overall length: ${s.length === null ? "?" : `${n(s.length, 1)} mm`}`,
    `  Inside air volume (neck end to tip, reed on): ${s.air === null ? "?" : `${s.air.toFixed(1)} cm³`}`,
    `  Thinnest wall: ${wall ? `${wall.wall.toFixed(2)} mm (${wall.where}, ${wall.z.toFixed(1)} mm from the shank end)` : "?"}`,
    `  Neck cork it was designed for: ${n(cork)} mm; cork squeeze ${n(squeeze)} mm, so the socket is ${n(cork - squeeze)} mm`,
    `  Socket depth: ${n(Number(get("shank_depth")), 1)} mm`,
    ...(stock > 0
      ? [`  Extra stock for finishing: ${stock} mm on the table and facing (sand it off, then check)`]
      : []),
    "",
    "FACING GAUGE (glass plate + feelers): where each feeler should stop, back from the tip",
    ...(stops.length
      ? stops.map(
          (g) =>
            `  ${g.gauge.toFixed(g.gauge < 0.01 ? 4 : 3).replace(/^0/, "")}" (${(g.gauge * 25.4).toFixed(2)} mm): ${g.at.toFixed(1)} mm`,
        )
      : ["  ?"]),
    '  The .0015" feeler stops a little short of the break: there the gap is too small to measure.',
  ];
  if (s.notes.length) L.push("", "NOTES FROM THE GENERATOR", ...s.notes.map((t) => `  ${t}`));
  L.push("", `Files are named after the design: ${name}.`, "");
  return L.join("\r\n");
}
