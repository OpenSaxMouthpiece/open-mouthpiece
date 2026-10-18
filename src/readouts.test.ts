import { describe, expect, it } from "vitest";
import { adjustmentText, ligatureText, parseLigature, parseReport, parseSummary } from "./readouts";

const REPORT =
  'ECHO: REPORT = [["version", 1], ["length", 89.3], ["tip", 1.93], ["facing", 23.8], ["air", 2.5], ' +
  '["socket", [60, 16, "Alto"]], ["adjusted", [["chamber_width", 22, 18.3751, "the side walls keep min_wall (2mm)"]]]]\n';

describe("parseReport", () => {
  it("reads the numbers and the adjustments", () => {
    const r = parseReport(`ECHO: "hello"\n${REPORT}`);
    expect(r).toMatchObject({ length: 89.3, tip: 1.93, facing: 23.8, air: 2.5 });
    expect(r?.socket).toEqual({ depth: 60, diameter: 16, voice: "Alto" });
    expect(r?.adjusted).toEqual([
      { param: "chamber_width", asked: 22, got: 18.3751, why: "the side walls keep min_wall (2mm)" },
    ]);
  });

  it("ignores another version or a missing report", () => {
    expect(parseReport(REPORT.replace('["version", 1]', '["version", 2]'))).toBeNull();
    expect(parseReport("ECHO: nothing here\n")).toBeNull();
  });

  it("falls back to the text lines when there is no report", () => {
    const s = parseSummary('ECHO: "Overall length: 80mm, tip_opening: 2mm, facing_length: 20mm"\n');
    expect(s).toMatchObject({ length: 80, tip: 2, facing: 20, adjusted: [] });
  });

  it("prefers the report", () => {
    expect(parseSummary(REPORT).adjusted).toHaveLength(1);
  });
});

describe("adjustmentText", () => {
  it("says what was asked and what the model has", () => {
    const a = { param: "chamber_width", asked: 22, got: 18.3751, why: "the side walls keep min_wall (2mm)" };
    expect(adjustmentText(a, "Chamber width")).toBe(
      "Chamber width: you asked 22 mm, the model has 18.38 mm — the side walls keep min_wall (2mm)",
    );
  });
});

describe("parseLigature", () => {
  it("names the metal screw to buy", () => {
    const log = 'ECHO: "LIGSCREW M3 8 nut"\nECHO: "LIGATURE 12 2 28.1 32.9 26.6 31.2 95.3 -1 -1"\n';
    const g = parseLigature(log);
    expect(g?.screw).toEqual({ size: "M3", length: 8, kind: "nut" });
    expect(ligatureText(g)).toContain("Needs an M3 × 8 mm screw and an M3 nut.");
    expect(parseLigature('ECHO: "LIGATURE 12 2 28.1 32.9 26.6 31.2 95.3 0.7 1.4"')?.screw).toBeNull();
  });
});
