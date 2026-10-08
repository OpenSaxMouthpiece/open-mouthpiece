import { describe, expect, it } from "vitest";
import { corkShift, corkShiftText, parseSocket } from "./corkFit";

describe("corkShift", () => {
  const alto = parseSocket('ECHO: "Socket: 22mm deep, 16mm across, voice Alto"')!;
  it("reads the generator's socket line", () => {
    expect(alto).toEqual({ depth: 22, diameter: 16, voice: "Alto" });
  });
  it("is zero for the preset itself", () => {
    expect(corkShift(9, alto)).toBeCloseTo(0);
  });
  it("puts more air further onto the cork, by the socket's area", () => {
    expect(corkShift(10, alto)).toBeCloseTo(1000 / (Math.PI * 64), 3); // ~5 mm
    expect(corkShift(8, alto)!).toBeLessThan(0);
  });
  it("counts a deeper socket as further on", () => {
    expect(corkShift(9, { ...alto, depth: 25 })).toBeCloseTo(3);
  });
  it("has nothing to say for a voice without a preset", () => {
    expect(corkShift(9, { ...alto, voice: "Bass" })).toBeNull();
  });
  it("words it", () => {
    expect(corkShiftText(3.4, "Alto")).toBe("about 3 mm further onto the cork than the Alto preset");
    expect(corkShiftText(-2.6, "Alto")).toBe("about 3 mm further out on the cork than the Alto preset");
    expect(corkShiftText(0.3, "Alto")).toBe("about where the Alto preset sits on the cork");
  });
});
