import { existsSync } from "node:fs";
import { HAS_HANDBOOK } from "./handbook";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { wikiSections } from "../../data/wikiSections";
import { importers } from "./importers";

const rows = (name: string) => importers.find((i) => i.name === name)!.load() as Record<string, any>[];

// Content QA gates: these fail CI if an extraction or import regression drops data.
describe.skipIf(!HAS_HANDBOOK)("content counts (regression gates)", () => {
  it("has the expected number of entities", () => {
    expect(rows("alignments")).toHaveLength(9);
    expect(rows("conditions")).toHaveLength(15);
    expect(rows("feats")).toHaveLength(42);
    expect(rows("backgrounds")).toHaveLength(13);
    expect(rows("races")).toHaveLength(19); // 18 from the PDF plus the variant human override
    expect(rows("languages")).toHaveLength(16);
    expect(rows("classes")).toHaveLength(12);
    expect(rows("spells")).toHaveLength(362);
    expect(rows("creatures").length).toBeGreaterThanOrEqual(31);
    expect(rows("equipment").length).toBeGreaterThanOrEqual(230);
    expect(rows("rule-sections").length).toBeGreaterThanOrEqual(90);
  });

  it("has the handbook's spells per level", () => {
    const byLevel: Record<number, number> = {};
    for (const s of rows("spells")) byLevel[s.level] = (byLevel[s.level] ?? 0) + 1;
    expect(byLevel).toMatchObject({ 0: 27, 1: 62, 2: 59, 3: 50, 4: 35, 5: 42, 6: 32, 7: 20, 8: 19, 9: 16 });
  });
});

describe.skipIf(!HAS_HANDBOOK)("referential integrity", () => {
  it("every class has all 20 levels in order", () => {
    for (const c of rows("classes")) expect(c.levelTable.map((r: { level: number }) => r.level)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
  it("every spell belongs to at least one of the eight casting classes", () => {
    for (const s of rows("spells")) expect(s.classes.length, s.name).toBeGreaterThan(0);
  });
  it("every background lists skill proficiencies that engine rules know", async () => {
    const { parseSkillList } = await import("../../engine/classes/rules");
    for (const b of rows("backgrounds")) {
      if (b.skillProficiencies) expect(parseSkillList(b.skillProficiencies).length, b.name).toBeGreaterThan(0);
    }
  });
  it("index keys are unique within each content type", () => {
    for (const name of ["spells", "feats", "races", "classes", "creatures", "equipment", "backgrounds", "conditions", "rule-sections"]) {
      const keys = rows(name).map((r) => r.index ?? r.id);
      expect(new Set(keys).size, name).toBe(keys.length);
    }
  });
});

describe("wiki links", () => {
  it("every wiki section in the sidebar has a page", () => {
    for (const s of wikiSections) {
      const dir = path.join(__dirname, "..", "..", "app", "(wiki)", s.href);
      expect(existsSync(path.join(dir, "page.tsx")), s.href).toBe(true);
    }
  });
});
