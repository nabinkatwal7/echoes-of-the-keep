import { describe, expect, it } from "vitest";
import { canBeBeastCompanion, canWildShapeInto, isFamiliarForm, parseChallenge, parseHitPoints, wildShapeHours, wildShapeLimits } from "./index";

describe("parsing", () => {
  it("hit points and challenge", () => {
    expect(parseHitPoints("13 (2d10 + 2)")).toBe(13);
    expect(parseHitPoints(null)).toBe(1);
    expect([parseChallenge("1/4 (50 XP)"), parseChallenge("2"), parseChallenge("0 (10 XP)"), parseChallenge(null)]).toEqual([0.25, 2, 0, 0]);
  });
});

describe("Wild Shape limits", () => {
  it("scale with druid level", () => {
    expect(wildShapeLimits(1)).toBeNull();
    expect(wildShapeLimits(2)).toEqual({ maxCr: 0.25, noFlying: true, noSwimming: true });
    expect(wildShapeLimits(4)).toEqual({ maxCr: 0.5, noFlying: true, noSwimming: false });
    expect(wildShapeLimits(8)).toEqual({ maxCr: 1, noFlying: false, noSwimming: false });
  });
  it("Circle of the Moon reaches higher challenge ratings", () => {
    expect(wildShapeLimits(2, true)!.maxCr).toBe(1);
    expect(wildShapeLimits(9, true)!.maxCr).toBe(3);
    expect(wildShapeLimits(18, true)!.maxCr).toBe(6);
  });
  it("checks creature type, CR and movement", () => {
    const wolf = { type: "beast", challenge: "1/4 (50 XP)", speed: "40 ft." };
    const eagle = { type: "beast", challenge: "1 (200 XP)", speed: "10 ft., fly 80 ft." };
    const croc = { type: "beast", challenge: "1/2 (100 XP)", speed: "20 ft., swim 30 ft." };
    expect(canWildShapeInto(wolf, 2).ok).toBe(true);
    expect(canWildShapeInto(croc, 2).ok).toBe(false); // swimming not until 4th
    expect(canWildShapeInto(croc, 4).ok).toBe(true);
    expect(canWildShapeInto(eagle, 4).ok).toBe(false);
    expect(canWildShapeInto(eagle, 8).ok).toBe(true);
    expect(canWildShapeInto({ ...wolf, type: "undead" }, 8).ok).toBe(false);
    expect(canWildShapeInto(wolf, 1).ok).toBe(false);
  });
  it("lasts half the druid level in hours", () => {
    expect([2, 3, 10].map(wildShapeHours)).toEqual([1, 1, 5]);
  });
});

describe("familiars and beast companions", () => {
  it("only allows spell-legal familiar forms", () => {
    expect(isFamiliarForm("owl")).toBe(true);
    expect(isFamiliarForm("brown-bear")).toBe(false);
  });
  it("beast companions are beasts of CR 1/4 or less", () => {
    expect(canBeBeastCompanion({ type: "beast", challenge: "1/4 (50 XP)", speed: null })).toBe(true);
    expect(canBeBeastCompanion({ type: "beast", challenge: "1 (200 XP)", speed: null })).toBe(false);
  });
});
