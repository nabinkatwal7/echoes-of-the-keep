import { describe, expect, it } from "vitest";
import { importers } from "../../content/build/importers";
import { addCondition, conditionSet, isCondition, removeCondition, tickConditions } from "../conditions/timers";
import { mountMoveCost, underwaterAttack } from "./environment";
import { distanceFeet, moveCost, opportunityAttackers, pathCost, straightPath, withinFiveFeet } from "./grid";
import { healthWord, parseDefenses, parseMonsterActions } from "./monsters";

const creature = (index: string) => (importers.find((i) => i.name === "creatures")!.load() as { index: string; text: string }[]).find((c) => c.index === index)!;

describe("monster actions", () => {
  it("parses a melee attack with dice", () => {
    const a = parseMonsterActions(creature("wolf").text);
    expect(a.attacks[0]).toMatchObject({ name: "Bite", melee: true, toHit: 4, reach: 5, damage: "2d4+2", damageType: "piercing", flat: false });
  });
  it("parses flat damage", () => {
    const a = parseMonsterActions(creature("cat").text);
    expect(a.attacks[0]).toMatchObject({ name: "Claws", toHit: 0, damage: "1", damageType: "slashing", flat: true });
  });
  it("parses ranged attacks and multiattack", () => {
    const text = "Multiattack. The ogre makes two attacks with its greatclub. Greatclub. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage. Javelin. Ranged Weapon Attack: +6 to hit, range 30/120 ft., one target. Hit: 11 (2d6 + 4) piercing damage.";
    const a = parseMonsterActions(text);
    expect(a.attacks.map((x) => [x.name, x.melee])).toEqual([["Greatclub", true], ["Javelin", false]]);
    expect(a.attacks[1].range).toEqual({ normal: 30, long: 120 });
    expect(a.multiattack?.count).toBe(2);
  });
  it("every Appendix D creature with an attack parses at least one", () => {
    const all = importers.find((i) => i.name === "creatures")!.load() as { index: string; text: string }[];
    const withAttacks = all.filter((c) => parseMonsterActions(c.text).attacks.length > 0);
    expect(withAttacks.length).toBeGreaterThanOrEqual(22);
  });
  it("reads defenses and health words", () => {
    expect(parseDefenses("fire, cold").resistances).toEqual(["cold", "fire"]);
    expect([[10, 10], [9, 10], [5, 10], [2, 10], [0, 10]].map(([h, m]) => healthWord(h, m))).toEqual(["Healthy", "Wounded", "Bloodied", "Critical", "Defeated"]);
  });
});

describe("grid", () => {
  it("measures in 5 ft squares with free diagonals", () => {
    expect(distanceFeet({ x: 0, y: 0 }, { x: 3, y: 1 })).toBe(15);
    expect(withinFiveFeet({ x: 2, y: 2 }, { x: 3, y: 3 })).toBe(true);
    expect(withinFiveFeet({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(false);
  });
  it("charges movement along a path, with difficult terrain and crawling", () => {
    const opts = { width: 10, height: 10 };
    expect(moveCost({ x: 0, y: 0 }, { x: 4, y: 0 }, opts)).toEqual({ ok: true, feet: 20 });
    expect(pathCost(straightPath({ x: 0, y: 0 }, { x: 2, y: 0 }), { ...opts, difficult: new Set(["1,0"]) })).toEqual({ ok: true, feet: 15 });
    expect(moveCost({ x: 0, y: 0 }, { x: 2, y: 0 }, { ...opts, crawling: true })).toEqual({ ok: true, feet: 20 });
  });
  it("rejects blocked squares and moves off the map", () => {
    expect(moveCost({ x: 0, y: 0 }, { x: 2, y: 0 }, { width: 5, height: 5, blocked: new Set(["1,0"]) }).ok).toBe(false);
    expect(moveCost({ x: 0, y: 0 }, { x: 9, y: 0 }, { width: 5, height: 5 }).ok).toBe(false);
  });
  it("finds who gets an opportunity attack for leaving reach", () => {
    const enemies = [{ id: "goblin", at: { x: 1, y: 0 }, reach: 5 }, { id: "ogre", at: { x: 0, y: 1 }, reach: 10 }, { id: "far", at: { x: 8, y: 8 }, reach: 5 }];
    // moving from (0,0) to (4,0): leaves the goblin's reach and the ogre's 10 ft reach, never near "far"
    expect(opportunityAttackers({ x: 0, y: 0 }, { x: 4, y: 0 }, enemies)).toEqual(["goblin", "ogre"]);
    // staying inside reach provokes nothing
    expect(opportunityAttackers({ x: 0, y: 0 }, { x: 1, y: 1 }, enemies)).toEqual([]);
  });
});

describe("conditions with durations", () => {
  it("adds, refreshes and removes", () => {
    let list = addCondition([], { condition: "prone" });
    list = addCondition(list, { condition: "poisoned", rounds: 3, source: "spider" });
    list = addCondition(list, { condition: "poisoned", rounds: 5, source: "spider" });
    expect(list.find((c) => c.condition === "poisoned")?.rounds).toBe(5);
    expect(list).toHaveLength(2);
    expect(removeCondition(list, "prone").map((c) => c.condition)).toEqual(["poisoned"]);
    expect([...conditionSet(list)].sort()).toEqual(["poisoned", "prone"]);
    expect(isCondition("blinded")).toBe(true);
    expect(isCondition("sleepy")).toBe(false);
  });
  it("counts down at the end of the creature's turn and expires", () => {
    const list = [{ condition: "stunned" as const, rounds: 2 }, { condition: "prone" as const }];
    const t1 = tickConditions(list, "end");
    expect(t1.remaining[0].rounds).toBe(1);
    const t2 = tickConditions(t1.remaining, "end");
    expect(t2.expired.map((c) => c.condition)).toEqual(["stunned"]);
    expect(t2.remaining.map((c) => c.condition)).toEqual(["prone"]);
  });
  it("start-of-turn timers only tick at the start", () => {
    const list = [{ condition: "frightened" as const, rounds: 1, expires: "start" as const }];
    expect(tickConditions(list, "end").remaining).toHaveLength(1);
    expect(tickConditions(list, "start").expired).toHaveLength(1);
  });
});

describe("underwater and mounted", () => {
  it("melee underwater needs a piercing weapon", () => {
    expect(underwaterAttack({ melee: true, weaponName: "Spear" }).disadvantage).toBe(false);
    expect(underwaterAttack({ melee: true, weaponName: "Longsword" }).disadvantage).toBe(true);
  });
  it("ranged underwater misses beyond normal range", () => {
    expect(underwaterAttack({ melee: false, weaponName: "Longbow", beyondNormalRange: true }).autoMiss).toBe(true);
    expect(underwaterAttack({ melee: false, weaponName: "Crossbow, light" }).disadvantage).toBe(false);
    expect(underwaterAttack({ melee: false, weaponName: "Longbow" }).disadvantage).toBe(true);
  });
  it("mounting costs half speed", () => {
    expect(mountMoveCost(30)).toBe(15);
  });
});

describe("more stat block wording", () => {
  const text = (s: string) => parseMonsterActions(s);
  it("reads Melee or Ranged attacks as two ways to attack", () => {
    const a = text("Dagger. Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d4 + 2) piercing damage.").attacks;
    expect(a.map((x) => [x.name, x.melee, x.reach ?? x.range?.normal])).toEqual([["Dagger", true, 5], ["Dagger (thrown)", false, 20]]);
  });
  it("reads spell attacks and a bonus with a note in brackets", () => {
    expect(text("Touch. Melee Spell Attack: +4 to hit, reach 5 ft., one creature. Hit: 10 (3d6) necrotic damage. The target must succeed on a save.").attacks[0]).toMatchObject({ name: "Touch", toHit: 4, damage: "3d6", damageType: "necrotic" });
    expect(text("Club. Melee Weapon Attack: +2 to hit (+6 to hit with shillelagh), reach 5 ft., one target. Hit: 2 (1d4) bludgeoning damage.").attacks[0].toHit).toBe(2);
  });
  it("skips attacks that only grapple or restrain", () => {
    expect(text("Smother. Melee Weapon Attack: +5 to hit, reach 5 ft., one Medium or smaller creature. Hit: The creature is grappled (escape DC 13).").attacks).toEqual([]);
  });
});
