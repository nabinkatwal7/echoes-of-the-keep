import { describe, expect, it } from "vitest";
import { collectEffects } from "./index";

const base = { raceIndex: "human", subraceIndex: null, feats: [] as string[], classes: [{ classIndex: "fighter", level: 1 }] };

describe("racial effects", () => {
  it("hill dwarf: +1 HP per level, poison resistance, darkvision", () => {
    const e = collectEffects({ ...base, raceIndex: "dwarf", subraceIndex: "hill-dwarf" });
    expect(e).toMatchObject({ hpPerLevel: 1, darkvision: 60, resistances: ["poison"] });
  });
  it("wood elf is faster, drow sees farther", () => {
    expect(collectEffects({ ...base, raceIndex: "elf", subraceIndex: "wood-elf" }).speedBonus).toBe(5);
    expect(collectEffects({ ...base, raceIndex: "elf", subraceIndex: "dark-elf-drow" }).darkvision).toBe(120);
  });
  it("tiefling resists fire", () => {
    expect(collectEffects({ ...base, raceIndex: "tiefling" }).resistances).toEqual(["fire"]);
  });
  it("standard humans have no effects", () => {
    expect(collectEffects(base)).toMatchObject({ hpPerLevel: 0, speedBonus: 0, darkvision: 0 });
  });
});

describe("feat effects", () => {
  it("tough, alert, mobile and observant", () => {
    const e = collectEffects({ ...base, feats: ["tough", "alert", "mobile", "observant"] });
    expect(e).toMatchObject({ hpPerLevel: 2, initiativeBonus: 5, speedBonus: 10, passivePerceptionBonus: 5 });
  });
  it("unautomated feats are still listed as traits", () => {
    const e = collectEffects({ ...base, feats: ["lucky"] });
    expect(e.traits.some((t) => t.name === "Lucky" && !t.automated)).toBe(true);
  });
});

describe("class effects", () => {
  it("bards get Jack of All Trades at 2nd level", () => {
    expect(collectEffects({ ...base, classes: [{ classIndex: "bard", level: 1 }] }).jackOfAllTrades).toBe(false);
    expect(collectEffects({ ...base, classes: [{ classIndex: "bard", level: 2 }] }).jackOfAllTrades).toBe(true);
  });
  it("barbarian Fast Movement needs level 5 and no heavy armor", () => {
    const barb = (level: number, armor: "light" | "heavy" | null) => collectEffects({ ...base, classes: [{ classIndex: "barbarian", level }], armor }).speedBonus;
    expect(barb(4, null)).toBe(0);
    expect(barb(5, null)).toBe(10);
    expect(barb(5, "light")).toBe(10);
    expect(barb(5, "heavy")).toBe(0);
  });
  it("monk Unarmored Movement scales and needs no armor or shield", () => {
    const monk = (level: number, armor: "light" | null = null, shield = false) =>
      collectEffects({ ...base, classes: [{ classIndex: "monk", level }], armor, shield }).speedBonus;
    expect([1, 2, 6, 10, 14, 18].map((l) => monk(l))).toEqual([0, 10, 15, 20, 25, 30]);
    expect(monk(6, "light")).toBe(0);
    expect(monk(6, null, true)).toBe(0);
  });
});
