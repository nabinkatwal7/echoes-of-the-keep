import { describe, expect, it } from "vitest";
import { deriveCharacter, explain, type CharacterInput } from "./index";

const scores = (o: Partial<Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>> = {}) => ({
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...o,
});

const fighter = (over: Partial<CharacterInput> = {}): CharacterInput => ({
  classes: [{ classIndex: "fighter", level: 1 }],
  baseScores: scores({ str: 16, dex: 12, con: 14, wis: 10 }),
  speed: 30,
  saveProficiencies: ["str", "con"],
  ...over,
});

describe("level, proficiency and ability scores", () => {
  it("sums class levels for proficiency bonus", () => {
    const c = deriveCharacter({ ...fighter(), classes: [{ classIndex: "fighter", level: 5 }, { classIndex: "wizard", level: 4 }] });
    expect(c.level).toBe(9);
    expect(c.proficiencyBonus).toBe(4);
  });
  it("adds racial/ASI bonuses and caps scores at 20", () => {
    const c = deriveCharacter(fighter({ baseScores: scores({ str: 19 }), scoreBonuses: { str: 2, dex: 1 } }));
    expect(c.abilities.str.score).toBe(20);
    expect(c.abilities.dex).toEqual({ score: 11, modifier: 0 });
  });
  it("rejects levels outside 1-20", () => {
    expect(() => deriveCharacter({ ...fighter(), classes: [{ classIndex: "fighter", level: 21 }] })).toThrow(RangeError);
  });
});

describe("hit points", () => {
  it("1st level fighter: d10 + Con", () => {
    expect(deriveCharacter(fighter()).maxHp).toBe(12);
  });
  it("later levels use the average", () => {
    const c = deriveCharacter(fighter({ classes: [{ classIndex: "fighter", level: 3 }] }));
    expect(c.maxHp).toBe(12 + 2 * (6 + 2));
  });
  it("first class provides max die; multiclass levels use averages", () => {
    const c = deriveCharacter(fighter({ classes: [{ classIndex: "wizard", level: 1 }, { classIndex: "fighter", level: 1 }] }));
    expect(c.maxHp).toBe(6 + 2 + (6 + 2)); // wizard d6 max + con, fighter average 6 + con
  });
  it("applies per-level bonuses such as Tough or Hill Dwarf", () => {
    expect(deriveCharacter(fighter({ hpPerLevelBonus: 2 })).maxHp).toBe(14);
  });
  it("never gives less than 1 HP per level", () => {
    const c = deriveCharacter({ ...fighter(), baseScores: scores({ con: 3 }), classes: [{ classIndex: "wizard", level: 2 }] });
    expect(c.maxHp).toBe(3); // level 1: 6-4 = 2, level 2: average 4-4 = 0 -> minimum 1
  });
});

describe("armor class", () => {
  it("no armor is 10 + Dex", () => {
    expect(deriveCharacter(fighter()).armorClass.total).toBe(11);
  });
  it("chain mail + shield is 18 (heavy armor ignores Dex)", () => {
    const c = deriveCharacter(fighter({ armor: { name: "Chain mail", category: "heavy", baseAc: 16, strengthRequired: 13 }, shield: true }));
    expect(c.armorClass.total).toBe(18);
  });
  it("studded leather adds full Dex: 12 + 3 = 15", () => {
    const c = deriveCharacter({
      classes: [{ classIndex: "rogue", level: 1 }],
      baseScores: scores({ dex: 16 }),
      speed: 30,
      armor: { name: "Studded leather", category: "light", baseAc: 12 },
    });
    expect(c.armorClass.total).toBe(15);
  });
  it("medium armor caps Dex at +2", () => {
    const c = deriveCharacter(fighter({ baseScores: scores({ dex: 18 }), armor: { name: "Breastplate", category: "medium", baseAc: 14 } }));
    expect(c.armorClass.total).toBe(16);
  });
  it("barbarian Unarmored Defense is 10 + Dex + Con", () => {
    const c = deriveCharacter({ classes: [{ classIndex: "barbarian", level: 1 }], baseScores: scores({ dex: 14, con: 16 }), speed: 30 });
    expect(c.armorClass.total).toBe(15);
  });
  it("monk Unarmored Defense is 10 + Dex + Wis, lost with a shield", () => {
    const monk: CharacterInput = { classes: [{ classIndex: "monk", level: 1 }], baseScores: scores({ dex: 16, wis: 14 }), speed: 30 };
    expect(deriveCharacter(monk).armorClass.total).toBe(15);
    expect(deriveCharacter({ ...monk, shield: true }).armorClass.total).toBe(15); // base 10 + Dex 3 + shield 2
  });
  it("heavy armor below the Strength requirement slows you by 10 ft", () => {
    const c = deriveCharacter(fighter({ baseScores: scores({ str: 12 }), armor: { name: "Plate", category: "heavy", baseAc: 18, strengthRequired: 15 } }));
    expect(c.speed).toBe(20);
  });
});

describe("skills, saves and passives", () => {
  const rogue: CharacterInput = {
    classes: [{ classIndex: "rogue", level: 5 }],
    baseScores: scores({ dex: 18, wis: 12 }),
    speed: 30,
    skillProficiencies: ["stealth", "perception"],
    skillExpertise: ["stealth"],
    saveProficiencies: ["dex", "int"],
  };
  it("expertise doubles proficiency (level 5: +3 prof)", () => {
    const c = deriveCharacter(rogue);
    expect(c.skills.stealth.total).toBe(4 + 6);
    expect(c.skills.perception.total).toBe(1 + 3);
    expect(c.skills.athletics.total).toBe(0);
  });
  it("saving throw proficiency", () => {
    const c = deriveCharacter(rogue);
    expect(c.saves.dex.total).toBe(7);
    expect(c.saves.str.total).toBe(0);
  });
  it("passive Perception is 10 + Perception bonus", () => {
    expect(deriveCharacter(rogue).passivePerception).toBe(14);
  });
  it("Jack of All Trades adds half proficiency to the rest", () => {
    const c = deriveCharacter({ ...rogue, jackOfAllTrades: true });
    expect(c.skills.athletics.total).toBe(1);
  });
  it("explains a total", () => {
    expect(explain(deriveCharacter(rogue).skills.perception)).toBe("+4 = +1 WIS +3 Proficiency");
  });
});

describe("attacks", () => {
  it("melee weapons use Strength, ranged use Dex, finesse uses the better", () => {
    const c = deriveCharacter(
      fighter({
        baseScores: scores({ str: 16, dex: 14 }),
        weapons: [
          { name: "Longsword", damage: "1d8", melee: true, proficient: true },
          { name: "Longbow", damage: "1d8", melee: false, proficient: true },
          { name: "Rapier", damage: "1d8", melee: true, finesse: true, proficient: true },
          { name: "Club", damage: "1d4", melee: true, proficient: false },
        ],
      }),
    );
    const by = Object.fromEntries(c.attacks.map((a) => [a.name, a]));
    expect(by.Longsword.attackBonus.total).toBe(5);
    expect(by.Longsword.damage).toBe("1d8+3");
    expect(by.Longbow.attackBonus.total).toBe(4);
    expect(by.Rapier.attackBonus.total).toBe(5);
    expect(by.Club.attackBonus.total).toBe(3);
  });
  it("magic bonus applies to attack and damage", () => {
    const c = deriveCharacter(fighter({ weapons: [{ name: "+1 Sword", damage: "1d8", melee: true, proficient: true, magicBonus: 1 }] }));
    expect(c.attacks[0].attackBonus.total).toBe(6);
    expect(c.attacks[0].damage).toBe("1d8+4");
  });
});
