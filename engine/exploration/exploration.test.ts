import { describe, expect, it } from "vitest";
import { seededRng } from "../dice";
import {
  carryingCapacity,
  dailyRations,
  daysWithoutFood,
  encumbrance,
  fallDamage,
  forcedMarchSaveDc,
  heavilyObscured,
  highJumpFeet,
  highJumpReach,
  holdBreathSeconds,
  lightAt,
  longJumpFeet,
  perceivedLight,
  pushDragLift,
  roundsUntilDying,
  travelDistance,
} from "./index";

describe("travel pace", () => {
  it("matches the PHB table at speed 30", () => {
    expect(travelDistance("fast")).toMatchObject({ feetPerMinute: 400, milesPerHour: 4, milesPerDay: 30, passivePerceptionPenalty: 5 });
    expect(travelDistance("normal")).toMatchObject({ feetPerMinute: 300, milesPerHour: 3, milesPerDay: 24 });
    expect(travelDistance("slow")).toMatchObject({ feetPerMinute: 200, milesPerHour: 2, milesPerDay: 18, canBeStealthy: true });
  });
  it("scales with speed", () => {
    expect(travelDistance("normal", 60).milesPerDay).toBe(48);
    expect(travelDistance("normal", 25).feetPerMinute).toBe(250);
  });
  it("forced march needs a Con save after 8 hours, DC rising by 1 per hour", () => {
    expect(forcedMarchSaveDc(8)).toBeNull();
    expect(forcedMarchSaveDc(9)).toBe(11);
    expect(forcedMarchSaveDc(12)).toBe(14);
  });
});

describe("jumping", () => {
  it("long jump equals Strength with a run-up, half without", () => {
    expect(longJumpFeet(16)).toBe(16);
    expect(longJumpFeet(16, false)).toBe(8);
  });
  it("high jump is 3 + Str modifier", () => {
    expect(highJumpFeet(16)).toBe(6);
    expect(highJumpFeet(16, false)).toBe(3);
    expect(highJumpFeet(6)).toBe(1);
    expect(highJumpFeet(1)).toBe(0);
  });
  it("reach adds 1.5x height", () => {
    expect(highJumpReach(6, 6)).toBe(15);
  });
});

describe("environment", () => {
  it("falls 1d6 per 10 feet, max 20d6, and lands prone", () => {
    expect(fallDamage(5)).toEqual({ dice: 0, damage: 0, prone: false });
    const f = fallDamage(35, seededRng(1));
    expect(f.dice).toBe(3);
    expect(f.damage).toBeGreaterThanOrEqual(3);
    expect(f.damage).toBeLessThanOrEqual(18);
    expect(f.prone).toBe(true);
    expect(fallDamage(1000, seededRng(1)).dice).toBe(20);
  });
  it("suffocation timings", () => {
    expect(holdBreathSeconds(14)).toBe(180);
    expect(holdBreathSeconds(8)).toBe(30);
    expect(roundsUntilDying(14)).toBe(2);
    expect(roundsUntilDying(8)).toBe(1);
  });
  it("food and water", () => {
    expect(daysWithoutFood(14)).toBe(5);
    expect(daysWithoutFood(3)).toBe(1);
    expect(dailyRations("hot").waterGallons).toBe(2);
  });
});

describe("carrying", () => {
  it("capacity is 15x Str, push/drag/lift 30x Str", () => {
    expect(carryingCapacity(10)).toBe(150);
    expect(pushDragLift(10)).toBe(300);
  });
  it("variant encumbrance thresholds", () => {
    expect(encumbrance(10, 50).status).toBe("unencumbered");
    expect(encumbrance(10, 51)).toMatchObject({ status: "encumbered", speedPenalty: 10 });
    expect(encumbrance(10, 101)).toMatchObject({ status: "heavily", speedPenalty: 20, disadvantage: true });
  });
});

describe("light and vision", () => {
  it("torch: bright 20 ft, dim to 40 ft", () => {
    expect(lightAt("torch", 20)).toBe("bright");
    expect(lightAt("torch", 40)).toBe("dim");
    expect(lightAt("torch", 41)).toBe("darkness");
  });
  it("darkvision upgrades light within its radius only", () => {
    expect(perceivedLight("darkness", 30, 60)).toBe("dim");
    expect(perceivedLight("dim", 30, 60)).toBe("bright");
    expect(perceivedLight("darkness", 70, 60)).toBe("darkness");
    expect(heavilyObscured(perceivedLight("darkness", 10, 0))).toBe(true);
  });
});
