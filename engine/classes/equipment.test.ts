import { describe, expect, it } from "vitest";
import { importers } from "../../content/build/importers";
import { CLASS_RULES } from "./rules";
import { STARTING_GOLD, STARTING_KITS, WEAPON_PROFICIENCIES, armorProficiencies, weaponProficient } from "./equipment";

describe("weapon proficiency", () => {
  it("categories and specific weapons", () => {
    expect(weaponProficient(["fighter"], "Greataxe", "Martial Melee Weapons")).toBe(true);
    expect(weaponProficient(["wizard"], "Longsword", "Martial Melee Weapons")).toBe(false);
    expect(weaponProficient(["wizard"], "Dagger", "Simple Melee Weapons")).toBe(true);
    expect(weaponProficient(["rogue"], "Rapier", "Martial Melee Weapons")).toBe(true);
    expect(weaponProficient(["rogue"], "Crossbow, hand", "Martial Ranged Weapons")).toBe(true);
    expect(weaponProficient(["cleric"], "Rapier", "Martial Melee Weapons")).toBe(false);
  });
  it("a second class grants only the multiclass subset (PHB p.164)", () => {
    expect(weaponProficient(["wizard", "fighter"], "Longsword", "Martial Melee Weapons")).toBe(true); // fighter grants martial
    expect(weaponProficient(["wizard", "rogue"], "Rapier", "Martial Melee Weapons")).toBe(false); // rogue grants none as a second class
    expect(weaponProficient(["rogue", "wizard"], "Rapier", "Martial Melee Weapons")).toBe(true); // but the starting rogue has it
    expect(weaponProficient(["fighter", "monk"], "Shortsword", "Martial Melee Weapons")).toBe(true);
  });
  it("armor training across classes", () => {
    const full = { wizard: [] as string[], fighter: ["light", "medium", "heavy", "shields"], cleric: ["light", "medium", "shields"] };
    expect(armorProficiencies(["wizard", "fighter"], full).sort()).toEqual(["light", "medium", "shields"]); // no heavy as a second class
    expect(armorProficiencies(["fighter", "cleric"], full).sort()).toEqual(["heavy", "light", "medium", "shields"]);
    expect(armorProficiencies(["wizard"], full)).toEqual([]);
  });
});

describe("class data tables", () => {
  it("cover all twelve classes", () => {
    for (const c of Object.keys(CLASS_RULES)) {
      expect(WEAPON_PROFICIENCIES[c], c).toBeDefined();
      expect(STARTING_GOLD[c], c).toBeDefined();
      expect(STARTING_KITS[c], c).toBeDefined();
    }
  });
  it("every kit item exists in the equipment catalog", () => {
    const catalog = new Set((importers.find((i) => i.name === "equipment")!.load() as { index: string }[]).map((e) => e.index));
    for (const [cls, kit] of Object.entries(STARTING_KITS)) for (const item of kit) expect(catalog.has(item.index), `${cls}: ${item.index}`).toBe(true);
  });
});
