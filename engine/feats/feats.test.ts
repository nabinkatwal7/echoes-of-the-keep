import { describe, expect, it } from "vitest";
import { checkPrerequisites, parsePrerequisite } from "./index";

const ctx = (over = {}) => ({
  scores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  armorProficiencies: [] as string[],
  canCastSpells: false,
  ...over,
});

describe("parsePrerequisite", () => {
  it("parses ability minimums", () => {
    expect(parsePrerequisite("Strength 13 or higher")).toEqual([{ kind: "ability", abilities: ["str"], min: 13 }]);
    expect(parsePrerequisite("Intelligence or Wisdom 13 or higher")).toEqual([{ kind: "ability", abilities: ["int", "wis"], min: 13 }]);
  });
  it("parses armor proficiency and spellcasting", () => {
    expect(parsePrerequisite("Proficiency with heavy armor")).toEqual([{ kind: "armor", armor: "heavy" }]);
    expect(parsePrerequisite("The ability to cast at least one spell")).toEqual([{ kind: "spellcasting" }]);
  });
  it("keeps unknown text for the DM", () => {
    expect(parsePrerequisite("A tragic backstory")).toEqual([{ kind: "unknown", text: "A tragic backstory" }]);
  });
  it("handles no prerequisite", () => {
    expect(parsePrerequisite(null)).toEqual([]);
  });
});

describe("checkPrerequisites", () => {
  it("passes and fails ability checks", () => {
    expect(checkPrerequisites("Strength 13 or higher", ctx({ scores: { str: 13, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } })).met).toBe(true);
    const r = checkPrerequisites("Strength 13 or higher", ctx());
    expect(r.met).toBe(false);
    expect(r.unmet).toEqual(["STR 13+"]);
  });
  it("either of two abilities is enough", () => {
    expect(checkPrerequisites("Intelligence or Wisdom 13 or higher", ctx({ scores: { str: 10, dex: 10, con: 10, int: 8, wis: 14, cha: 10 } })).met).toBe(true);
  });
  it("checks armor proficiency and spellcasting", () => {
    expect(checkPrerequisites("Proficiency with medium armor", ctx({ armorProficiencies: ["light", "medium"] })).met).toBe(true);
    expect(checkPrerequisites("Proficiency with heavy armor", ctx({ armorProficiencies: ["light"] })).met).toBe(false);
    expect(checkPrerequisites("The ability to cast at least one spell", ctx({ canCastSpells: true })).met).toBe(true);
  });
  it("flags unknown requirements for DM review without blocking", () => {
    const r = checkPrerequisites("Sworn to a deity", ctx());
    expect(r.met).toBe(true);
    expect(r.needsDmReview).toEqual(["Sworn to a deity"]);
  });
});
