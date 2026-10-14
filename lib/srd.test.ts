import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { allowed, creatureInSrd, gearInSrd, spellInSrd, srdOnly, srdViolations, srdWhere } from "./srd";

afterEach(() => {
  delete process.env.CONTENT_LICENSE_MODE;
});

describe("SRD-only mode", () => {
  it("allows everything when the mode is off", () => {
    expect(srdOnly()).toBe(false);
    expect(srdWhere("race")).toEqual({});
    expect(srdViolations({ raceIndex: "dragonborn", subclassIndex: "wild-magic", backgroundIndex: "noble", feats: ["lucky"] })).toEqual([]);
  });

  it("limits races, subclasses, backgrounds and feats to the free rules when on", () => {
    process.env.CONTENT_LICENSE_MODE = "SRD_ONLY";
    expect(srdOnly()).toBe(true);
    expect(srdWhere("feat")).toEqual({ index: { in: ["grappler"] } });
    expect(allowed("race", "tiefling")).toBe(true);
    expect(allowed("race", "variant-human")).toBe(false);
    expect(allowed("subclass", "champion")).toBe(true);
    expect(allowed("subclass", "battle-master")).toBe(false);
    expect(allowed("race", undefined)).toBe(true);
  });

  it("matches SRD spells, gear and creatures despite broken handbook spacing", () => {
    expect(spellInSrd("Fireball")).toBe(true);
    expect(spellInSrd("Hex")).toBe(false);
    expect(spellInSrd("Me lf ’sAc id Arrow")).toBe(true);
    expect(spellInSrd("Big by ’sHand")).toBe(true);
    expect(spellInSrd("Le omund ’sT i ny Hut")).toBe(true);
    expect(gearInSrd("Longsword")).toBe(true);
    expect(gearInSrd("Padded")).toBe(true);
    expect(gearInSrd("Squalid")).toBe(false);
    expect(creatureInSrd("Wolf")).toBe(true);
    expect(creatureInSrd("Hawk (Falcon)")).toBe(true);
    expect(creatureInSrd("Aboleth")).toBe(true);
  });

  it("keeps the 319 SRD spells from the local extract and drops the rest", () => {
    const spells = JSON.parse(readFileSync("content/extracted/structured/spells.json", "utf8")) as { name: string }[];
    const extra = JSON.parse(readFileSync("content/overrides/spells-extra.json", "utf8")) as { name: string }[];
    const kept = [...spells, ...extra].filter((s) => spellInSrd(s.name));
    expect(kept).toHaveLength(319);
    expect(spellInSrd("Armor of A gathys")).toBe(false);
  });

  it("reports each outside choice", () => {
    process.env.CONTENT_LICENSE_MODE = "SRD_ONLY";
    const errors = srdViolations({ raceIndex: "human", backgroundIndex: "noble", subclassIndex: "wild-magic", feats: ["lucky", "grappler"] });
    expect(errors).toHaveLength(3);
    expect(srdViolations({ raceIndex: "hill-dwarf", subraceIndex: "hill-dwarf", backgroundIndex: "acolyte", subclassIndex: "life-domain", feats: ["grappler"] })).toEqual([]);
  });
});
