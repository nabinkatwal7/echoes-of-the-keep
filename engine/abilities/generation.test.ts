import { describe, expect, it } from "vitest";
import { seededRng } from "../dice";
import {
  POINT_BUY_BUDGET,
  pointBuyCost,
  rollAbilityScores,
  validatePointBuy,
  validateRolledAssignment,
  validateStandardArray,
} from "./generation";

const make = (str: number, dex: number, con: number, int: number, wis: number, cha: number) => ({
  str, dex, con, int, wis, cha,
});

describe("standard array", () => {
  it("accepts any assignment of the array", () => {
    expect(validateStandardArray(make(8, 10, 12, 13, 14, 15)).valid).toBe(true);
  });
  it("rejects repeats and other values", () => {
    expect(validateStandardArray(make(15, 15, 13, 12, 10, 8)).valid).toBe(false);
    expect(validateStandardArray(make(16, 14, 13, 12, 10, 8)).valid).toBe(false);
  });
});

describe("point buy", () => {
  it("costs 27 points for 15/15/15/8/8/8", () => {
    const s = make(15, 15, 15, 8, 8, 8);
    expect(pointBuyCost(s)).toBe(POINT_BUY_BUDGET);
    expect(validatePointBuy(s).valid).toBe(true);
  });
  it("accepts the all-8 start and a balanced 13s/12s spread", () => {
    expect(validatePointBuy(make(8, 8, 8, 8, 8, 8)).valid).toBe(true);
    expect(validatePointBuy(make(13, 13, 13, 12, 12, 12)).valid).toBe(true); // 5+5+5+4+4+4 = 27
  });
  it("rejects overspending", () => {
    const r = validatePointBuy(make(15, 15, 15, 15, 8, 8));
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/36/);
  });
  it("rejects scores outside 8-15", () => {
    expect(validatePointBuy(make(16, 8, 8, 8, 8, 8)).valid).toBe(false);
    expect(validatePointBuy(make(7, 8, 8, 8, 8, 8)).valid).toBe(false);
  });
});

describe("rolled scores", () => {
  it("rolls six values between 3 and 18, sorted descending", () => {
    const rolled = rollAbilityScores(seededRng(5));
    expect(rolled).toHaveLength(6);
    expect(rolled).toEqual([...rolled].sort((a, b) => b - a));
    rolled.forEach((n) => {
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(18);
    });
  });
  it("only accepts assignments of the rolled values", () => {
    const rolled = [16, 14, 13, 12, 10, 8];
    expect(validateRolledAssignment(rolled, make(8, 10, 12, 13, 14, 16)).valid).toBe(true);
    expect(validateRolledAssignment(rolled, make(18, 10, 12, 13, 14, 16)).valid).toBe(false);
  });
});
