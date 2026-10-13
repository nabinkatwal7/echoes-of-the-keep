import { describe, expect, it } from "vitest";
import {
  asiLevels,
  attacksPerAction,
  canMulticlassInto,
  casterLevel,
  firstLevelHp,
  levelForXp,
  levelUpHp,
  pactMagic,
  spellSlots,
  xpToNextLevel,
} from "./index";

const scores = (o: Partial<Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>>) => ({
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...o,
});

describe("XP and levels", () => {
  it.each([[0, 1], [299, 1], [300, 2], [6500, 5], [354999, 19], [355000, 20], [999999, 20]])(
    "%i XP is level %i",
    (xp, level) => expect(levelForXp(xp)).toBe(level),
  );
  it("reports XP to the next level", () => {
    expect(xpToNextLevel(250)).toBe(50);
    expect(xpToNextLevel(355000)).toBeNull();
  });
  it("gives extra ASIs to fighters and rogues", () => {
    expect(asiLevels("wizard")).toEqual([4, 8, 12, 16, 19]);
    expect(asiLevels("fighter")).toContain(6);
    expect(asiLevels("fighter")).toContain(14);
    expect(asiLevels("rogue")).toContain(10);
  });
});

describe("hit points", () => {
  it("1st level is max hit die plus Con", () => {
    expect(firstLevelHp(10, 14)).toBe(12);
    expect(firstLevelHp(6, 8)).toBe(5);
  });
  it("later levels use average or rolled values, minimum 1", () => {
    expect(levelUpHp(10, 14)).toBe(8);
    expect(levelUpHp(8, 14, 3)).toBe(5);
    expect(levelUpHp(6, 6, 1)).toBe(1);
    expect(() => levelUpHp(8, 10, 9)).toThrow(RangeError);
  });
});

describe("multiclassing prerequisites (PHB p.163)", () => {
  it("needs 13 in both the current and new class abilities", () => {
    expect(canMulticlassInto("wizard", ["fighter"], scores({ str: 13, int: 13 }))).toBe(true);
    expect(canMulticlassInto("wizard", ["fighter"], scores({ str: 13, int: 12 }))).toBe(false);
    expect(canMulticlassInto("wizard", ["fighter"], scores({ str: 12, dex: 12, int: 14 }))).toBe(false);
  });
  it("fighters qualify with Str or Dex", () => {
    expect(canMulticlassInto("fighter", ["rogue"], scores({ dex: 13 }))).toBe(true);
  });
  it("monks need Dex and Wis", () => {
    expect(canMulticlassInto("monk", [], scores({ dex: 13, wis: 12 }))).toBe(false);
  });
});

describe("multiclass spell slots (PHB p.164-165)", () => {
  it("single full caster matches its own level", () => {
    expect(spellSlots([{ classIndex: "wizard", level: 5 }])).toEqual([4, 3, 2]);
  });
  it("combines levels: Cleric 3 / Paladin 2 is caster level 4", () => {
    const classes = [{ classIndex: "cleric", level: 3 }, { classIndex: "paladin", level: 2 }];
    expect(casterLevel(classes)).toBe(4);
    expect(spellSlots(classes)).toEqual([4, 3]);
  });
  it("Fighter 5 / Wizard 3 only counts wizard levels", () => {
    expect(spellSlots([{ classIndex: "fighter", level: 5 }, { classIndex: "wizard", level: 3 }])).toEqual([4, 2]);
  });
  it("counts Eldritch Knight and Arcane Trickster as third casters", () => {
    expect(casterLevel([{ classIndex: "fighter", level: 9, subclassIndex: "eldritch-knight" }])).toBe(3);
    expect(spellSlots([{ classIndex: "barbarian", level: 5 }])).toEqual([]);
  });
  it("20th-level full caster has 9th-level slots", () => {
    expect(spellSlots([{ classIndex: "sorcerer", level: 20 }])).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
  });
  it("Pact Magic is separate", () => {
    expect(pactMagic(1)).toEqual({ slots: 1, slotLevel: 1 });
    expect(pactMagic(5)).toEqual({ slots: 2, slotLevel: 3 });
    expect(pactMagic(11)).toEqual({ slots: 3, slotLevel: 5 });
    expect(pactMagic(17)).toEqual({ slots: 4, slotLevel: 5 });
    expect(spellSlots([{ classIndex: "warlock", level: 10 }])).toEqual([]);
  });
});

describe("Extra Attack does not stack", () => {
  it("takes the best, not the sum", () => {
    expect(attacksPerAction([{ classIndex: "fighter", level: 5 }, { classIndex: "paladin", level: 5 }])).toBe(2);
    expect(attacksPerAction([{ classIndex: "fighter", level: 11 }])).toBe(3);
    expect(attacksPerAction([{ classIndex: "wizard", level: 20 }])).toBe(1);
  });
});
