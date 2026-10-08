import { describe, expect, it } from "vitest";
import { changedCount, optionLabel } from "./design";

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
