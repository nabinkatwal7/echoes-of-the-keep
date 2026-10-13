import { describe, expect, it } from "vitest";
import { areaSquares, creaturesInArea } from "@/engine/combat/area";
import { maxTargets, parseSpellEffect, projectileCount, scaledDice, durationToRounds } from "./effects";

const spell = (o: Partial<Parameters<typeof parseSpellEffect>[0]> & { description: string }) => ({
  level: 1, range: "60 feet", duration: "Instantaneous", higherLevels: "", concentration: false, ...o,
});

const fireball = parseSpellEffect(spell({
  level: 3, range: "150 feet",
  description: "Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d 6 fire damage on a failed save, or half as much damage on a successful one.",
  higherLevels: "When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.",
}));

describe("parsing spell text", () => {
  it("reads a save-for-half area spell", () => {
    expect(fireball).toMatchObject({ delivery: "save", save: "dex", halfOnSave: true, damage: { dice: "8d6", type: "fire" }, area: { shape: "sphere", size: 20, fromSelf: false } });
    expect(scaledDice("8d6", fireball, 3, 5, 9)).toBe("10d6");
  });

  it("reads spell attacks and cantrip scaling", () => {
    const e = parseSpellEffect(spell({
      level: 0, description: "Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage.\nThis spell’s damage increases by 1d10 when you reach 5th level (2 d10), 11th level (3 d10), and 17th level (4 d10).",
    }));
    expect(e).toMatchObject({ delivery: "attack", attack: "ranged", cantripScaling: true });
    expect(scaledDice("1d10", e, 0, 0, 4)).toBe("1d10");
    expect(scaledDice("1d10", e, 0, 0, 5)).toBe("2d10");
    expect(scaledDice("1d10", e, 0, 0, 17)).toBe("4d10");
  });

  it("reads healing with the casting modifier and upcasting", () => {
    const e = parseSpellEffect(spell({
      range: "Touch", description: "A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier.",
      higherLevels: "When you cast this spell using a spell slot of 2nd level or higher, the healing increases by 1d8 for each slot level above 1st.",
    }));
    expect(e).toMatchObject({ delivery: "heal", healing: { dice: "1d8", addModifier: true }, range: { kind: "touch" } });
    expect(scaledDice("1d8", e, 1, 3, 5)).toBe("3d8");
  });

  it("reads darts that grow with slot level", () => {
    const e = parseSpellEffect(spell({
      description: "You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target. The darts all strike simultaneously.",
      higherLevels: "the spell creates one more dart for each slot level above 1st.",
    }));
    expect(e.damage).toEqual({ dice: "1d4", type: "force", flat: 1 });
    expect(projectileCount(e, 1, 1)).toBe(3);
    expect(projectileCount(e, 1, 3)).toBe(5);
  });

  it("reads a condition spell with extra targets and duration", () => {
    const e = parseSpellEffect(spell({
      level: 2, duration: "Concentration, up to 1 minute", concentration: true,
      description: "The target must succeed on a Wisdom saving throw or be paralyzed for the duration.",
      higherLevels: "you can target one additional humanoid for each slot level above 2nd.",
    }));
    expect(e).toMatchObject({ delivery: "save", save: "wis", condition: "paralyzed", durationRounds: 10, concentration: true });
    expect(maxTargets(e, 2, 4)).toBe(3);
  });

  it("reads self-origin shapes from the range line", () => {
    expect(parseSpellEffect(spell({ range: "Self (15-foot cone)", description: "Each creature in a 15-foot cone must make a Dexterity saving throw. A creature takes 3d6 fire damage on a failed save." })).area).toEqual({ shape: "cone", size: 15, fromSelf: true });
    expect(parseSpellEffect(spell({ range: "Self (100-foot line)", description: "forming a line 100 feet long and 5 feet wide ... Dexterity saving throw. 8d6 lightning damage" })).area).toEqual({ shape: "line", size: 100, width: 5, fromSelf: true });
  });

  it("treats unknown spells as narrated", () => {
    expect(parseSpellEffect(spell({ description: "You gain the ability to breathe water." })).delivery).toBe("none");
  });

  it("converts durations to rounds", () => {
    expect(durationToRounds("1 round")).toBe(1);
    expect(durationToRounds("Concentration, up to 1 hour")).toBe(600);
    expect(durationToRounds("Instantaneous")).toBe(0);
  });
});

describe("area templates", () => {
  const squares = (s: Set<string>) => [...s].sort();

  it("a 20-foot sphere covers a rounded 9x9-ish blob around the point", () => {
    const a = areaSquares({ shape: "sphere", radius: 20 }, { x: 10, y: 10 });
    expect(a.has("10,10")).toBe(true);
    expect(a.has("14,10")).toBe(true);
    expect(a.has("15,10")).toBe(false);
    expect(a.has("14,14")).toBe(false);
  });

  it("a cone widens with distance and stays in front", () => {
    const a = areaSquares({ shape: "cone", length: 15 }, { x: 5, y: 5 }, { x: 10, y: 5 });
    expect(a.has("8,5")).toBe(true);
    expect(a.has("8,6")).toBe(true);
    expect(a.has("8,3")).toBe(false);
    expect(a.has("2,5")).toBe(false);
    expect(a.has("9,5")).toBe(false); // beyond 15 feet
    expect(a.has("5,5")).toBe(false); // not the caster
  });

  it("a line is a narrow strip along the direction", () => {
    const a = areaSquares({ shape: "line", length: 30, width: 5 }, { x: 0, y: 3 }, { x: 4, y: 3 });
    expect(squares(a)).toEqual(["1,3", "2,3", "3,3", "4,3", "5,3", "6,3"]);
  });

  it("a self cube sits against the caster; a point cube is centered", () => {
    const self = areaSquares({ shape: "cube", side: 15 }, { x: 5, y: 5 }, { x: 9, y: 5 }, { width: 40, height: 40, fromSelf: true });
    expect(squares(self)).toEqual(["6,4", "6,5", "6,6", "7,4", "7,5", "7,6", "8,4", "8,5", "8,6"]);
    const point = areaSquares({ shape: "cube", side: 10 }, { x: 5, y: 5 });
    expect(point.size).toBe(4);
  });

  it("stays on the map and excludes the caster", () => {
    const a = areaSquares({ shape: "sphere", radius: 10 }, { x: 0, y: 0 }, undefined, { width: 5, height: 5 });
    expect([...a].every((k) => k.split(",").every((n) => Number(n) >= 0))).toBe(true);
    const found = creaturesInArea(a, [{ id: "a", x: 0, y: 0 }, { id: "b", x: 1, y: 1 }, { id: "c", x: 4, y: 4 }, { id: "d", x: null, y: null }], "a");
    expect(found.map((f) => f.id)).toEqual(["b"]);
  });
});
