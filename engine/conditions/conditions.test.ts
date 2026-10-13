import { describe, expect, it } from "vitest";
import {
  CONDITIONS,
  abilityCheckDisadvantage,
  addExhaustion,
  attackModifiers,
  autoFailsCheck,
  autoFailsSave,
  cannotAct,
  cannotMove,
  effectiveSpeed,
  exhaustionKills,
  maxHpFactor,
  resistsAllDamage,
  saveDisadvantage,
  type Condition,
} from "./index";

const set = (...c: Condition[]) => new Set<Condition>(c);
const none = set();

describe("condition list", () => {
  it("has 14 conditions plus exhaustion tracked separately (15 in the PHB)", () => {
    expect(CONDITIONS).toHaveLength(14);
  });
});

describe("actions and movement", () => {
  it.each(["incapacitated", "paralyzed", "petrified", "stunned", "unconscious"] as const)("%s cannot act", (c) => {
    expect(cannotAct(set(c))).toBe(true);
  });
  it("others can act", () => {
    expect(cannotAct(set("poisoned", "prone", "grappled"))).toBe(false);
  });
  it("grappled and restrained have speed 0", () => {
    expect(effectiveSpeed(30, set("grappled"))).toBe(0);
    expect(effectiveSpeed(30, set("restrained"))).toBe(0);
    expect(cannotMove(set("prone"))).toBe(false);
    expect(effectiveSpeed(30, none)).toBe(30);
  });
});

describe("saves and checks", () => {
  it("paralyzed, stunned, unconscious and petrified auto-fail Str and Dex saves only", () => {
    expect(autoFailsSave(set("paralyzed"), "str")).toBe(true);
    expect(autoFailsSave(set("stunned"), "dex")).toBe(true);
    expect(autoFailsSave(set("paralyzed"), "wis")).toBe(false);
    expect(autoFailsSave(set("prone"), "dex")).toBe(false);
  });
  it("blinded and deafened auto-fail checks that need the sense", () => {
    expect(autoFailsCheck(set("blinded"), "sight")).toBe(true);
    expect(autoFailsCheck(set("blinded"), "hearing")).toBe(false);
    expect(autoFailsCheck(set("deafened"), "hearing")).toBe(true);
  });
  it("poisoned and frightened (source in sight) give disadvantage on checks", () => {
    expect(abilityCheckDisadvantage(set("poisoned"))).toBe(true);
    expect(abilityCheckDisadvantage(set("frightened"))).toBe(true);
    expect(abilityCheckDisadvantage(set("frightened"), 0, false)).toBe(false);
    expect(abilityCheckDisadvantage(none)).toBe(false);
  });
});

describe("attack rolls", () => {
  const ctx = (attacker: Condition[], target: Condition[], withinFiveFeet = true) => ({
    attacker: set(...attacker),
    target: set(...target),
    withinFiveFeet,
  });

  it("attacker conditions impose disadvantage", () => {
    for (const c of ["blinded", "poisoned", "prone", "restrained", "frightened"] as const) {
      expect(attackModifiers(ctx([c], [])).disadvantage).toBe(1);
    }
  });
  it("frightened only matters while the source is in sight", () => {
    expect(attackModifiers({ ...ctx(["frightened"], []), fearSourceInSight: false }).disadvantage).toBe(0);
  });
  it("attacking a helpless target gives advantage", () => {
    for (const c of ["blinded", "restrained", "stunned", "paralyzed", "petrified", "unconscious"] as const) {
      expect(attackModifiers(ctx([], [c])).advantage).toBe(1);
    }
  });
  it("prone targets: advantage up close, disadvantage at range", () => {
    expect(attackModifiers(ctx([], ["prone"], true))).toMatchObject({ advantage: 1, disadvantage: 0 });
    expect(attackModifiers(ctx([], ["prone"], false))).toMatchObject({ advantage: 0, disadvantage: 1 });
  });
  it("invisible attackers gain advantage; unseen targets impose disadvantage", () => {
    expect(attackModifiers(ctx(["invisible"], [])).advantage).toBe(1);
    expect(attackModifiers(ctx([], ["invisible"])).disadvantage).toBe(1);
    expect(attackModifiers({ ...ctx([], ["invisible"]), attackerCanSeeTarget: true }).disadvantage).toBe(0);
  });
  it("hits within 5 feet on paralyzed or unconscious targets are critical", () => {
    expect(attackModifiers(ctx([], ["paralyzed"])).autoCrit).toBe(true);
    expect(attackModifiers(ctx([], ["unconscious"], false)).autoCrit).toBe(false);
    expect(attackModifiers(ctx([], ["stunned"])).autoCrit).toBe(false);
  });
  it("sources are counted so the roller can cancel them", () => {
    const m = attackModifiers(ctx(["invisible", "poisoned"], ["blinded"]));
    expect(m).toMatchObject({ advantage: 2, disadvantage: 1 });
  });
});

describe("exhaustion (PHB p.291)", () => {
  it("level 1 gives disadvantage on checks", () => {
    expect(abilityCheckDisadvantage(none, 1)).toBe(true);
  });
  it("level 2 halves speed, level 5 sets it to 0", () => {
    expect(effectiveSpeed(30, none, 2)).toBe(15);
    expect(effectiveSpeed(35, none, 2)).toBe(17);
    expect(effectiveSpeed(30, none, 5)).toBe(0);
  });
  it("level 3 gives disadvantage on attacks and saves", () => {
    expect(attackModifiers({ attacker: none, target: none, withinFiveFeet: true, attackerExhaustion: 3 }).disadvantage).toBe(1);
    expect(saveDisadvantage(2)).toBe(false);
    expect(saveDisadvantage(3)).toBe(true);
  });
  it("level 4 halves max HP and level 6 is death", () => {
    expect(maxHpFactor(3)).toBe(1);
    expect(maxHpFactor(4)).toBe(0.5);
    expect(exhaustionKills(6)).toBe(true);
    expect(addExhaustion(5, 3)).toBe(6);
  });
  it("petrified creatures resist all damage", () => {
    expect(resistsAllDamage(set("petrified"))).toBe(true);
  });
});
