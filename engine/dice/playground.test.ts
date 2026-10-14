import { describe, expect, it } from "vitest";
import { rollPlayground } from "./playground";
import { seededRng } from "./roll";

describe("dice playground", () => {
  it("adds the bonus to a roll", () => {
    const r = rollPlayground({ formula: "1d20", bonus: 5, mode: "normal" }, seededRng(1));
    expect(r.ok && r.total).toBe((r.ok ? r.rolls[0].total : 0) + 5);
    expect(r.ok && r.rolls).toHaveLength(1);
  });
  it("advantage keeps the higher of two rolls and disadvantage the lower", () => {
    for (let seed = 1; seed < 30; seed++) {
      const adv = rollPlayground({ formula: "1d20", bonus: 0, mode: "advantage" }, seededRng(seed));
      const dis = rollPlayground({ formula: "1d20", bonus: 0, mode: "disadvantage" }, seededRng(seed));
      if (!adv.ok || !dis.ok) throw new Error("should parse");
      expect(adv.rolls).toHaveLength(2);
      expect(adv.total).toBe(Math.max(...adv.rolls.map((x) => x.total)));
      expect(dis.total).toBe(Math.min(...dis.rolls.map((x) => x.total)));
    }
  });
  it("ignores advantage on a formula with no d20", () => {
    const r = rollPlayground({ formula: "2d6+3", bonus: 0, mode: "advantage" }, seededRng(2));
    expect(r.ok && r.modeApplied).toBe("normal");
    expect(r.ok && r.rolls).toHaveLength(1);
  });
  it("keeps the highest dice for 4d6kh3", () => {
    const r = rollPlayground({ formula: "4d6kh3", bonus: 0, mode: "normal" }, seededRng(7));
    if (!r.ok) throw new Error("should parse");
    expect(r.rolls[0].terms[0].kept).toHaveLength(3);
    expect(r.total).toBe(r.rolls[0].terms[0].kept.reduce((a, b) => a + b, 0));
  });
  it("reports a natural 20 or 1 on a lone d20", () => {
    const seen = new Set<string | null>();
    for (let seed = 1; seed < 400; seed++) {
      const r = rollPlayground({ formula: "d20", bonus: 0, mode: "normal" }, seededRng(seed));
      if (r.ok) seen.add(r.natural);
    }
    expect(seen.has("crit") && seen.has("fumble")).toBe(true);
  });
  it("explains a bad formula instead of throwing", () => {
    const r = rollPlayground({ formula: "banana", bonus: 0, mode: "normal" });
    expect(r.ok).toBe(false);
  });
});
