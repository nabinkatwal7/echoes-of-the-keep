import { describe, expect, it } from "vitest";
import {
  parseDice,
  resolveRollMode,
  rollD20,
  rollExpression,
  seededRng,
} from "./index";

describe("parseDice", () => {
  it("parses dice with modifiers", () => {
    const e = parseDice("2d6+3");
    expect(e.terms).toEqual([{ sign: 1, count: 2, sides: 6 }]);
    expect(e.modifier).toBe(3);
  });
  it("defaults the count to 1 and supports d%", () => {
    expect(parseDice("d20").terms[0]).toMatchObject({ count: 1, sides: 20 });
    expect(parseDice("d%").terms[0].sides).toBe(100);
  });
  it("supports keep-highest and several terms", () => {
    const e = parseDice("4d6kh3 + 1d4 - 2");
    expect(e.terms[0].keep).toEqual({ mode: "h", n: 3 });
    expect(e.terms[1].count).toBe(1);
    expect(e.modifier).toBe(-2);
  });
  it.each(["", "abc", "2d", "d1", "0d6", "2d6++3", "4d6kh5", "2d6x"])(
    "rejects %j",
    (bad) => {
      expect(() => parseDice(bad)).toThrow();
    },
  );
});

describe("rollExpression", () => {
  it("is deterministic with a seeded RNG", () => {
    expect(rollExpression("3d8+2", seededRng(7))).toEqual(
      rollExpression("3d8+2", seededRng(7)),
    );
  });
  it("stays within bounds", () => {
    const rng = seededRng(1);
    for (let i = 0; i < 500; i++) {
      const { total } = rollExpression("2d6+3", rng);
      expect(total).toBeGreaterThanOrEqual(5);
      expect(total).toBeLessThanOrEqual(15);
    }
  });
  it("drops the lowest die with 4d6kh3", () => {
    const r = rollExpression("4d6kh3", seededRng(42));
    const { rolls, kept } = r.terms[0];
    expect(kept).toHaveLength(3);
    expect(r.total).toBe(rolls.reduce((s, n) => s + n, 0) - Math.min(...rolls));
  });
  it("subtracts negative terms", () => {
    const r = rollExpression("1d4-1d4", seededRng(3));
    expect(r.total).toBe(r.terms[0].subtotal + r.terms[1].subtotal);
  });
});

describe("advantage and disadvantage (PHB p.173)", () => {
  it("cancels regardless of how many sources", () => {
    expect(resolveRollMode({ advantage: 3, disadvantage: 1 })).toBe("normal");
    expect(resolveRollMode({ advantage: 1, disadvantage: 4 })).toBe("normal");
  });
  it("resolves single-sided modes", () => {
    expect(resolveRollMode({ advantage: 2, disadvantage: 0 })).toBe(
      "advantage",
    );
    expect(resolveRollMode({ advantage: 0, disadvantage: 1 })).toBe(
      "disadvantage",
    );
    expect(resolveRollMode({ advantage: 0, disadvantage: 0 })).toBe("normal");
  });
  it("takes the higher/lower d20", () => {
    for (let seed = 0; seed < 50; seed++) {
      const adv = rollD20(0, "advantage", seededRng(seed));
      const dis = rollD20(0, "disadvantage", seededRng(seed));
      expect(adv.natural).toBe(Math.max(...adv.dice));
      expect(dis.natural).toBe(Math.min(...dis.dice));
      expect(adv.natural).toBeGreaterThanOrEqual(dis.natural);
    }
  });
  it("flags natural 20 and 1 and adds the modifier", () => {
    const r = rollD20(5, "normal", () => 0.999);
    expect(r).toMatchObject({ natural: 20, critical: true, total: 25 });
    expect(rollD20(5, "normal", () => 0)).toMatchObject({
      natural: 1,
      fumble: true,
      total: 6,
    });
  });
});
