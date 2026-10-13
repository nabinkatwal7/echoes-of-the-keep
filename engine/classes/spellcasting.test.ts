import { describe, expect, it } from "vitest";
import { CASTER_KIND, cantripsKnown, maxSpellLevel, spellLimits, validateSpellSelection, type SpellMeta } from "./spellcasting";

const catalog = new Map<string, SpellMeta>(
  [
    { index: "fire-bolt", name: "Fire Bolt", level: 0, classes: ["Sorcerer", "Wizard"] },
    { index: "light", name: "Light", level: 0, classes: ["Bard", "Cleric", "Sorcerer", "Wizard"] },
    { index: "mage-hand", name: "Mage Hand", level: 0, classes: ["Bard", "Sorcerer", "Warlock", "Wizard"] },
    { index: "magic-missile", name: "Magic Missile", level: 1, classes: ["Sorcerer", "Wizard"] },
    { index: "shield", name: "Shield", level: 1, classes: ["Sorcerer", "Wizard"] },
    { index: "fireball", name: "Fireball", level: 3, classes: ["Sorcerer", "Wizard"] },
    { index: "cure-wounds", name: "Cure Wounds", level: 1, classes: ["Bard", "Cleric", "Druid", "Paladin", "Ranger"] },
  ].map((s) => [s.index, s]),
);

describe("limits", () => {
  it("cantrips known follow the class tables", () => {
    expect([1, 4, 10].map((l) => cantripsKnown("wizard", l))).toEqual([3, 4, 5]);
    expect([1, 4, 10].map((l) => cantripsKnown("sorcerer", l))).toEqual([4, 5, 6]);
    expect(cantripsKnown("fighter", 5)).toBe(0);
    expect(cantripsKnown("paladin", 5)).toBe(0);
  });
  it("known casters have a fixed spell count", () => {
    expect(spellLimits("sorcerer", 1, 16)).toMatchObject({ kind: "known", cantrips: 4, spells: 2 });
    expect(spellLimits("bard", 5, 16)!.spells).toBe(8);
    expect(spellLimits("ranger", 1, 14)!.spells).toBe(0);
    expect(spellLimits("ranger", 5, 14)!.spells).toBe(4);
    expect(spellLimits("warlock", 11, 16)!.spells).toBe(11);
  });
  it("prepared casters use ability modifier plus level", () => {
    expect(spellLimits("cleric", 5, 16)).toMatchObject({ kind: "prepared", spells: 8 });
    expect(spellLimits("wizard", 3, 16)).toMatchObject({ spells: 6, spellbook: 10 });
    expect(spellLimits("paladin", 1, 14)!.spells).toBe(0);
    expect(spellLimits("paladin", 5, 14)!.spells).toBe(4);
    expect(spellLimits("druid", 1, 8)!.spells).toBe(1);
  });
  it("non-casters have no limits", () => {
    expect(spellLimits("barbarian", 5, 10)).toBeNull();
  });
  it("max spell level by class level", () => {
    expect([1, 3, 5, 17].map((l) => maxSpellLevel("wizard", l))).toEqual([1, 2, 3, 9]);
    expect([1, 2, 5, 9, 13, 17].map((l) => maxSpellLevel("paladin", l))).toEqual([0, 1, 2, 3, 4, 5]);
    expect([1, 3, 9, 17].map((l) => maxSpellLevel("warlock", l))).toEqual([1, 2, 5, 5]);
  });
  it("lists exactly the eight caster classes", () => {
    expect(Object.keys(CASTER_KIND).sort()).toEqual(["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard"]);
  });
});

describe("validateSpellSelection", () => {
  const none = { known: [], prepared: [], spellbook: [] };

  it("accepts a legal sorcerer", () => {
    expect(validateSpellSelection("sorcerer", 1, 16, { ...none, known: ["fire-bolt", "light", "mage-hand", "magic-missile", "shield"] }, catalog)).toEqual([]);
  });
  it("rejects spells off the class list or above the castable level", () => {
    const errors = validateSpellSelection("sorcerer", 1, 16, { ...none, known: ["cure-wounds", "fireball"] }, catalog);
    expect(errors.join()).toMatch(/not a Sorcerer spell/);
    expect(errors.join()).toMatch(/above the known spell level/);
  });
  it("enforces cantrip and spell counts", () => {
    const tooManyCantrips = validateSpellSelection("sorcerer", 1, 16, { ...none, known: ["fire-bolt", "light", "mage-hand"] }, catalog);
    expect(tooManyCantrips).toEqual([]); // 3 <= 4
    const tooManySpells = validateSpellSelection("sorcerer", 1, 16, { ...none, known: ["magic-missile", "shield", "magic-missile"] }, catalog);
    expect(tooManySpells.join()).toMatch(/Duplicate/);
  });
  it("wizards must prepare from the spellbook", () => {
    const sel = { known: [], spellbook: ["magic-missile"], prepared: ["magic-missile", "shield"] };
    expect(validateSpellSelection("wizard", 1, 16, sel, catalog).join()).toMatch(/Shield must be in your spellbook/);
    expect(validateSpellSelection("wizard", 1, 16, { ...sel, prepared: ["magic-missile"] }, catalog)).toEqual([]);
  });
  it("non-casters cannot have spells", () => {
    expect(validateSpellSelection("fighter", 5, 10, { ...none, known: ["light"] }, catalog)).not.toEqual([]);
    expect(validateSpellSelection("fighter", 5, 10, none, catalog)).toEqual([]);
  });
});
