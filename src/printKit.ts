// The print kit (App's "Download print kit"): the mouthpiece, shank test rings at three hole
// sizes, the ligature if made, and a check card with the numbers to measure the print against.
// Like scripts/print_kit.mjs, from the app.
import { gaugeStops, parseSummary, type Wall } from "./readouts";
import { formatThou } from "./design";
import { PRINTING_GUIDE_URL } from "./links";

// The test rings' shank holes (mm): the design's own, a little tighter and a little looser.
export const kitHoles = (own: number) => [-0.1, 0, 0.1].map((d) => Math.round((own + d) * 100) / 100);

export const ringFile = (name: string, hole: number) => `${name}_ring_${hole.toFixed(2)}mm.stl`;

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
    "     they look alike; the number in each file's name is its hole in mm). Push each one onto your",
    "     lightly greased neck cork: the right one goes on with a firm push and doesn't wobble.",
    "     In the app, set Fit on the horn > Shank hole to that ring's number before printing the",
    "     mouthpiece. A smaller hole is a tighter fit.",
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
    `  Shank hole: ${n(Number(get("shank_hole")))} mm across (printed holes often come out a little small)`,
    `  Socket depth: ${n(Number(get("shank_depth")), 1)} mm`,
    ...(stock > 0 ? [`  Extra to sand off: ${stock} mm on the table and facing (check after sanding)`] : []),
    "",
    "FACING GAUGE (glass plate + feelers): where each feeler should stop, back from the tip",
    ...(stops.length
      ? stops.map(
          (g) =>
            `  ${g.gauge.toFixed(3).replace(/^0/, "")}" (${(g.gauge * 25.4).toFixed(2)} mm): ${g.at.toFixed(1)} mm`,
        )
      : ["  ?"]),
    '  The .002" feeler stops a little short of the break: there the gap is too small to measure.',
  ];
  if (s.notes.length) L.push("", "NOTES FROM THE GENERATOR", ...s.notes.map((t) => `  ${t}`));
  L.push("", `Files are named after the design: ${name}.`, "");
  return L.join("\r\n");
}
