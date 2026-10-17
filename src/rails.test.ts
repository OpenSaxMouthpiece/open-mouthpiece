import { describe, expect, it } from "vitest";
import type { ScadParam } from "./api";
import type { RailsReport } from "./readouts";
import { legacyRails, windowChange, withWindowParams, withWindowValues } from "./rails";

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
  it("turns an older link's window width into rails", () => {
    expect(legacyRails(L, { window_width: 14 }, [rail, widen])).toEqual({
      set: { side_rail_width: 1.85, side_rail_widening: 0.15 },
      remove: ["window_width", "window_taper"],
    });
  });
  it("turns off an older file's own window settings", () => {
    const old: ScadParam = { name: "window_width", group: "Window", type: "number", initial: 15.1 };
    expect(legacyRails(L, {}, [rail, widen, old])?.set).toMatchObject({ window_width: -1, window_taper: -1 });
  });
  it("leaves a design in rails alone", () => {
    expect(legacyRails(R, {}, [rail, widen])).toBeNull();
    expect(legacyRails(L, { window_width: -1 }, [rail, widen])).toBeNull();
  });
});
