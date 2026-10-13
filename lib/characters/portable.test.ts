import { describe, expect, it } from "vitest";
import { auditStored } from "./audit";
import { FORMAT, VERSION, exportCharacter, parseImport } from "./portable";

const row = {
  name: "Portable Pat", raceIndex: "dwarf", subraceIndex: "hill-dwarf", backgroundIndex: "soldier", alignment: "lawful-good",
  classes: [{ classIndex: "fighter", level: 3, subclassIndex: "champion" }],
  baseScores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 }, abilityMethod: "standard", scoreBonuses: { con: 2 },
  skillProficiencies: ["athletics"], skillExpertise: [], feats: [], speed: 25, xp: 900, inspiration: false,
  currentHp: 28, tempHp: 0, hitDiceSpent: { 10: { total: 3, spent: 0 } }, deathSaves: { successes: 0, failures: 0 }, conditions: [],
  exhaustion: 0, currency: { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 }, equipment: [], spellSlotsUsed: [], resources: {}, personality: {},
  spells: {}, notes: "", companions: [],
  // fields that must never be exported
  id: "secret-id", ownerId: "secret-owner", createdAt: new Date(),
};

describe("export and import", () => {
  it("exports a document without ids or owners", () => {
    const doc = exportCharacter(row);
    expect(doc).toMatchObject({ format: FORMAT, version: VERSION });
    expect(JSON.stringify(doc)).not.toContain("secret");
  });
  it("round-trips a legal character", () => {
    const r = parseImport(JSON.stringify(exportCharacter(row)));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.character).toMatchObject({ name: "Portable Pat", classes: [{ classIndex: "fighter", level: 3 }] });
  });
  it("rejects bad input", () => {
    expect(parseImport("not json").ok).toBe(false);
    expect(parseImport(JSON.stringify({ format: "other" })).ok).toBe(false);
    expect(parseImport(JSON.stringify({ format: FORMAT, version: 99, character: {} })).ok).toBe(false);
    expect(parseImport("x".repeat(300_000)).ok).toBe(false);
  });
  it("rejects characters that break the rules", () => {
    const bad = exportCharacter({ ...row, baseScores: { ...row.baseScores, str: 20 }, scoreBonuses: { str: 2 } });
    const r = parseImport(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/cannot exceed 20/);
    expect(parseImport(JSON.stringify(exportCharacter({ ...row, classes: [{ classIndex: "jedi", level: 1 }] }))).ok).toBe(false);
  });
});

describe("auditStored", () => {
  it("passes a legal character", () => {
    expect(auditStored(row as never)).toEqual([]);
  });
  it("flags a missing subclass, HP above max and duplicate armor", () => {
    const bad = {
      ...row,
      classes: [{ classIndex: "fighter", level: 3 }],
      currentHp: 999,
      equipment: [
        { id: "a", name: "Plate", kind: "armor", armorCategory: "heavy", baseAc: 18, strengthRequired: 17, quantity: 1, equipped: true },
        { id: "b", name: "Chainmail", kind: "armor", armorCategory: "heavy", baseAc: 16, quantity: 1, equipped: true },
      ],
    };
    const messages = auditStored(bad as never).map((i) => i.message).join(" | ");
    expect(messages).toMatch(/needs a subclass/);
    expect(messages).toMatch(/above the maximum/);
    expect(messages).toMatch(/More than one suit of armor/);
    expect(messages).toMatch(/Plate needs Strength 17/);
  });
});
