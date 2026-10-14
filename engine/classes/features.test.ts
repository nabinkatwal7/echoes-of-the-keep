import { describe, expect, it } from "vitest";
import { CLASS_RULES } from "./rules";
import { SUBCLASSES } from "./subclasses";
import { CLASS_FEATURES, SUBCLASS_FEATURES, featuresAt, featuresKnown, subclassFeaturesAt } from "./features";

describe("class features", () => {
  it("covers every class, and every grant has a level and a description", () => {
    for (const index of Object.keys(CLASS_RULES)) {
      const rows = CLASS_FEATURES[index];
      expect(rows?.length, index).toBeGreaterThan(0);
      expect(rows.some((f) => f.level === 1), index).toBe(true);
      expect(rows.some((f) => f.level === 20), index).toBe(true);
      for (const f of rows) {
        expect(f.level, `${index} ${f.name}`).toBeGreaterThanOrEqual(1);
        expect(f.level).toBeLessThanOrEqual(20);
        expect(f.description.length).toBeGreaterThan(10);
      }
    }
    expect(featuresAt("fighter", 5).map((f) => f.name)).toContain("Extra Attack");
    expect(featuresAt("rogue", 1).map((f) => f.name)).toEqual(["Expertise", "Sneak Attack", "Thieves' Cant"]);
    expect(featuresAt("wizard", 20).map((f) => f.name)).toContain("Signature Spells");
  });

  it("gives every subclass a leveled feature list, including domain and oath spells", () => {
    for (const s of SUBCLASSES) {
      const rows = SUBCLASS_FEATURES[s.index];
      expect(rows?.length, s.index).toBeGreaterThanOrEqual(3);
      for (const f of rows) expect(f.description.length, `${s.index} ${f.name}`).toBeGreaterThan(10);
    }
    expect(subclassFeaturesAt("life-domain", 1).map((f) => f.name)).toContain("Disciple of Life");
    expect(subclassFeaturesAt("life-domain", 3).map((f) => f.name)).toContain("Domain Spells");
    expect(subclassFeaturesAt("champion", 3)[0].name).toBe("Improved Critical");
    expect(subclassFeaturesAt("oath-of-devotion", 3).some((f) => f.name === "Oath Spells")).toBe(true);
  });

  it("lists only features the character has reached", () => {
    const names = featuresKnown([{ classIndex: "cleric", level: 2, subclassIndex: "life-domain" }]).map((f) => f.name);
    expect(names).toContain("Disciple of Life");
    expect(names).toContain("Channel Divinity: Preserve Life");
    expect(names).not.toContain("Blessed Healer");
    const life = featuresKnown([{ classIndex: "cleric", level: 1, subclassIndex: "life-domain" }]).find((f) => f.name === "Disciple of Life");
    expect(life?.automated).toBe(true);
  });
});
