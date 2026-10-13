import { describe, expect, it } from "vitest";
import type { CharacterInput } from "./index";
import { validateCharacter } from "./validate";

const base = (over: Partial<CharacterInput> = {}): CharacterInput => ({
  classes: [{ classIndex: "fighter", level: 1 }],
  baseScores: { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 8 },
  speed: 30,
  ...over,
});

const codes = (i: CharacterInput, c = {}) => validateCharacter(i, c).map((x) => x.code);

describe("validateCharacter", () => {
  it("accepts a legal level 1 build", () => {
    expect(codes(base())).toEqual([]);
  });
  it("rejects missing, unknown and duplicate classes", () => {
    expect(codes(base({ classes: [] }))).toContain("no-class");
    expect(codes(base({ classes: [{ classIndex: "jedi", level: 1 }] }))).toContain("unknown-class");
    expect(codes(base({ classes: [{ classIndex: "fighter", level: 1 }, { classIndex: "fighter", level: 2 }] }))).toContain("duplicate-class");
  });
  it("enforces the level range", () => {
    expect(codes(base({ classes: [{ classIndex: "fighter", level: 20 }, { classIndex: "rogue", level: 1 }] }))).toContain("level-range");
  });
  it("caps ability scores at 20 including bonuses", () => {
    expect(codes(base({ baseScores: { str: 20, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, scoreBonuses: { str: 1 } }))).toContain("ability-cap");
  });
  it("checks multiclass prerequisites on both classes", () => {
    const ok = base({ classes: [{ classIndex: "fighter", level: 3 }, { classIndex: "wizard", level: 1 }], baseScores: { str: 13, dex: 10, con: 10, int: 13, wis: 10, cha: 10 } });
    expect(codes(ok)).toEqual([]);
    const bad = base({ classes: [{ classIndex: "fighter", level: 3 }, { classIndex: "wizard", level: 1 }] });
    expect(codes(bad)).toContain("multiclass-prereq");
  });
  it("limits ASI and feat choices to the levels reached", () => {
    const l3 = base({ classes: [{ classIndex: "fighter", level: 3 }] });
    expect(codes(l3, { asiTaken: 1 })).toContain("too-many-improvements");
    const l6 = base({ classes: [{ classIndex: "fighter", level: 6 }] });
    expect(codes(l6, { asiTaken: 1, featsTaken: 1 })).toEqual([]); // fighters get levels 4 and 6
    expect(codes(l6, { asiTaken: 2, featsTaken: 1 })).toContain("too-many-improvements");
  });
  it("requires proficiency before expertise", () => {
    expect(codes(base({ skillExpertise: ["stealth"] }))).toContain("expertise-without-proficiency");
    expect(codes(base({ skillProficiencies: ["stealth"], skillExpertise: ["stealth"] }))).toEqual([]);
  });
});
