import { describe, expect, it } from "vitest";
import { entriesToText, oddsOf, parseEntries, rollTable, STARTER_TABLES } from "./tables";

describe("random tables", () => {
  it("reads weights and plain lines, skipping blanks", () => {
    expect(parseEntries("3 | A brawl\n\nA quiet night\r\n  2|Rain  \n")).toEqual([
      { weight: 3, text: "A brawl" },
      { weight: 1, text: "A quiet night" },
      { weight: 2, text: "Rain" },
    ]);
    expect(parseEntries("0 | never zero")[0].weight).toBe(1);
    expect(parseEntries("x".repeat(300))[0].text).toHaveLength(200);
  });

  it("round-trips through text", () => {
    const e = [{ text: "A", weight: 1 }, { text: "B", weight: 4 }];
    expect(parseEntries(entriesToText(e))).toEqual(e);
  });

  it("rolls by weight and reports the position", () => {
    const e = [{ text: "common", weight: 3 }, { text: "rare", weight: 1 }];
    expect(rollTable(e, () => 0)).toMatchObject({ index: 1, entry: { text: "common" } });
    expect(rollTable(e, () => 0.74)).toMatchObject({ index: 1 });
    expect(rollTable(e, () => 0.75)).toMatchObject({ index: 2, entry: { text: "rare" } });
    expect(rollTable(e, () => 0.999999)).toMatchObject({ index: 2 });
    expect(() => rollTable([])).toThrow("empty");
  });

  it("every entry comes up in proportion over many rolls", () => {
    const e = [{ text: "a", weight: 1 }, { text: "b", weight: 1 }, { text: "c", weight: 2 }];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    let n = 0;
    const seq = () => ((n++ * 0.6180339887) % 1);
    for (let i = 0; i < 4000; i++) counts[rollTable(e, seq).entry.text]++;
    expect(counts.c / 4000).toBeGreaterThan(0.45);
    expect(counts.c / 4000).toBeLessThan(0.55);
    expect(oddsOf(e)).toEqual([25, 25, 50]);
  });

  it("ships usable starter tables", () => {
    expect(STARTER_TABLES.length).toBeGreaterThanOrEqual(4);
    for (const t of STARTER_TABLES) {
      expect(t.entries.length).toBeGreaterThanOrEqual(6);
      expect(t.entries.every((x) => x.text && x.weight >= 1)).toBe(true);
    }
  });
});
