import { describe, expect, it } from "vitest";
import { HAS_HANDBOOK } from "./handbook";
import { importers } from "./importers";
import { srdRows } from "./srdSeed";

const load = (name: string) => importers.find((i) => i.name === name)!.load() as { index: string; name: string; text?: string }[];

describe.skipIf(!HAS_HANDBOOK)("SRD-only seed", () => {
  it("keeps SRD spells and drops the rest", () => {
    const all = load("spells");
    const kept = srdRows("spells", all);
    expect(kept.length).toBeGreaterThan(200);
    expect(kept.length).toBeLessThan(all.length + 1);
    expect(kept.some((s) => s.index === "fireball")).toBe(true);
  });
  it("keeps only free-rules options", () => {
    expect(srdRows("races", load("races")).map((r) => r.index).sort()).toEqual(expect.arrayContaining(["human", "hill-dwarf", "tiefling"]));
    expect(srdRows("races", load("races")).some((r) => r.index === "variant-human")).toBe(false);
    expect(srdRows("backgrounds", load("backgrounds")).map((r) => r.index)).toEqual(["acolyte"]);
    expect(srdRows("feats", load("feats")).map((r) => r.index)).toEqual(["grappler"]);
    expect(srdRows("subclasses", load("subclasses")).length).toBe(12);
  });
  it("drops handbook chapters and empties class prose", () => {
    expect(srdRows("rule-sections", load("rule-sections"))).toEqual([]);
    expect(srdRows("classes", load("classes")).every((c) => c.text === "")).toBe(true);
    expect(srdRows("conditions", load("conditions")).length).toBeGreaterThan(10);
  });
});
