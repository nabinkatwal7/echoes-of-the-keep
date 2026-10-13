import { describe, expect, it } from "vitest";
import { longRest, shortRest, spendResource } from "@/engine/rest";
import { fromRestState, lastLongRest, resourceViews, slotViews, toRestState, type StoredPlay } from "./play";

const wizardFighter = (over: Partial<StoredPlay> = {}): StoredPlay => ({
  classes: [{ classIndex: "fighter", level: 2 }, { classIndex: "wizard", level: 3 }],
  baseScores: { str: 14, dex: 12, con: 14, int: 16, wis: 10, cha: 8 },
  scoreBonuses: {},
  skillProficiencies: [],
  skillExpertise: [],
  speed: 30,
  currentHp: 10,
  tempHp: 0,
  hitDiceSpent: { 10: { total: 2, spent: 2 }, 6: { total: 3, spent: 1 } },
  resources: { "second-wind": 1, "action-surge": 1, "arcane-recovery": 1 },
  spellSlotsUsed: [3, 1],
  exhaustion: 1,
  ...over,
});

describe("views", () => {
  it("lists class resources with uses spent", () => {
    const views = resourceViews(wizardFighter());
    expect(views.map((v) => [v.key, v.max, v.used])).toEqual([
      ["second-wind", 1, 1],
      ["action-surge", 1, 1],
      ["arcane-recovery", 1, 1],
    ]);
  });
  it("shows slots from the multiclass table with expended ones", () => {
    // wizard 3 only counts: caster level 3 -> 4/2 slots
    expect(slotViews(wizardFighter()).slots).toEqual([
      { level: 1, total: 4, used: 3 },
      { level: 2, total: 2, used: 1 },
    ]);
  });
  it("tracks warlock pact slots separately", () => {
    const warlock = wizardFighter({ classes: [{ classIndex: "warlock", level: 5 }], resources: { "pact-slots": 1 }, spellSlotsUsed: [] });
    expect(slotViews(warlock)).toMatchObject({ slots: [], pact: { slots: 2, slotLevel: 3, used: 1 } });
  });
});

describe("rests round-trip through the engine", () => {
  it("a long rest restores everything and drops exhaustion", () => {
    const c = wizardFighter();
    const after = fromRestState(longRest(toRestState(c)), c);
    expect(after).toMatchObject({ spellSlotsUsed: [0, 0], exhaustion: 0 });
    expect(after.resources).toMatchObject({ "second-wind": 0, "action-surge": 0, "arcane-recovery": 0 });
    expect(after.currentHp).toBeGreaterThan(10);
  });
  it("a short rest refreshes short-rest features only and spends hit dice", () => {
    const c = wizardFighter();
    const { state } = shortRest(toRestState(c), 14, [{ die: 6, count: 1, rolls: [4] }]);
    const after = fromRestState(state, c);
    expect(after.resources).toMatchObject({ "second-wind": 0, "action-surge": 0, "arcane-recovery": 1 });
    expect(after.spellSlotsUsed).toEqual([3, 1]);
    expect(after.currentHp).toBe(10 + 4 + 2); // d6 roll 4 + Con +2
  });
  it("spending a use persists", () => {
    const c = wizardFighter({ resources: {} });
    const after = fromRestState(spendResource(toRestState(c), "second-wind"), c);
    expect(after.resources).toMatchObject({ "second-wind": 1 });
  });
  it("reads the last long rest time", () => {
    expect(lastLongRest(wizardFighter())).toBeUndefined();
    expect(lastLongRest(wizardFighter({ resources: { _lastLongRest: "2026-01-02T08:00:00.000Z" } }))?.toISOString()).toBe("2026-01-02T08:00:00.000Z");
  });
});
