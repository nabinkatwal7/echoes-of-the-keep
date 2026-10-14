import { describe, expect, it } from "vitest";
import { startTurn } from "@/engine/combat";
import { parseSpellEffect } from "@/engine/spells/effects";
import { checkSummon, summonChoices } from "@/engine/spells/summons";
import { automationMode, dropConcentration, resolveSpell } from "./spellRules";
import { effectiveAc, resolveAttackAction, type Cmb } from "./rules";

const cmb = (over: Partial<Cmb> = {}): Cmb => ({
  id: "c", kind: "character", name: "Hero", ac: 12, hp: 20, maxHp: 30, tempHp: 0, speed: 30, initiative: 10, dexMod: 2,
  conditions: [], hidden: false, surprised: false, defeated: false, deathSaves: { successes: 0, failures: 0 },
  turn: startTurn(30), x: 0, y: 0, defenses: {}, ...over,
});
const low = () => 0;
const high = () => 0.999;
const meta = (o: object) => ({ index: "x", name: "X", level: 1, concentration: false, ...o });
const base = { casterLevel: 5, castMod: 3, attackBonus: 6, saveDc: 14 };
const spell = (o: object) => ({ level: 1, range: "30 feet", duration: "Instantaneous", higherLevels: "", concentration: false, description: "", ...o });
const sword = { name: "Sword", toHit: 5, dice: "1d8", modifier: 3, damageType: "slashing", melee: true };

describe("parsing the newer spell patterns", () => {
  it("flat healing, temporary hit points and hit point pools", () => {
    expect(parseSpellEffect(spell({ level: 6, description: "Choose a creature that you can see within range. A surge of positive energy washes through the creature, causing it to regain 70 hit points." })).healing).toMatchObject({ flat: 70 });
    const fl = parseSpellEffect(spell({ description: "You gain 1d4 + 4 temporary hit points for the duration.", higherLevels: "you gain 5 additional temporary hit points for each slot level above 1st." }));
    expect(fl).toMatchObject({ delivery: "temp", tempHp: { dice: "1d4", flat: 4, perSlotLevel: 5 } });
    const sleep = parseSpellEffect(spell({ range: "90 feet", duration: "1 minute", description: "Roll 5d8; the total is how many hit points of creatures this spell can affect. Creatures within 20 feet of a point you choose within range are affected.", higherLevels: "roll an additional 2d8 for each slot level above 1st." }));
    expect(sleep).toMatchObject({ delivery: "pool", pool: { dice: "5d8", condition: "unconscious" }, area: { shape: "sphere", size: 20 }, upcastDice: "2d8" });
  });

  it("classifies spells for the coverage report", () => {
    const e = (i: string) => automationMode(i, parseSpellEffect(spell({ description: "Nothing automatic here." })));
    expect(e("mage-armor")).toBe("buff");
    expect(e("bane")).toBe("debuff");
    expect(e("invisibility")).toBe("condition");
    expect(e("conjure-animals")).toBe("summon");
    expect(e("aid")).toBe("heal");
    expect(e("detect-magic")).toBe("narrated");
  });
});

describe("resolving them", () => {
  const sleepFx = parseSpellEffect(spell({ range: "90 feet", duration: "1 minute", description: "Roll 5d8; the total is how many hit points of creatures this spell can affect. Creatures within 20 feet of a point you choose within range are affected." }));

  it("Sleep puts the weakest creatures down first until the pool runs out", () => {
    const targets = [cmb({ id: "a", name: "Rat", hp: 4 }), cmb({ id: "b", name: "Ogre", hp: 59 }), cmb({ id: "c", name: "Goblin", hp: 7 })];
    const out = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets, spell: meta({ index: "sleep", name: "Sleep" }), effect: sleepFx, slotLevel: 1, rng: low });
    // five d8s roll 1 each: a pool of 5 covers the rat only
    expect(out.targets.find((t) => t.id === "a")!.conditions.map((c) => c.condition)).toEqual(["unconscious"]);
    expect(out.targets.find((t) => t.id === "c")!.conditions).toEqual([]);
    const big = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets, spell: meta({ index: "sleep", name: "Sleep" }), effect: sleepFx, slotLevel: 1, rng: high });
    expect(big.targets.find((t) => t.id === "c")!.conditions.length).toBe(1); // a pool of 40 covers the rat and the goblin
    expect(big.targets.find((t) => t.id === "b")!.conditions).toEqual([]);
  });

  it("False Life grants temporary hit points that do not stack", () => {
    const fx = parseSpellEffect(spell({ description: "You gain 1d4 + 4 temporary hit points for the duration." }));
    const out = resolveSpell({ ...base, caster: cmb({ id: "m", tempHp: 2 }), targets: [cmb({ id: "m", tempHp: 2 })], spell: meta({ name: "False Life" }), effect: fx, slotLevel: 1, rng: low });
    expect(out.targets[0].tempHp).toBe(5);
    const again = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: [cmb({ id: "m", tempHp: 20 })], spell: meta({ name: "False Life" }), effect: fx, slotLevel: 1, rng: low });
    expect(again.targets[0].tempHp).toBe(20);
  });

  it("Mage Armor sets AC to 13 + Dex and Barkskin to at least 16", () => {
    const none = parseSpellEffect(spell({ description: "Nothing." }));
    const ma = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: [cmb({ id: "t", ac: 10, dexMod: 3 })], spell: meta({ index: "mage-armor" }), effect: none, slotLevel: 1, rng: low });
    expect(effectiveAc(ma.targets[0])).toBe(16);
    const bs = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: [cmb({ id: "t", ac: 12 })], spell: meta({ index: "barkskin" }), effect: none, slotLevel: 2, rng: low });
    expect(effectiveAc(bs.targets[0])).toBe(16);
    const already = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: [cmb({ id: "t", ac: 18 })], spell: meta({ index: "barkskin" }), effect: none, slotLevel: 2, rng: low });
    expect(effectiveAc(already.targets[0])).toBe(18);
  });

  it("Faerie Fire gives attackers advantage on a failed save, and Bane subtracts a die", () => {
    const none = parseSpellEffect(spell({ description: "Nothing." }));
    const ff = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: [cmb({ id: "t", defenses: { saves: { dex: -10 } } })], spell: meta({ index: "faerie-fire", concentration: true }), effect: none, slotLevel: 1, rng: low });
    const marked = ff.targets[0];
    expect(marked.buffs?.some((b) => b.advAgainst)).toBe(true);
    const hit = resolveAttackAction(cmb({ id: "a" }), { ...marked, ac: 30 }, sword, {}, () => 0.1);
    expect(hit.mode).toBe("advantage");
    const saved = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: [cmb({ id: "t", defenses: { saves: { cha: 30 } } })], spell: meta({ index: "bane" }), effect: none, slotLevel: 1, rng: low });
    expect(saved.targets[0].buffs ?? []).toEqual([]);
    const failed = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: [cmb({ id: "t", defenses: { saves: { cha: -10 } } })], spell: meta({ index: "bane" }), effect: none, slotLevel: 1, rng: low });
    expect(failed.targets[0].buffs?.[0]).toMatchObject({ attackDie: -4, saveDie: -4 });
  });

  it("Guiding Bolt makes the next attack against the target advantaged, once", () => {
    const fx = parseSpellEffect(spell({ range: "120 feet", description: "Make a ranged spell attack against the target. On a hit, the target takes 4d6 radiant damage." }));
    const out = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: [cmb({ id: "t", ac: 5, hp: 100, maxHp: 100 })], spell: meta({ index: "guiding-bolt", name: "Guiding Bolt" }), effect: fx, slotLevel: 1, distanceTo: () => 30, rng: high });
    const marked = out.targets[0];
    expect(marked.buffs?.some((b) => b.advAgainst && b.oneShot)).toBe(true);
    const first = resolveAttackAction(cmb({ id: "a" }), marked, sword, {}, () => 0.5);
    expect(first.mode).toBe("advantage");
    expect(first.target.buffs?.some((b) => b.advAgainst) ?? false).toBe(false);
  });

  it("Aid raises maximum and current hit points", () => {
    const none = parseSpellEffect(spell({ description: "Nothing." }));
    const out = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: [cmb({ id: "t", hp: 10, maxHp: 20 })], spell: meta({ index: "aid", level: 2 }), effect: none, slotLevel: 3, rng: low });
    expect(out.targets[0]).toMatchObject({ hp: 20, maxHp: 30 });
  });

  it("summoned creatures vanish when the conjurer stops concentrating", () => {
    const wolf = cmb({ id: "w", kind: "monster", hp: 11, summonedBy: "m" });
    const other = cmb({ id: "o", kind: "monster", hp: 11 });
    const out = dropConcentration([cmb({ id: "m", concentrating: "Conjure Animals" }), wolf, other], "m");
    expect(out.all.find((c) => c.id === "w")).toMatchObject({ defeated: true, hp: 0 });
    expect(out.all.find((c) => c.id === "o")!.defeated).toBe(false);
    expect(out.lines.join(" ")).toContain("vanishes");
  });
});

describe("summoning rules", () => {
  const wolf = { index: "wolf", name: "Wolf", type: "Medium beast", challenge: "1/4 (50 XP)" };
  const tiger = { index: "tiger", name: "Tiger", type: "Large beast", challenge: "1 (200 XP)" };

  it("lets Conjure Animals call a limited number of beasts by challenge rating", () => {
    expect(checkSummon("conjure-animals", 3, wolf, 8)).toBeNull();
    expect(checkSummon("conjure-animals", 3, tiger, 2)).toBeNull();
    expect(checkSummon("conjure-animals", 3, tiger, 4)).not.toBeNull(); // too many of CR 1
    expect(checkSummon("conjure-animals", 3, wolf, 9)).not.toBeNull();
    expect(checkSummon("conjure-animals", 5, wolf, 16)).toBeNull(); // doubled at 5th level
    expect(checkSummon("conjure-animals", 3, { ...wolf, type: "Medium undead" }, 1)).not.toBeNull();
  });

  it("Animate Dead calls skeletons or zombies, two more per level", () => {
    const skel = { index: "skeleton", name: "Skeleton", type: "Medium undead", challenge: "1/4 (50 XP)" };
    expect(checkSummon("animate-dead", 3, skel, 1)).toBeNull();
    expect(checkSummon("animate-dead", 3, skel, 3)).not.toBeNull();
    expect(checkSummon("animate-dead", 4, skel, 3)).toBeNull();
    expect(checkSummon("animate-dead", 3, { ...skel, name: "Ghoul" }, 1)).not.toBeNull();
    expect(summonChoices("conjure-elemental", 7)).toEqual([{ count: 1, maxCr: 7 }]);
  });
});
