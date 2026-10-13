import { describe, expect, it } from "vitest";
import { canLongRest, dawn, longRest, shortRest, useResource, type RestState } from "./index";

const base = (): RestState => ({
  hp: 10,
  maxHp: 30,
  tempHp: 0,
  hitDice: { 10: { total: 5, spent: 4 } },
  resources: [
    { key: "second-wind", max: 1, used: 1, recharge: "short" },
    { key: "rage", max: 3, used: 2, recharge: "long" },
    { key: "sunblade", max: 1, used: 1, recharge: "dawn" },
    { key: "one-time", max: 1, used: 1, recharge: "none" },
  ],
  spellSlotsUsed: [2, 1],
  pactSlotsUsed: 1,
  exhaustion: 2,
});

describe("short rest", () => {
  it("spends hit dice using average + Con modifier", () => {
    const { state, healed } = shortRest(base(), 14, [{ die: 10, count: 1 }]);
    expect(healed).toBe(8); // average d10 = 6, +2 Con
    expect(state.hp).toBe(18);
    expect(state.hitDice[10].spent).toBe(5);
  });
  it("uses rolled values and never heals below 0 per die", () => {
    expect(shortRest(base(), 6, [{ die: 10, count: 1, rolls: [1] }]).healed).toBe(0);
  });
  it("caps healing at max HP", () => {
    const s = { ...base(), hp: 29, hitDice: { 10: { total: 5, spent: 0 } } };
    expect(shortRest(s, 10, [{ die: 10, count: 3, rolls: [10, 10, 10] }]).state.hp).toBe(30);
  });
  it("refuses to spend dice you do not have", () => {
    expect(() => shortRest(base(), 10, [{ die: 10, count: 2 }])).toThrow(/Not enough/);
  });
  it("recharges short-rest resources and pact slots only", () => {
    const { state } = shortRest(base(), 10);
    expect(state.resources.map((r) => r.used)).toEqual([0, 2, 1, 1]);
    expect(state.pactSlotsUsed).toBe(0);
    expect(state.spellSlotsUsed).toEqual([2, 1]);
  });
});

describe("long rest", () => {
  it("restores HP, slots and resources and lowers exhaustion by 1", () => {
    const s = longRest(base());
    expect(s.hp).toBe(30);
    expect(s.spellSlotsUsed).toEqual([0, 0]);
    expect(s.exhaustion).toBe(1);
    expect(s.resources.map((r) => r.used)).toEqual([0, 0, 0, 1]);
  });
  it("recovers half of total hit dice, minimum 1", () => {
    expect(longRest(base()).hitDice[10].spent).toBe(2); // 5 total -> recover 2 of 4 spent
    const one = { ...base(), hitDice: { 8: { total: 1, spent: 1 } } };
    expect(longRest(one).hitDice[8].spent).toBe(0);
  });
  it("never drops exhaustion below 0", () => {
    expect(longRest({ ...base(), exhaustion: 0 }).exhaustion).toBe(0);
  });
  it("allows one long rest per 24 hours", () => {
    const last = new Date("2026-01-01T08:00:00Z");
    expect(canLongRest(new Date("2026-01-02T07:59:00Z"), last)).toBe(false);
    expect(canLongRest(new Date("2026-01-02T08:00:00Z"), last)).toBe(true);
    expect(canLongRest(new Date(), undefined)).toBe(true);
  });
});

describe("resources", () => {
  it("tracks uses and recharges at dawn", () => {
    expect(dawn(base()).resources[2].used).toBe(0);
    const s = useResource(base(), "rage");
    expect(s.resources[1].used).toBe(3);
    expect(() => useResource(s, "rage")).toThrow(/no uses left/);
    expect(() => useResource(base(), "nope")).toThrow(/Unknown/);
  });
});
