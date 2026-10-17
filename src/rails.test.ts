import { describe, expect, it } from "vitest";
import type { ScadParam } from "./api";
import type { RailsReport } from "./readouts";
import { legacyRails, railsInText, windowChange, withWindowParams, withWindowValues } from "./rails";

const rail: ScadParam = { name: "side_rail_width", group: "Window", type: "number", initial: 1.35, min: 0.8, max: 2.5 };
const widen: ScadParam = {
  name: "side_rail_widening",
  group: "Window",
  type: "number",
  initial: 0.15,
  min: -1,
  max: 2,
};
const R: RailsReport = { rail: 1.35, widen: 0.15, edgeFront: 17.48, edgeRear: 14.84, legacy: false };

describe("window controls", () => {
  it("show the window the rails leave", () => {
    const ps = withWindowParams([rail, widen], R);
    expect(ps.find((p) => p.name === "window_width")?.initial).toBeCloseTo(17.48 - 2.7);
    expect(ps.find((p) => p.name === "window_taper")?.initial).toBeCloseTo(17.48 - 14.84 + 0.3);
    expect(withWindowValues({ side_rail_width: 1 }, R)).toEqual({ side_rail_width: 1, window_width: 15.48 });
  });

  it("set the rails that give the window asked for", () => {
    expect(windowChange("window_width", 15.48, [rail, widen], R)).toEqual(["side_rail_width", 1]);
    expect(windowChange("window_taper", 2.64, [rail, widen], R)).toEqual(["side_rail_widening", 0]);
    expect(windowChange("window_width", 30, [rail, widen], R)).toEqual(["side_rail_width", 0.8]); // clamped
    expect(windowChange("window_width", undefined, [rail, widen], R)).toEqual(["side_rail_width", undefined]);
    expect(windowChange("tip_opening", 2, [rail, widen], R)).toEqual(["tip_opening", 2]);
  });

  it("are left out until a render has reported the rails", () => {
    const old: ScadParam = { name: "window_width", group: "Window", type: "number", initial: 15.1 };
    expect(withWindowParams([rail, widen, old], null).map((p) => p.name)).toEqual([
      "side_rail_width",
      "side_rail_widening",
    ]);
  });
});

describe("legacyRails", () => {
  const L: RailsReport = { ...R, rail: 1.8512, widen: 0.15, legacy: true };
  it("gives the rails an older design's window had", () => {
    expect(legacyRails(L, { window_width: 14 }, "")).toEqual({ rail: 1.85, widen: 0.15, inFile: false });
    expect(legacyRails(L, {}, "x = 1;\nwindow_width = 15.1; // [6:0.1:22]\n")?.inFile).toBe(true);
  });
  it("leaves a design in rails alone", () => {
    expect(legacyRails(R, { window_width: 14 }, "")).toBeNull();
    // a report from the design shown before
    expect(legacyRails(L, {}, "side_rail_width = 1;\n")).toBeNull();
  });
});

describe("railsInText", () => {
  const OLD = [
    "window_length = 39.0; // [8:0.5:70]",
    "// Width of the opening under the reed (mm); kept inside the rails automatically.",
    "window_width = 15.1; // [6:0.1:22]",
    "// How much narrower the window is at the back (mm).",
    "window_taper = 3.3; // [0:0.1:12]",
    "// Width of the side rails the reed seals on (mm).",
    "side_rail_width = 0.85; // [0.8:0.05:2.5]",
    "tip_rail_thickness = 0.9;",
    "",
  ].join("\n");
  it("turns an older file's window lines into its rails", () => {
    expect(railsInText(OLD, 1.37, 0.16)).toBe(
      [
        "window_length = 39.0; // [8:0.5:70]",
        "// Width of the side rails the reed seals on (mm).",
        "side_rail_width = 1.37; // [0.8:0.05:2.5]",
        "// How much wider the side rails get toward the back of the window (mm); 0 = even.",
        "side_rail_widening = 0.16; // [-1:0.05:2]",
        "tip_rail_thickness = 0.9;",
        "",
      ].join("\n"),
    );
  });
  it("leaves a file in rails alone", () => {
    expect(railsInText("side_rail_width = 1;\n", 1, 0)).toBeNull();
  });
});
