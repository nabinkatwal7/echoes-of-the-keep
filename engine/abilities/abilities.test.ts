import { describe, expect, it } from "vitest";
import {
  ABILITIES,
  SKILLS,
  abilityModifier,
  contestWinner,
  groupCheckSucceeds,
  passiveScore,
  proficiencyBonus,
  proficiencyContribution,
  savingThrowBonus,
  skillBonus,
} from "./index";

const scores = { str: 8, dex: 16, con: 14, int: 10, wis: 12, cha: 18 };

describe("abilityModifier", () => {
  it.each([
    [1, -5],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [20, 5],
    [30, 10],
  ])("score %i gives %i", (score, mod) => expect(abilityModifier(score)).toBe(mod));
});

describe("proficiencyBonus", () => {
  it.each([
    [1, 2], [4, 2], [5, 3], [8, 3], [9, 4], [12, 4], [13, 5], [16, 5], [17, 6], [20, 6],
  ])("level %i gives +%i", (level, bonus) => expect(proficiencyBonus(level)).toBe(bonus));
  it("rejects levels outside 1-20", () => {
    expect(() => proficiencyBonus(0)).toThrow(RangeError);
    expect(() => proficiencyBonus(21)).toThrow(RangeError);
  });
});

describe("skills and saves", () => {
  it("covers 18 skills with the right abilities", () => {
    expect(Object.keys(SKILLS)).toHaveLength(18);
    expect(SKILLS.stealth).toBe("dex");
    expect(SKILLS["animal-handling"]).toBe("wis");
    expect(SKILLS.athletics).toBe("str");
  });
  it("adds proficiency once, doubles for expertise, floors for half", () => {
    expect(skillBonus("stealth", scores, 3)).toBe(3);
    expect(skillBonus("stealth", scores, 3, "proficient")).toBe(6);
    expect(skillBonus("stealth", scores, 3, "expertise")).toBe(9);
    expect(proficiencyContribution(3, "half")).toBe(1);
    expect(skillBonus("athletics", scores, 3, "half")).toBe(0);
  });
  it("applies proficiency to saving throws only when proficient", () => {
    expect(savingThrowBonus("cha", scores, 2, true)).toBe(6);
    expect(savingThrowBonus("cha", scores, 2, false)).toBe(4);
  });
  it("has six abilities", () => expect(ABILITIES).toHaveLength(6));
});

describe("passive, group and contest rules", () => {
  it("computes passive scores", () => {
    expect(passiveScore(3)).toBe(13);
    expect(passiveScore(3, "advantage")).toBe(18);
    expect(passiveScore(3, "disadvantage")).toBe(8);
  });
  it("group checks need at least half to succeed", () => {
    expect(groupCheckSucceeds(2, 4)).toBe(true);
    expect(groupCheckSucceeds(1, 4)).toBe(false);
    expect(groupCheckSucceeds(0, 0)).toBe(false);
  });
  it("ties leave a contest unchanged", () => {
    expect(contestWinner(12, 9)).toBe("a");
    expect(contestWinner(9, 12)).toBe("b");
    expect(contestWinner(10, 10)).toBe("tie");
  });
});
