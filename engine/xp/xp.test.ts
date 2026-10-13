import { describe, expect, it } from "vitest";
import { awardXp, xpForChallenge } from "./index";

describe("xp", () => {
  it("looks up XP by challenge rating", () => {
    expect(xpForChallenge("1/4")).toBe(50);
    expect(xpForChallenge("5")).toBe(1800);
    expect(xpForChallenge("30")).toBe(155000);
  });
  it("prefers the explicit XP in a stat block line", () => {
    expect(xpForChallenge("1/4 (50 XP)")).toBe(50);
    expect(xpForChallenge("0 (10 XP)")).toBe(10);
    expect(xpForChallenge("17 (18,000 XP)")).toBe(18000);
  });
  it("rejects unknown ratings", () => {
    expect(() => xpForChallenge("99")).toThrow();
  });
  it("splits monster XP among the party, rounding down", () => {
    expect(awardXp(["1/4", "1/4", "1"], 4)).toEqual({ total: 300, each: 75 });
    expect(awardXp(["2"], 4)).toEqual({ total: 450, each: 112 });
    expect(() => awardXp(["1"], 0)).toThrow(RangeError);
  });
});
