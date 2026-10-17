import { describe, expect, it } from "vitest";
import type { FocusData } from "./focus";
import { pickRegion, placeOf, toDesign } from "./pick";

// An 80 mm mouthpiece: shank band to 14, table from 20, facing from 56, window from 50, beak from 56.
const box = (z0: number, z1: number): [[number, number, number], [number, number, number]] => [
  [-12, 0, z0],
  [12, 24, z1],
];
const data: FocusData = {
  frame: { print: false, tilt: 0, lift: 0 },
  items: Object.fromEntries(
    Object.entries({
      overall_length: box(0, 80),
      shank_depth: box(0, 21),
      shank_text: box(0, 18),
      table_length: box(20, 80),
      facing_length: box(53, 80),
      window_length: box(47, 80),
      baffle_height: box(57, 80),
      beak_tip_height: box(48, 80),
      beak_curve: box(36, 80), // the shoulder at 44
      throat_position: box(22, 36), // the throat at 30
    }).map(([k, b]) => [k, { box: b, view: "side", cut: false }]),
  ),
};
const get = (n: string) => ({ tip_opening: 2, tip_rail_thickness: 0.8 })[n];
const at = (p: [number, number, number], n: [number, number, number]) => pickRegion(p, n, data, get)?.title;

describe("pickRegion", () => {
  it("names the spot", () => {
    expect(at([0, 10, 0], [0, 0, -1])).toBe("Shank end");
    expect(at([0, 12 + 9, 10], [0, 1, 0])).toBe("Shank band");
    expect(at([0, 12 + 7, 10], [0, -1, 0])).toBe("Socket"); // the socket's roof faces down, toward the axis
    expect(at([0, 0, 30], [0, -1, 0])).toBe("Table");
    expect(at([10, 0.3, 62], [0, -1, 0])).toBe("Facing");
    expect(at([10, 0, 52], [0, -1, 0])).toBe("Side rails");
    expect(at([0, 4, 65], [0, -1, 0])).toBe("Baffle"); // seen through the window
    expect(at([0, 2, 79.5], [0, -1, 0])).toBe("Tip rail");
    expect(at([0, 15, 70], [0, 1, 0])).toBe("Beak");
    expect(at([0, 22, 30], [0, 1, 0])).toBe("Top");
    expect(at([12, 10, 30], [1, 0, 0])).toBe("Side");
    expect(at([0, 20, 46], [0, 0.8, 0.6])).toBe("Shoulder"); // the top dropping toward the beak
    expect(at([0, 18, 54], [0, 0.7, 0.7])).toBe("Shoulder"); // still leaning toward the tip
    expect(at([12, 10, 46], [1, 0, 0])).toBe("Shoulder");
    expect(pickRegion([12, 10, 46], [1, 0, 0], data, get)?.params[0]).toBe("shoulder_sweep");
  });
  it("leads with the most direct setting", () => {
    expect(pickRegion([10, 0.3, 62], [0, -1, 0], data, get)?.params[0]).toBe("tip_opening");
  });
});

describe("pickRegion, inside (through a cut)", () => {
  const inside = (p: [number, number, number], n: [number, number, number]) => pickRegion(p, n, data, get, true)?.title;
  it("names the air space's faces", () => {
    expect(inside([0, 12, 10], [0, -1, 0])).toBe("Socket");
    expect(inside([0, 8, 24], [0, 1, 0])).toBe("Bore");
    expect(inside([0, 6, 30], [0, 1, 0])).toBe("Throat");
    expect(inside([0, 3, 40], [0, 1, 0])).toBe("Chamber floor"); // not the outside's top
    expect(inside([0, 9, 40], [0, -1, 0])).toBe("Chamber roof");
    expect(inside([0, 7, 65], [0, -1, 0])).toBe("Baffle");
    expect(inside([6, 6, 40], [-1, 0, 0])).toBe("Chamber walls"); // not the outside's side
    expect(inside([6, 4, 55], [-1, 0, 0])).toBe("Chamber walls"); // under the window too
  });
});

describe("toDesign", () => {
  it("undoes the print tilt and lift", () => {
    const frame = { print: true, tilt: 90, lift: 5 };
    const [x, y, z] = toDesign([1, 0, 15], frame); // tilted 90° and lifted 5: design z 10 lies along -y
    expect([x, Math.round(y), Math.round(z)]).toEqual([1, -10, 0]);
  });
});

describe("placeOf", () => {
  it("finds a setting's section", () => {
    expect(placeOf("tip_opening")?.section).toBe("Tip & facing");
    expect(placeOf("not_a_setting")).toBeNull();
  });
});
