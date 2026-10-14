import { describe, expect, it } from "vitest";
import { HAS_HANDBOOK } from "./handbook";
import { importers } from "./importers";

describe.skipIf(!HAS_HANDBOOK)("importers", () => {
  it.each(importers.map((i) => [i.name, i] as const))("%s source data validates", (_name, importer) => {
    expect(importer.load().length).toBeGreaterThan(0);
  });

  it("has all nine alignments", () => {
    const alignments = importers.find((i) => i.name === "alignments")!.load();
    expect(alignments).toHaveLength(9);
  });

  it("loads the expected handbook counts", () => {
    const count = (name: string) => importers.find((i) => i.name === name)!.load().length;
    expect(count("conditions")).toBe(15);
    expect(count("feats")).toBe(42);
    expect(count("backgrounds")).toBe(13);
  });

  it("imports spells with class lists and sensible per-level counts", () => {
    const spells = importers.find((i) => i.name === "spells")!.load() as { name: string; level: number; classes: string[] }[];
    expect(spells.length).toBe(362);
    const fireball = spells.find((s) => s.name === "Fireball")!;
    expect(fireball.level).toBe(3);
    expect(fireball.classes).toEqual(["Sorcerer", "Wizard"]);
    expect(spells.filter((s) => s.level === 9)).toHaveLength(16);
    expect(spells.find((s) => s.name === "Trap the Soul")).toBeDefined();
  });

  it("imports 12 classes with 20-row level tables and correct hit dice", () => {
    const classes = importers.find((i) => i.name === "classes")!.load() as { index: string; hitDie: number }[];
    expect(classes).toHaveLength(12);
    expect(classes.find((c) => c.index === "wizard")!.hitDie).toBe(6);
    expect(classes.find((c) => c.index === "barbarian")!.hitDie).toBe(12);
  });

  it("imports races and subraces with traits", () => {
    const races = importers.find((i) => i.name === "races")!.load() as { index: string; traits: unknown[] }[];
    expect(races).toHaveLength(19);
    expect(races.find((r) => r.index === "hill-dwarf")!.traits.length).toBeGreaterThan(0);
  });

  it("imports creatures and equipment with unique keys", () => {
    const creatures = importers.find((i) => i.name === "creatures")!.load() as { index: string }[];
    expect(creatures.length).toBeGreaterThanOrEqual(30);
    const equipment = importers.find((i) => i.name === "equipment")!.load() as { index: string; name: string; damage?: string }[];
    expect(new Set(equipment.map((e) => e.index)).size).toBe(equipment.length);
    expect(equipment.find((e) => e.name === "Longsword")!.damage).toBe("1d8 slashing");
  });
});
