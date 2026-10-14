import { describe, expect, it } from "vitest";
import { startTurn } from "@/engine/combat";
import { parseSpellEffect } from "@/engine/spells/effects";
import { planHeroTurn, slotFor, type HeroPlanInput, type SpellOption } from "./heroAi";
import { automationMode } from "./spellRules";
import type { AttackProfile, Cmb } from "./rules";

const cmb = (id: string, x: number, y: number, over: Partial<Cmb> = {}): Cmb => ({
  id, kind: "character", name: id, ac: 13, hp: 30, maxHp: 30, tempHp: 0, speed: 30, initiative: 10, dexMod: 1, conditions: [], hidden: false, surprised: false,
  defeated: false, deathSaves: { successes: 0, failures: 0 }, turn: startTurn(30), x, y, defenses: {}, ...over,
});
const foe = (id: string, x: number, y: number, over: Partial<Cmb> = {}) => cmb(id, x, y, { kind: "monster", ...over });

const spell = (index: string, level: number, text: Partial<Parameters<typeof parseSpellEffect>[0]> & { description: string }, time: SpellOption["time"] = "action"): SpellOption => {
  const effect = parseSpellEffect({ level, range: "60 feet", duration: "Instantaneous", higherLevels: "", concentration: false, ...text });
  return { index, name: index, level, time, concentration: effect.concentration, effect, mode: automationMode(index, effect) };
};
const fireBolt = spell("fire-bolt", 0, { description: "Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage." });
const cure = spell("cure-wounds", 1, { range: "Touch", description: "A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier." });
const healingWord = spell("healing-word", 1, { description: "A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier." }, "bonus");
const fireball = spell("fireball", 3, { range: "150 feet", description: "Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one." });
const sword: AttackProfile = { name: "Longsword", toHit: 5, dice: "1d8", modifier: 3, damageType: "slashing", melee: true };

const input = (over: Partial<HeroPlanInput> = {}): HeroPlanInput => ({
  self: cmb("hero", 5, 5), allies: [], foes: [foe("wolf", 6, 5)], profiles: [sword], spells: [], slotsLeft: {}, spellAttackBonus: 5, saveDc: 13, castMod: 3, round: 2,
  occupied: new Set(), width: 30, height: 30, ...over,
});

describe("slots", () => {
  it("cantrips are free and spells use the lowest slot that fits", () => {
    expect(slotFor(fireBolt, {})).toBe(0);
    expect(slotFor(cure, { 1: 0, 2: 1 })).toBe(2);
    expect(slotFor(fireball, { 1: 2, 2: 1 })).toBeNull();
  });
});

describe("a hero's turn", () => {
  it("a fighter walks up and attacks twice with Extra Attack", () => {
    const plan = planHeroTurn(input({ self: { ...cmb("hero", 2, 5), attacksPerAction: 2 }, foes: [foe("wolf", 6, 5)] }));
    expect(plan.steps[0]).toMatchObject({ kind: "move" });
    expect(plan.steps.at(-1)).toMatchObject({ kind: "attack", times: 2, attack: "Longsword" });
  });

  it("a healer mends the hurt ally first, using the bonus action spell and then still acting", () => {
    const plan = planHeroTurn(input({
      self: cmb("cleric", 5, 5), allies: [cmb("fighter", 7, 5, { hp: 5 })], spells: [cure, healingWord, fireBolt], slotsLeft: { 1: 2 }, profiles: [],
    }));
    expect(plan.steps[0]).toMatchObject({ kind: "cast", spell: "healing-word", targetIds: ["fighter"] });
    expect(plan.steps.some((s) => s.kind === "cast" && s.spell === "fire-bolt")).toBe(true);
  });

  it("walks to a downed ally to use a touch spell when no bonus spell exists", () => {
    const plan = planHeroTurn(input({ self: cmb("cleric", 2, 5), allies: [cmb("fighter", 7, 5, { hp: 0 })], spells: [cure], slotsLeft: { 1: 1 }, profiles: [], foes: [foe("wolf", 12, 5)] }));
    expect(plan.steps[0]).toMatchObject({ kind: "move" });
    expect(plan.steps[1]).toMatchObject({ kind: "cast", spell: "cure-wounds", targetIds: ["fighter"] });
    expect(plan.note).toBe("heals");
  });

  it("does not heal when nobody is hurt, and attacks instead", () => {
    const plan = planHeroTurn(input({ self: cmb("cleric", 5, 5), allies: [cmb("fighter", 7, 5)], spells: [cure, healingWord, fireBolt], slotsLeft: { 1: 2 }, profiles: [] }));
    expect(plan.steps.some((s) => s.kind === "cast" && s.spell === "cure-wounds")).toBe(false);
    expect(plan.steps.at(-1)).toMatchObject({ kind: "cast", spell: "fire-bolt" });
  });

  it("a wizard casts Fireball on a clump of foes, but not when it would hit a friend", () => {
    const pack = [foe("a", 12, 5), foe("b", 13, 5), foe("c", 12, 6)];
    const plan = planHeroTurn(input({ self: cmb("wiz", 3, 5), foes: pack, spells: [fireBolt, fireball], slotsLeft: { 3: 1 }, profiles: [] }));
    expect(plan.steps.at(-1)).toMatchObject({ kind: "cast", spell: "fireball", point: { x: expect.any(Number), y: expect.any(Number) } });
    const friendly = planHeroTurn(input({ self: cmb("wiz", 3, 5), foes: pack, allies: [cmb("friend", 13, 6)], spells: [fireBolt, fireball], slotsLeft: { 3: 1 }, profiles: [] }));
    expect(friendly.steps.at(-1)).toMatchObject({ kind: "cast", spell: "fire-bolt" });
  });

  it("a wizard with no slots left uses the cantrip, and a lone weak foe does not earn a big slot", () => {
    const none = planHeroTurn(input({ self: cmb("wiz", 3, 5), foes: [foe("a", 9, 5), foe("b", 10, 5)], spells: [fireBolt, fireball], slotsLeft: {}, profiles: [] }));
    expect(none.steps.at(-1)).toMatchObject({ kind: "cast", spell: "fire-bolt" });
    const lone = planHeroTurn(input({ self: cmb("wiz", 3, 5), foes: [foe("a", 9, 5, { hp: 6 })], spells: [fireBolt, fireball], slotsLeft: { 3: 1 }, profiles: [] }));
    expect(lone.steps.at(-1)).toMatchObject({ kind: "cast", spell: "fire-bolt" });
  });

  it("does nothing when there is no one to fight, and dodges when it cannot reach anyone", () => {
    expect(planHeroTurn(input({ foes: [] })).steps).toEqual([]);
    const walled = new Set(["4,4", "4,5", "4,6", "5,4", "5,6", "6,4", "6,5", "6,6"]);
    const boxed = planHeroTurn(input({ occupied: walled, foes: [foe("far", 15, 5)], profiles: [sword] }));
    expect(boxed.steps.at(-1)).toMatchObject({ kind: "dodge" });
  });
});
