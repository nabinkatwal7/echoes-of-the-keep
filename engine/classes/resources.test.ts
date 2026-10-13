import { describe, expect, it } from "vitest";
import { arcaneRecoveryBudget, classResources, rageDamage } from "./resources";

const scores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16 };
const find = (classes: { classIndex: string; level: number }[], key: string) => classResources(classes, scores).find((r) => r.key === key);

describe("class resources", () => {
  it("barbarian rage scales and becomes unlimited at 20", () => {
    expect([1, 3, 6, 12, 17].map((l) => find([{ classIndex: "barbarian", level: l }], "rage")!.max)).toEqual([2, 3, 4, 5, 6]);
    expect(find([{ classIndex: "barbarian", level: 20 }], "rage")).toBeUndefined();
    expect([1, 9, 16].map(rageDamage)).toEqual([2, 3, 4]);
  });
  it("fighter: second wind, action surge and indomitable", () => {
    expect(find([{ classIndex: "fighter", level: 1 }], "second-wind")).toMatchObject({ max: 1, recharge: "short" });
    expect(find([{ classIndex: "fighter", level: 1 }], "action-surge")).toBeUndefined();
    expect(find([{ classIndex: "fighter", level: 17 }], "action-surge")!.max).toBe(2);
    expect(find([{ classIndex: "fighter", level: 17 }], "indomitable")).toMatchObject({ max: 3, recharge: "long" });
  });
  it("bard inspiration uses Charisma and recharges on a short rest from level 5", () => {
    expect(find([{ classIndex: "bard", level: 1 }], "bardic-inspiration")).toMatchObject({ max: 3, recharge: "long" });
    expect(find([{ classIndex: "bard", level: 5 }], "bardic-inspiration")!.recharge).toBe("short");
  });
  it("pools: ki, lay on hands and sorcery points", () => {
    expect(find([{ classIndex: "monk", level: 5 }], "ki")).toMatchObject({ max: 5, style: "pool", recharge: "short" });
    expect(find([{ classIndex: "monk", level: 1 }], "ki")).toBeUndefined();
    expect(find([{ classIndex: "paladin", level: 4 }], "lay-on-hands")!.max).toBe(20);
    expect(find([{ classIndex: "sorcerer", level: 6 }], "sorcery-points")!.max).toBe(6);
  });
  it("channel divinity counts", () => {
    expect([1, 2, 6, 18].map((l) => find([{ classIndex: "cleric", level: l }], "channel-divinity")?.max ?? 0)).toEqual([0, 1, 2, 3]);
  });
  it("multiclass characters track shared feature names separately", () => {
    const keys = classResources([{ classIndex: "cleric", level: 3 }, { classIndex: "paladin", level: 3 }], scores).map((r) => r.key);
    expect(keys).toContain("cleric:channel-divinity");
    expect(keys).toContain("paladin:channel-divinity");
  });
  it("arcane recovery budget is half wizard level rounded up", () => {
    expect([1, 4, 5, 20].map(arcaneRecoveryBudget)).toEqual([1, 2, 3, 10]);
  });
});
