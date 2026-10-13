import { describe, expect, it } from "vitest";
import { CLASS_RULES } from "./rules";
import { SUBCLASSES, isSubclassOf, subclassDueAt, subclassesFor } from "./subclasses";

describe("subclasses", () => {
  it("lists the 40 PHB subclasses with unique indexes", () => {
    expect(SUBCLASSES).toHaveLength(40);
    expect(new Set(SUBCLASSES.map((s) => s.index)).size).toBe(40);
  });
  it("every class has at least two options", () => {
    for (const c of Object.keys(CLASS_RULES)) expect(subclassesFor(c).length, c).toBeGreaterThanOrEqual(2);
  });
  it("knows which class owns a subclass", () => {
    expect(isSubclassOf("life-domain", "cleric")).toBe(true);
    expect(isSubclassOf("life-domain", "wizard")).toBe(false);
    expect(subclassesFor("wizard")).toHaveLength(8);
  });
  it("subclass levels: 1 for cleric, sorcerer and warlock, 2 for druid and wizard, 3 for the rest", () => {
    expect(subclassDueAt("cleric", 1)).toBe(true);
    expect(subclassDueAt("sorcerer", 1)).toBe(true);
    expect(subclassDueAt("wizard", 2)).toBe(true);
    expect(subclassDueAt("fighter", 3)).toBe(true);
    expect(subclassDueAt("fighter", 2)).toBe(false);
  });
});
