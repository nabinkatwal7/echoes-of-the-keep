import { describe, expect, it } from "vitest";
import { seededRng } from "../dice";
import {
  canGrappleOrShove,
  coverBonus,
  escapeGrapple,
  offHandModifier,
  rangeModifier,
  resolveAttack,
  resolveGrappleOrShove,
  rollDamage,
} from "./attack";

// rng returning a fixed d20 face: face = floor(r * 20) + 1
const d20 = (face: number) => () => (face - 1) / 20 + 0.001;

describe("attack rolls", () => {
  it("hits when the total meets AC", () => {
    expect(resolveAttack({ attackBonus: 5, targetAc: 15, rng: d20(10) }).hit).toBe(true);
    expect(resolveAttack({ attackBonus: 5, targetAc: 16, rng: d20(10) }).hit).toBe(false);
  });
  it("natural 20 always hits and crits, natural 1 always misses", () => {
    const crit = resolveAttack({ attackBonus: -5, targetAc: 30, rng: d20(20) });
    expect(crit).toMatchObject({ hit: true, critical: true });
    const fumble = resolveAttack({ attackBonus: 20, targetAc: 5, rng: d20(1) });
    expect(fumble).toMatchObject({ hit: false, fumble: true });
  });
  it("cover raises AC by 2 or 5; total cover blocks the attack", () => {
    expect(coverBonus("half")).toBe(2);
    expect(coverBonus("three-quarters")).toBe(5);
    expect(resolveAttack({ attackBonus: 5, targetAc: 12, cover: "half", rng: d20(5) }).effectiveAc).toBe(14);
    expect(resolveAttack({ attackBonus: 5, targetAc: 12, cover: "half", rng: d20(8) }).hit).toBe(false); // 13 vs 14
    expect(() => resolveAttack({ attackBonus: 5, targetAc: 12, cover: "total" })).toThrow(/total cover/);
  });
  it("auto-crit applies to any hit (paralyzed target within 5 ft)", () => {
    expect(resolveAttack({ attackBonus: 5, targetAc: 10, autoCrit: true, rng: d20(10) }).critical).toBe(true);
    expect(resolveAttack({ attackBonus: 5, targetAc: 30, autoCrit: true, rng: d20(2) }).critical).toBe(false);
  });
  it("Improved Critical widens the crit range to 19", () => {
    expect(resolveAttack({ attackBonus: 0, targetAc: 10, critRange: 19, rng: d20(19) }).critical).toBe(true);
  });
  it("uses advantage and disadvantage", () => {
    const adv = resolveAttack({ attackBonus: 0, targetAc: 10, mode: "advantage", rng: seededRng(3) });
    expect(adv.roll.dice).toHaveLength(2);
  });
});

describe("damage", () => {
  it("adds the modifier once", () => {
    const r = rollDamage("1d8", 3, { rng: seededRng(1) });
    expect(r.total).toBeGreaterThanOrEqual(4);
    expect(r.total).toBeLessThanOrEqual(11);
    expect(r.dice).toBe("1d8+3");
  });
  it("critical hits double the dice but not the modifier", () => {
    for (let seed = 0; seed < 100; seed++) {
      const r = rollDamage("1d8", 3, { critical: true, rng: seededRng(seed) });
      expect(r.dice).toBe("2d8+3");
      expect(r.total).toBeGreaterThanOrEqual(5);
      expect(r.total).toBeLessThanOrEqual(19);
    }
  });
  it("doubles extra dice such as Sneak Attack on a crit", () => {
    const r = rollDamage("1d6", 4, { critical: true, extraDice: ["3d6"], rng: seededRng(2) });
    expect(r.dice).toBe("2d6+6d6+4");
    expect(r.total).toBeGreaterThanOrEqual(8 + 4);
    expect(r.total).toBeLessThanOrEqual(48 + 4);
  });
  it("never goes below zero", () => {
    expect(rollDamage("1d4", -10, { rng: seededRng(1) }).total).toBe(0);
  });
  it("off-hand damage skips a positive modifier unless the fighting style applies", () => {
    expect(offHandModifier(3)).toBe(0);
    expect(offHandModifier(3, true)).toBe(3);
    expect(offHandModifier(-1)).toBe(-1);
  });
});

describe("range", () => {
  const bow = { normal: 80, long: 320 };
  it("normal range has no penalty", () => expect(rangeModifier(60, bow)).toEqual({ disadvantage: false, outOfRange: false }));
  it("long range gives disadvantage", () => expect(rangeModifier(200, bow).disadvantage).toBe(true));
  it("beyond long range is impossible", () => expect(rangeModifier(400, bow).outOfRange).toBe(true));
  it("a hostile within 5 feet gives disadvantage", () => expect(rangeModifier(30, bow, true).disadvantage).toBe(true));
});

describe("grapple and shove", () => {
  it("targets can be at most one size larger", () => {
    expect(canGrappleOrShove("medium", "large")).toBe(true);
    expect(canGrappleOrShove("medium", "huge")).toBe(false);
    expect(canGrappleOrShove("large", "small")).toBe(true);
  });
  it("the defender uses the better of Athletics and Acrobatics", () => {
    // identical dice for both sides: the higher modifier wins, a tie goes to the defender
    const rng = () => 0.5;
    expect(resolveGrappleOrShove({ athletics: 5 }, { athletics: 1, acrobatics: 6 }, rng).attackerWins).toBe(false);
    expect(resolveGrappleOrShove({ athletics: 7 }, { athletics: 1, acrobatics: 6 }, rng).attackerWins).toBe(true);
    expect(resolveGrappleOrShove({ athletics: 6 }, { athletics: 1, acrobatics: 6 }, rng).attackerWins).toBe(false);
  });
  it("escaping a grapple succeeds on a tie or better", () => {
    const rng = () => 0.5;
    expect(escapeGrapple({ athletics: 2, acrobatics: 4 }, { athletics: 4 }, rng)).toBe(true);
    expect(escapeGrapple({ athletics: 2, acrobatics: 3 }, { athletics: 4 }, rng)).toBe(false);
  });
});
