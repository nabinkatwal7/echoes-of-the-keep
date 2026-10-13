import { describe, expect, it } from "vitest";
import { buildCharacter, type BuildContent, type CreatorChoices } from "./build";

const hillDwarf: BuildContent = {
  race: {
    index: "dwarf",
    traits: [
      { name: "Ability Score Increase", description: "Your Constitution score increases by 2." },
      { name: "Speed", description: "Your base walking speed is 25 feet." },
    ],
  },
  subrace: { index: "hill-dwarf", traits: [{ name: "Ability Score Increase", description: "Your Wisdom score increases by 1." }] },
  background: { index: "acolyte", skillProficiencies: "Insight, Religion" },
};

const choices = (over: Partial<CreatorChoices> = {}): CreatorChoices => ({
  name: "Bruenor",
  raceIndex: "dwarf",
  subraceIndex: "hill-dwarf",
  classIndex: "cleric",
  subclassIndex: "life-domain",
  backgroundIndex: "acolyte",
  abilityMethod: "standard",
  scores: { str: 13, dex: 8, con: 14, int: 10, wis: 15, cha: 12 },
  classSkills: ["history", "medicine"],
  ...over,
});

describe("buildCharacter", () => {
  it("builds a legal hill dwarf cleric", () => {
    const r = buildCharacter(choices(), hillDwarf);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = r.character;
    expect(c.scoreBonuses).toEqual({ con: 2, wis: 1 });
    expect(c.speed).toBe(25);
    expect(c.skillProficiencies).toEqual(["insight", "religion", "history", "medicine"]);
    // d8 + Con modifier (14 + 2 = 16 -> +3)
    expect(c.currentHp).toBe(11);
    expect(c.hitDiceSpent).toEqual({ 8: { total: 1, spent: 0 } });
  });

  it("requires a name and a known class", () => {
    const r = buildCharacter(choices({ name: "  ", classIndex: "jedi" }), hillDwarf);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.errors.join()).toMatch(/Name[\s\S]*Unknown class/);
  });

  it("validates the ability score method", () => {
    const bad = buildCharacter(choices({ scores: { str: 15, dex: 15, con: 15, int: 15, wis: 8, cha: 8 }, abilityMethod: "pointbuy" }), hillDwarf);
    expect(bad.ok).toBe(false);
    const roll = buildCharacter(
      choices({ abilityMethod: "roll", rolled: [16, 14, 13, 12, 10, 8], scores: { str: 8, dex: 10, con: 14, int: 12, wis: 16, cha: 13 } }),
      hillDwarf,
    );
    expect(roll.ok).toBe(true);
  });

  it("checks the class skill count, list and background overlap", () => {
    expect(buildCharacter(choices({ classSkills: ["history"] }), hillDwarf).ok).toBe(false);
    expect(buildCharacter(choices({ classSkills: ["history", "stealth"] }), hillDwarf).ok).toBe(false);
    const overlap = buildCharacter(choices({ classSkills: ["history", "insight"] }), hillDwarf);
    expect(overlap.ok).toBe(false);
    if (!overlap.ok) expect(overlap.errors.join()).toMatch(/already granted/);
    expect(buildCharacter(choices({ classSkills: ["history", "history"] }), hillDwarf).ok).toBe(false);
  });

  it("handles the Half-Elf flexible bonuses", () => {
    const halfElf: BuildContent = {
      race: {
        index: "half-elf",
        traits: [{ name: "Ability Score Increase", description: "Your Charisma score increases by 2, and two other ability scores of your choice increase by 1." }],
      },
      background: hillDwarf.background,
    };
    const base = choices({ raceIndex: "half-elf", subraceIndex: undefined });
    expect(buildCharacter(base, halfElf).ok).toBe(false);
    expect(buildCharacter({ ...base, flexibleBonuses: ["cha", "wis"] }, halfElf).ok).toBe(false);
    const ok = buildCharacter({ ...base, flexibleBonuses: ["dex", "wis"] }, halfElf);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.character.scoreBonuses).toEqual({ cha: 2, dex: 1, wis: 1 });
  });

  it("applies the human +1 to every ability", () => {
    const human: BuildContent = {
      race: { index: "human", traits: [{ name: "Ability Score Increase", description: "Your ability scores each increase by 1." }] },
      background: hillDwarf.background,
    };
    const r = buildCharacter(choices({ raceIndex: "human", subraceIndex: undefined }), human);
    expect(r.ok && Object.keys(r.character.scoreBonuses)).toHaveLength(6);
  });

  it("builds a variant human with a free skill and a starting feat", () => {
    const human: BuildContent = {
      race: { index: "human", traits: [{ name: "Ability Score Increase", description: "Your ability scores each increase by 1." }] },
      subrace: { index: "variant-human", traits: [{ name: "Ability Score Increase", description: "Two different ability scores of your choice increase by 1." }] },
      background: hillDwarf.background,
    };
    const base = choices({ raceIndex: "human", subraceIndex: "variant-human", flexibleBonuses: ["str", "con"], variantSkill: "stealth", variantFeat: "tough" });
    const r = buildCharacter(base, human);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.character.scoreBonuses).toEqual({ str: 1, con: 1 }); // not +1 to everything
      expect(r.character.skillProficiencies).toContain("stealth");
      expect(r.character.feats).toEqual(["tough"]);
    }
    expect(buildCharacter({ ...base, variantFeat: undefined }, human).ok).toBe(false);
    expect(buildCharacter({ ...base, variantSkill: "insight" }, human).ok).toBe(false); // already from background
    expect(buildCharacter({ ...base, flexibleBonuses: ["str"] }, human).ok).toBe(false);
  });

  it("requires a subclass for classes that choose at 1st level", () => {
    const r = buildCharacter(choices({ subclassIndex: undefined }), hillDwarf);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/subclass/);
    expect(buildCharacter(choices({ subclassIndex: "champion" }), hillDwarf).ok).toBe(false); // a fighter subclass
    const ok = buildCharacter(choices(), hillDwarf);
    expect(ok.ok && ok.character.classes[0].subclassIndex).toBe("life-domain");
  });

  it("does not ask a fighter for a subclass yet", () => {
    const r = buildCharacter(choices({ classIndex: "fighter", subclassIndex: undefined, classSkills: ["athletics", "perception"] }), hillDwarf);
    expect(r.ok).toBe(true);
  });
});
