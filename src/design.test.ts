import { describe, expect, it } from "vitest";
import { changedCount, DESIGN_SECTIONS, optionLabel, paramAliases } from "./design";

describe("paramAliases", () => {
  it("finds settings by players' words", () => {
    expect(paramAliases("beak_tip_height")).toContain("bite");
    expect(paramAliases("top_text")).toContain("logo");
    expect(paramAliases("facing_length")).toContain("lay");
    expect(paramAliases("shank_hole")).toContain("cork");
    expect(paramAliases("tip_opening")).toEqual([]);
  });
  it("names only settings the panel places", () => {
    const placed = JSON.stringify(DESIGN_SECTIONS);
    for (const n of ["beak_tip_height", "beak_curve", "beak_length", "beak_squareness", "beak_top_width"])
      expect(placed).toContain(`"${n}"`);
    for (const n of ["top_text", "top_image", "side_text_right", "side_text_left", "shank_text"])
      expect(placed).toContain(`"${n}"`);
    for (const n of ["facing_length", "facing_model", "shank_hole"]) expect(placed).toContain(`"${n}"`);
  });
});

describe("optionLabel", () => {
  it("prefers a section's own words for an option", () => {
    expect(optionLabel("shank_detail", "rings")).toBe("Rings");
  });
  it("then the shared option names", () => {
    expect(optionLabel("facing_model", "arc")).toBe("Radius");
    expect(optionLabel("side_text_font", "same")).toBe("Same as Font");
  });
  it("else the value in words, capitalised", () => {
    expect(optionLabel("anything", "half_round")).toBe("Half round");
    expect(optionLabel("anything", "x", "named_option")).toBe("Named option");
  });
});

describe("changedCount", () => {
  it("counts a dragged facing (points + its model) as one change", () => {
    expect(changedCount({ facing_gauge_points: [[0, 1]], facing_model: "gauge", tip_opening: 2 })).toBe(2);
    expect(changedCount({ facing_model: "arc" })).toBe(1);
  });
});
