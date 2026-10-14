import { describe, expect, it } from "vitest";
import { HAS_HANDBOOK } from "./handbook";
import { SUBCLASSES } from "../../engine/classes/subclasses";
import { extractSubclasses, loadSubclasses } from "./subclasses";

describe("extractSubclasses", () => {
  it("slices between subclass headings and class starts", () => {
    const md = "The Fighter\r\n\r\n### Champion\r\n\r\nImproved Critical.\r\n\r\n### Battle Master\r\n\r\nManeuvers.\r\n\r\nThe Monk\r\n\r\nMonk text.";
    const rows = extractSubclasses(md);
    expect(rows.map((r) => [r.classIndex, r.name, r.text])).toEqual([
      ["fighter", "Champion", "Improved Critical."],
      ["fighter", "Battle Master", "Maneuvers."],
    ]);
  });
});

describe.skipIf(!HAS_HANDBOOK)("handbook subclasses", () => {
  const rows = HAS_HANDBOOK ? loadSubclasses() : [];
  it("finds all 40 with real content", () => {
    expect(SUBCLASSES).toHaveLength(40);
    expect(rows).toHaveLength(40);
    for (const r of rows) expect(r.text.length, r.name).toBeGreaterThan(150);
  });
  it("keeps each subclass with its class", () => {
    const by = (c: string) => rows.filter((r) => r.classIndex === c).length;
    expect([by("cleric"), by("wizard"), by("fighter"), by("warlock")]).toEqual([7, 8, 3, 3]);
  });
  it("does not run a subclass into the next class", () => {
    const totem = rows.find((r) => r.name === "Path of the Totem Warrior")!;
    expect(totem.text).not.toContain("Bardic Inspiration");
  });
});
