import { describe, expect, it } from "vitest";
import { proficiencyBonus } from "@/engine/abilities";
import { attacksPerAction, levelForXp, pactMagic, spellSlots, type ClassLevel } from "@/engine/progression";
import { deriveCharacter } from "./index";

const scores = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 };
const hero = (classes: ClassLevel[], over: object = {}) => deriveCharacter({ classes, baseScores: scores, speed: 30, saveProficiencies: ["str", "con"], skillProficiencies: ["athletics"], ...over });

describe("high-level characters (levels 5, 10, 15 and 20)", () => {
  it("proficiency bonus steps up at 5, 9, 13 and 17", () => {
    expect([1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(proficiencyBonus)).toEqual([2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
  });

  it("a fighter gains attacks at 5, 11 and 20", () => {
    expect([1, 4, 5, 10, 11, 19, 20].map((l) => attacksPerAction([{ classIndex: "fighter", level: l }]))).toEqual([1, 1, 2, 2, 3, 3, 4]);
    expect(attacksPerAction([{ classIndex: "rogue", level: 20 }])).toBe(1);
    expect(attacksPerAction([{ classIndex: "paladin", level: 5 }])).toBe(2);
  });

  it("hit points follow the fixed average per level", () => {
    // fighter d10 with Con 14 (+2): 12 at level 1, then 8 per level
    expect(hero([{ classIndex: "fighter", level: 5 }]).maxHp).toBe(12 + 4 * 8);
    expect(hero([{ classIndex: "fighter", level: 20 }]).maxHp).toBe(12 + 19 * 8);
    // barbarian d12 with Con 20 (+5): 17 at level 1, then 12 per level
    expect(hero([{ classIndex: "barbarian", level: 20 }], { baseScores: { ...scores, con: 20 } }).maxHp).toBe(17 + 19 * 12);
  });

  it("ability scores cap at 20 even with bonuses", () => {
    const h = hero([{ classIndex: "fighter", level: 20 }], { baseScores: { ...scores, str: 20 }, scoreBonuses: { str: 4 } });
    expect(h.abilities.str).toEqual({ score: 20, modifier: 5 });
  });

  it("full casters reach the handbook's slot tables", () => {
    expect(spellSlots([{ classIndex: "wizard", level: 5 }])).toEqual([4, 3, 2]);
    expect(spellSlots([{ classIndex: "wizard", level: 10 }])).toEqual([4, 3, 3, 3, 2]);
    expect(spellSlots([{ classIndex: "cleric", level: 15 }])).toEqual([4, 3, 3, 3, 2, 1, 1, 1]);
    expect(spellSlots([{ classIndex: "wizard", level: 20 }])).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
  });

  it("half casters and non-casters", () => {
    expect(spellSlots([{ classIndex: "paladin", level: 5 }])).toEqual([4, 2]);
    expect(spellSlots([{ classIndex: "ranger", level: 20 }])).toEqual([4, 3, 3, 3, 2]);
    expect(spellSlots([{ classIndex: "fighter", level: 20 }])).toEqual([]);
    expect(spellSlots([{ classIndex: "paladin", level: 1 }])).toEqual([]); // no spellcasting until 2nd level
    expect(spellSlots([{ classIndex: "paladin", level: 2 }])).toEqual([2]);
    expect(spellSlots([{ classIndex: "fighter", level: 7, subclassIndex: "eldritch-knight" }])).toEqual([4, 2]);
    expect(spellSlots([{ classIndex: "fighter", level: 3, subclassIndex: "eldritch-knight" }])).toEqual([2]);
    // multiclass rounds down: paladin 5 + wizard 1 = 2 + 1
    expect(spellSlots([{ classIndex: "paladin", level: 5 }, { classIndex: "wizard", level: 1 }])).toEqual([4, 2]);
  });

  it("warlocks use pact slots that top out at 5th level", () => {
    expect(pactMagic(5)).toEqual({ slots: 2, slotLevel: 3 });
    expect(pactMagic(11)).toEqual({ slots: 3, slotLevel: 5 });
    expect(pactMagic(17)).toEqual({ slots: 4, slotLevel: 5 });
    expect(pactMagic(20)).toEqual({ slots: 4, slotLevel: 5 });
  });

  it("multiclass spell slots add class levels by caster type", () => {
    // fighter 5 contributes nothing; wizard 5 gives caster level 5
    expect(spellSlots([{ classIndex: "fighter", level: 5 }, { classIndex: "wizard", level: 5 }])).toEqual([4, 3, 2]);
    // wizard 4 + cleric 4 = caster level 8
    expect(spellSlots([{ classIndex: "wizard", level: 4 }, { classIndex: "cleric", level: 4 }])).toEqual([4, 3, 3, 2]);
    // total level counts for proficiency
    expect(hero([{ classIndex: "fighter", level: 8 }, { classIndex: "wizard", level: 8 }]).proficiencyBonus).toBe(5);
  });

  it("experience maps to levels from 1 to 20", () => {
    expect([0, 300, 6500, 14000, 85000, 100000, 355000, 9999999].map(levelForXp)).toEqual([1, 2, 5, 6, 11, 12, 20, 20]);
  });

  it("saves and skills use the level's proficiency bonus", () => {
    const h = hero([{ classIndex: "fighter", level: 17 }]);
    expect(h.proficiencyBonus).toBe(6);
    expect(h.saves.str.total).toBe(3 + 6);
    expect(h.saves.dex.total).toBe(2);
    expect(h.skills.athletics.total).toBe(3 + 6);
  });

  it("the return-from-death penalty lowers every d20 test", () => {
    const base = hero([{ classIndex: "fighter", level: 5 }]);
    const risen = hero([{ classIndex: "fighter", level: 5 }], { d20Penalty: 4 });
    expect(risen.saves.str.total).toBe(base.saves.str.total - 4);
    expect(risen.skills.athletics.total).toBe(base.skills.athletics.total - 4);
  });
});
