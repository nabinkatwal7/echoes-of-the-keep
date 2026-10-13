import { describe, expect, it } from "vitest";
import { HIT_DICE } from "../progression";
import { CLASS_RULES, parseSkillList, skillOptions } from "./rules";

describe("class rules", () => {
  it("covers all 12 classes with hit dice matching the progression table", () => {
    expect(Object.keys(CLASS_RULES)).toHaveLength(12);
    for (const [name, r] of Object.entries(CLASS_RULES)) expect(r.hitDie).toBe(HIT_DICE[name]);
  });
  it("skill choice counts per class", () => {
    expect(CLASS_RULES.rogue.skillChoices.count).toBe(4);
    expect(CLASS_RULES.bard.skillChoices.count).toBe(3);
    expect(CLASS_RULES.ranger.skillChoices.count).toBe(3);
    expect(CLASS_RULES.wizard.skillChoices.count).toBe(2);
  });
  it("bards can choose from any of the 18 skills", () => {
    expect(skillOptions("bard")).toHaveLength(18);
    expect(skillOptions("wizard")).toHaveLength(6);
  });
  it("each class has two saving throw proficiencies and every listed skill exists", () => {
    for (const r of Object.values(CLASS_RULES)) {
      expect(new Set(r.saves).size).toBe(2);
      for (const s of r.skillChoices.from === "any" ? [] : r.skillChoices.from) expect(skillOptions("bard")).toContain(s);
    }
  });
  it("spellcasting abilities at 1st level", () => {
    expect(CLASS_RULES.wizard.spellcasting).toBe("int");
    expect(CLASS_RULES.cleric.spellcasting).toBe("wis");
    expect(CLASS_RULES.fighter.spellcasting).toBeUndefined();
  });
});

describe("parseSkillList", () => {
  it("parses background skill text", () => {
    expect(parseSkillList("Insight, Religion")).toEqual(["insight", "religion"]);
    expect(parseSkillList("Deception, Sleight of Hand")).toEqual(["deception", "sleight-of-hand"]);
    expect(parseSkillList("Animal Handling and Survival")).toEqual(["animal-handling", "survival"]);
  });
});
