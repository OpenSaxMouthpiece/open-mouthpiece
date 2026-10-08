import { describe, expect, it, vi } from "vitest";
import { buildRail, type RailInput } from "./rail";

const input = (over: Partial<RailInput> = {}): RailInput => ({
  selected: "Body & beak",
  tools: true,
  designOK: true,
  ligOK: true,
  capOK: true,
  has: () => true,
  changed: (n) => n === "tip_opening",
  ligMade: false,
  capMade: false,
  pinned: false,
  codeOpen: false,
  tab: "mouthpiece",
  select: vi.fn(),
  toggleCode: vi.fn(),
  openPart: vi.fn(),
  showDock: vi.fn(),
  focusOn: vi.fn(),
  ...over,
});

describe("buildRail", () => {
  it("opens the remembered section", () => {
    const r = buildRail(input());
    expect(r.now).toBe("Body & beak");
    expect(r.section?.title).toBe("Body & beak");
    expect(r.items.find((i) => i.active)?.id).toBe("Body & beak");
  });

  it("keeps a tool open on the desktop, falls back to the first section on the phone", () => {
    expect(buildRail(input({ selected: "points" })).now).toBe("points");
    const phone = buildRail(input({ selected: "points", tools: false }));
    expect(phone.now).toBe(phone.sections[0].title);
    expect(phone.section).toBeDefined();
  });

  it("counts a section's changed settings on its button", () => {
    const tip = buildRail(input()).items.find((i) => i.id === "Tip & facing");
    expect(tip?.changed).toBe(1);
  });

  it("a pick opens the section's part and dock chart; Code only toggles", () => {
    const i = input();
    const r = buildRail(i);
    r.pick("Ligature");
    expect(i.openPart).toHaveBeenCalledWith("ligature");
    r.pick("Chamber & baffle");
    expect(i.showDock).toHaveBeenCalledWith("chamber");
    r.pick("code");
    expect(i.toggleCode).toHaveBeenCalled();
    expect(i.select).not.toHaveBeenCalledWith("code");
  });
});
