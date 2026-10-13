import { describe, expect, it } from "vitest";
import {
  beginConcentration,
  cantripDiceMultiplier,
  canCastAsRitual,
  castingTimeKind,
  checkCasting,
  checkConcentration,
  concentrationDc,
  lowestAvailableSlot,
  preparedSpellCount,
  slotCreationCost,
  slotsAvailable,
  spellAttackBonus,
  spellSaveDc,
  spendSlot,
  type SpellInfo,
} from "./index";

const spell = (over: Partial<SpellInfo> = {}): SpellInfo => ({
  name: "Test",
  level: 1,
  castingTime: "1 action",
  components: "V, S",
  ...over,
});

describe("spellcasting numbers", () => {
  it("save DC = 8 + proficiency + ability modifier", () => {
    expect(spellSaveDc(3, 16)).toBe(14);
    expect(spellAttackBonus(3, 16)).toBe(6);
  });
  it("prepared spell counts", () => {
    expect(preparedSpellCount("wizard", 5, 16)).toBe(8);
    expect(preparedSpellCount("cleric", 1, 8)).toBe(1); // minimum of one
    expect(preparedSpellCount("paladin", 5, 14)).toBe(4); // Cha mod +2 plus half level 2
    expect(() => preparedSpellCount("sorcerer", 5, 16)).toThrow();
  });
  it("cantrips scale at levels 5, 11 and 17", () => {
    expect([1, 4, 5, 10, 11, 16, 17, 20].map(cantripDiceMultiplier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe("spell slots", () => {
  const slots = { total: [4, 3, 2], used: [1, 3, 0] };
  it("counts what is left", () => {
    expect(slotsAvailable(slots, 1)).toBe(3);
    expect(slotsAvailable(slots, 2)).toBe(0);
    expect(slotsAvailable(slots, 9)).toBe(0);
  });
  it("finds the lowest usable slot for upcasting", () => {
    expect(lowestAvailableSlot(slots, 2)).toBe(3);
    expect(lowestAvailableSlot(slots, 1)).toBe(1);
    expect(lowestAvailableSlot({ total: [1], used: [1] }, 1)).toBeNull();
  });
  it("spends one slot and refuses when empty", () => {
    expect(spendSlot(slots, 1).used).toEqual([2, 3, 0]);
    expect(() => spendSlot(slots, 2)).toThrow(/No level 2/);
  });
});

describe("casting rules", () => {
  it("classifies casting time", () => {
    expect(castingTimeKind("1 action")).toBe("action");
    expect(castingTimeKind("1 bonus action")).toBe("bonus");
    expect(castingTimeKind("1 reaction, which you take when you are hit")).toBe("reaction");
    expect(castingTimeKind("10 minutes")).toBe("long");
  });
  it("long casting times fail in combat", () => {
    expect(checkCasting(spell({ castingTime: "1 minute" }), { inCombat: true }).ok).toBe(false);
    expect(checkCasting(spell({ castingTime: "1 minute" })).ok).toBe(true);
  });
  it("bonus action rule: only a cantrip action after a bonus action spell", () => {
    expect(checkCasting(spell({ level: 1 }), { castBonusActionSpell: true }).ok).toBe(false);
    expect(checkCasting(spell({ level: 0 }), { castBonusActionSpell: true }).ok).toBe(true);
    expect(checkCasting(spell({ castingTime: "1 bonus action" }), { castLeveledSpell: true }).ok).toBe(false);
    expect(checkCasting(spell({ castingTime: "1 bonus action" }), {}).ok).toBe(true);
  });
  it("components: verbal, somatic and material", () => {
    expect(checkCasting(spell(), { silenced: true }).ok).toBe(false);
    expect(checkCasting(spell(), { freeHand: false }).ok).toBe(false);
    expect(checkCasting(spell({ components: "V" }), { freeHand: false }).ok).toBe(true);
    expect(checkCasting(spell({ components: "V, S, M (a pinch of salt)" }), { hasFocusOrPouch: false }).ok).toBe(false);
    expect(checkCasting(spell({ components: "V, S, M (a diamond worth at least 300 gp)" }), { hasFocusOrPouch: true, hasCostlyMaterial: false }).ok).toBe(false);
    expect(checkCasting(spell({ components: "V, S, M (a diamond worth at least 300 gp)" }), { hasCostlyMaterial: true }).ok).toBe(true);
  });
  it("rituals need a ritual-casting class and no combat", () => {
    expect(canCastAsRitual(spell({ ritual: true }), true)).toBe(true);
    expect(canCastAsRitual(spell({ ritual: true }), false)).toBe(false);
    expect(canCastAsRitual(spell({ ritual: true }), true, true)).toBe(false);
    expect(canCastAsRitual(spell(), true)).toBe(false);
  });
});

describe("concentration", () => {
  it("DC is 10 or half the damage, whichever is higher", () => {
    expect(concentrationDc(5)).toBe(10);
    expect(concentrationDc(20)).toBe(10);
    expect(concentrationDc(31)).toBe(15);
  });
  it("starting a new concentration spell ends the old one", () => {
    expect(beginConcentration({ spell: "Bless" }, "Haste")).toEqual({ state: { spell: "Haste" }, ended: "Bless" });
    expect(beginConcentration(null, "Haste").ended).toBeNull();
  });
  it("rolls a Constitution save against the DC", () => {
    const pass = checkConcentration(10, 5, { rng: () => 0.5 }); // 11 + 5 = 16
    expect(pass).toMatchObject({ maintained: true, dc: 10, roll: 16 });
    expect(checkConcentration(40, 0, { rng: () => 0.5 }).maintained).toBe(false); // 11 vs DC 20
  });
});

describe("sorcery points", () => {
  it("slot creation costs", () => {
    expect([1, 2, 3, 4, 5].map(slotCreationCost)).toEqual([2, 3, 5, 6, 7]);
    expect(() => slotCreationCost(6)).toThrow(RangeError);
  });
});
