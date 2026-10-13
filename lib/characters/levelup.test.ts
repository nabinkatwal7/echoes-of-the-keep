import { describe, expect, it } from "vitest";
import { applyLevelUp, canLevelUp, improvementDue, type LevelUpStored } from "./levelup";

const fighter = (over: Partial<LevelUpStored> = {}): LevelUpStored => ({
  classes: [{ classIndex: "fighter", level: 1 }],
  baseScores: { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 8 },
  scoreBonuses: {},
  skillProficiencies: [],
  skillExpertise: [],
  speed: 30,
  xp: 300,
  currentHp: 12,
  hitDiceSpent: { 10: { total: 1, spent: 0 } },
  feats: [],
  ...over,
});

describe("canLevelUp", () => {
  it("needs enough XP unless leveling by milestone", () => {
    expect(canLevelUp({ xp: 299, classes: [{ classIndex: "fighter", level: 1 }] })).toBe(false);
    expect(canLevelUp({ xp: 300, classes: [{ classIndex: "fighter", level: 1 }] })).toBe(true);
    expect(canLevelUp({ xp: 0, classes: [{ classIndex: "fighter", level: 1 }] }, true)).toBe(true);
    expect(canLevelUp({ xp: 999999, classes: [{ classIndex: "fighter", level: 20 }] })).toBe(false);
  });
});

describe("applyLevelUp", () => {
  it("adds a level with average HP and a hit die", () => {
    const r = applyLevelUp(fighter(), { classIndex: "fighter" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.newLevel).toBe(2);
    expect(r.hpGained).toBe(8); // d10 average 6 + Con +2
    expect(r.update.currentHp).toBe(20);
    expect(r.update.hitDiceSpent[10]).toEqual({ total: 2, spent: 0 });
  });

  it("refuses without enough XP", () => {
    const r = applyLevelUp(fighter({ xp: 0 }), { classIndex: "fighter" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/experience/);
  });

  it("requires an ASI or feat at level 4 and applies it", () => {
    const l3 = fighter({ classes: [{ classIndex: "fighter", level: 3 }], xp: 2700 });
    expect(improvementDue(l3.classes as never, "fighter")).toBe(true);
    expect(applyLevelUp(l3, { classIndex: "fighter" }).ok).toBe(false);

    const asi = applyLevelUp(l3, { classIndex: "fighter", improvement: { kind: "asi", abilities: ["str"] } });
    expect(asi.ok && asi.update.scoreBonuses).toEqual({ str: 2 });
    const split = applyLevelUp(l3, { classIndex: "fighter", improvement: { kind: "asi", abilities: ["str", "con"] } });
    expect(split.ok && split.update.scoreBonuses).toEqual({ str: 1, con: 1 });
    const feat = applyLevelUp(l3, { classIndex: "fighter", improvement: { kind: "feat", feat: "tough" } });
    expect(feat.ok && feat.update.feats).toEqual(["tough"]);
  });

  it("Con increases retroactively raise HP", () => {
    const l3 = fighter({ classes: [{ classIndex: "fighter", level: 3 }], xp: 2700, baseScores: { str: 15, dex: 13, con: 15, int: 10, wis: 12, cha: 8 } });
    const r = applyLevelUp(l3, { classIndex: "fighter", improvement: { kind: "asi", abilities: ["con"] } });
    // Con 15 -> 17 adds +1 per level for the 3 existing levels, and the new level is d10 average 6 + Con +3
    expect(r.ok && r.hpGained).toBe(3 + 6 + 3);
  });

  it("rejects an improvement when none is due", () => {
    const r = applyLevelUp(fighter(), { classIndex: "fighter", improvement: { kind: "feat", feat: "tough" } });
    expect(r.ok).toBe(false);
  });

  it("rejects duplicate feats and scores above 20", () => {
    const l3 = fighter({ classes: [{ classIndex: "fighter", level: 3 }], xp: 2700, feats: ["tough"] });
    expect(applyLevelUp(l3, { classIndex: "fighter", improvement: { kind: "feat", feat: "tough" } }).ok).toBe(false);
    const capped = fighter({ classes: [{ classIndex: "fighter", level: 3 }], xp: 2700, baseScores: { str: 19, dex: 13, con: 14, int: 10, wis: 12, cha: 8 } });
    expect(applyLevelUp(capped, { classIndex: "fighter", improvement: { kind: "asi", abilities: ["str"] } }).ok).toBe(false);
  });

  it("multiclassing needs prerequisites and adds a new class at level 1", () => {
    const ok = applyLevelUp(fighter({ baseScores: { str: 15, dex: 13, con: 14, int: 13, wis: 12, cha: 8 } }), { classIndex: "wizard" });
    expect(ok.ok && ok.update.classes).toEqual([{ classIndex: "fighter", level: 1 }, { classIndex: "wizard", level: 1 }]);
    expect(ok.ok && ok.update.hitDiceSpent).toMatchObject({ 10: { total: 1 }, 6: { total: 1 } });
    expect(applyLevelUp(fighter(), { classIndex: "wizard" }).ok).toBe(false);
  });
});
