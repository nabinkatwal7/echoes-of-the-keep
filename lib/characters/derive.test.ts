import { describe, expect, it } from "vitest";
import { deriveStored } from "./derive";

describe("deriveStored", () => {
  it("derives a stored 1st-level cleric", () => {
    const d = deriveStored({
      classes: [{ classIndex: "cleric", level: 1 }],
      baseScores: { str: 13, dex: 8, con: 14, int: 10, wis: 15, cha: 12 },
      scoreBonuses: { con: 2, wis: 1 },
      skillProficiencies: ["insight", "religion", "history", "medicine"],
      skillExpertise: [],
      speed: 25,
    });
    expect(d.maxHp).toBe(11);
    expect(d.saves.wis.total).toBe(5); // +3 Wis, +2 proficiency (cleric save)
    expect(d.saves.str.total).toBe(1);
    expect(d.skills.insight.total).toBe(5);
    expect(d.armorClass.total).toBe(9); // 10 + Dex -1
    expect(d.speed).toBe(25);
  });
});
