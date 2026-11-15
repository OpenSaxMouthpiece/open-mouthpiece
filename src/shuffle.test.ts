import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ParamValue } from "./api";
import { PRESET_AIR } from "./corkFit";
import AIR_MODEL from "./shuffleAir.json";
import {
  AIR_BAND,
  SHUFFLE_DATA,
  SHUFFLE_KEYS,
  SHUFFLE_VOICES,
  correctAir,
  fitAir,
  predictAir,
  sampleDesign,
  seeded,
  shuffleDesign,
  shuffleVoice,
} from "./shuffle";

const FILE = { Soprano: "soprano", Alto: "alto", Tenor: "tenor", Baritone: "baritone" } as const;
const assigned = (src: string, name: string) => {
  const m = new RegExp(`^${name}\\s*=\\s*([^;]+);`, "m").exec(src);
  return m ? Number(m[1]) : NaN;
};

describe("SHUFFLE_DATA", () => {
  it("holds each voice preset's own values and air", () => {
    for (const v of SHUFFLE_VOICES) {
      const src = readFileSync(`scad/${FILE[v]}.scad`, "utf8");
      for (const [k, x] of Object.entries(SHUFFLE_DATA[v].preset)) expect(assigned(src, k), `${v} ${k}`).toBe(x);
      expect(SHUFFLE_DATA[v].air).toBe(PRESET_AIR[v].air);
    }
  });
});

describe("sampleDesign", () => {
  it("sets every shuffle setting, and is repeatable from a seed", () => {
    const a = sampleDesign("Alto", seeded(7));
    expect(Object.keys(a).sort()).toEqual([...SHUFFLE_KEYS].sort());
    expect(sampleDesign("Alto", seeded(7))).toEqual(a);
    expect(sampleDesign("Alto", seeded(8))).not.toEqual(a);
  });
  it("never touches the fit, the reed's settings or lettering", () => {
    for (const k of ["shank_hole", "shank_depth", "tip_curve", "table_length", "window_length", "top_text"])
      expect(SHUFFLE_KEYS as readonly string[]).not.toContain(k);
  });
  it("keeps the tip in the voice's range and the facing following it", () => {
    for (const v of SHUFFLE_VOICES)
      for (let i = 0; i < 200; i++) {
        const d = sampleDesign(v, seeded(i));
        const [lo, hi] = SHUFFLE_DATA[v].tip;
        expect(d.tip_opening).toBeGreaterThanOrEqual(lo);
        expect(d.tip_opening).toBeLessThanOrEqual(hi);
        const [flo, fhi] = SHUFFLE_DATA[v].facing;
        expect(d.facing_length).toBeGreaterThanOrEqual(flo);
        expect(d.facing_length).toBeLessThanOrEqual(fhi);
        if (v === "Soprano") {
          expect(d.overall_length).toBeGreaterThanOrEqual(SHUFFLE_DATA.Soprano.preset.overall_length);
          expect(d.shank_detail).not.toBe("knurled");
          expect(d.baffle_texture).toBe("none");
        }
      }
  });
  it("makes different shapes, not one design", () => {
    const shapes = new Set(
      Array.from({ length: 60 }, (_, i) => sampleDesign("Tenor", seeded(i))).map(
        (d) => `${d.chamber_shape} ${d.baffle_type}`,
      ),
    );
    expect(shapes.size).toBeGreaterThan(8);
  });
});

describe("fitAir", () => {
  // a stand-in for the generator: air falls 0.9 cm³ per mm of baffle height, from 11 cm³ at 0
  const model = (v: Record<string, ParamValue>) => Promise.resolve(+(11 - 0.9 * Number(v.baffle_height)).toFixed(1));
  it("moves baffle height until the air is near the preset's", async () => {
    const fit = await fitAir("Alto", { ...sampleDesign("Alto", seeded(1)), baffle_height: 0 }, model);
    expect(fit.ok).toBe(true);
    expect(Math.abs((fit.air ?? 0) / SHUFFLE_DATA.Alto.air - 1)).toBeLessThanOrEqual(0.04);
    expect(fit.tries).toBeLessThanOrEqual(4);
  });
  it("turns to the next lever when baffle height runs out", async () => {
    // baffle height barely moves it; the throat does
    const m = (v: Record<string, ParamValue>) =>
      Promise.resolve(+(20 - 0.2 * Number(v.baffle_height) + 0.8 * (Number(v.throat_width) - 14.8)).toFixed(1));
    const fit = await fitAir(
      "Baritone",
      { ...sampleDesign("Baritone", seeded(2)), baffle_height: 0, baffle_curve: 0 },
      m,
    );
    expect(Number(fit.values.baffle_height)).toBe(2.5);
    expect(Number(fit.values.throat_width)).toBeLessThan(14.8);
  });
  it("says so when the air can't be reached", async () => {
    const fit = await fitAir("Alto", sampleDesign("Alto", seeded(3)), () => Promise.resolve(30));
    expect(fit.ok).toBe(false);
    expect(Math.abs((fit.air ?? 0) / SHUFFLE_DATA.Alto.air - 1)).toBeGreaterThan(AIR_BAND);
  });
});

describe("shuffleDesign", () => {
  it("draws again when a design can't be brought in, up to ten times", async () => {
    let calls = 0;
    const fit = await shuffleDesign("Alto", seeded(4), () => Promise.resolve(++calls > 0 ? 30 : 9));
    expect(fit.ok).toBe(false);
    expect(fit.samples).toBe(10);
  });
});

describe("shuffleVoice", () => {
  it("knows the four voices with variants, not the C-melody", () => {
    expect(shuffleVoice("Alto")).toBe("Alto");
    expect(shuffleVoice("C-melody")).toBe(null);
    expect(shuffleVoice(undefined)).toBe(null);
  });
});

describe("predictAir", () => {
  it("has a fit for each voice, and lands shuffled designs near the preset's air", async () => {
    for (const v of SHUFFLE_VOICES) {
      for (let i = 0; i < 50; i++) {
        const fit = await shuffleDesign(v, seeded(i), (d) => Promise.resolve(predictAir(AIR_MODEL, v, d)));
        expect(fit.ok, `${v} ${i}`).toBe(true);
        expect(Math.abs((fit.air ?? 0) / SHUFFLE_DATA[v].air - 1)).toBeLessThanOrEqual(AIR_BAND);
      }
    }
  });
});

describe("correctAir", () => {
  it("uses the line through two real readings that differ only in baffle height", async () => {
    const v = sampleDesign("Soprano", seeded(5));
    const a = { values: { ...v, baffle_height: 2.5 }, air: 2.6 };
    const b = { values: { ...v, baffle_height: -0.4 }, air: 3.3 };
    const next = await correctAir(AIR_MODEL, "Soprano", [a, b]);
    // 0.7 cm³ over 2.9mm: 2.9 cm³ at about 1.3mm
    expect(Number(next.baffle_height)).toBeCloseTo(1.3, 1);
  });
});
