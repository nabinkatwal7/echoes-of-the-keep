import { describe, expect, it } from "vitest";
import {
  ambientLight, burnLights, downtime, encounterDifficulty, fadePenalty, formatGameTime, groupMultiplier, journey, newLight, requestDc,
  resurrect, shiftAttitude, timeOfDay, toGameTime,
} from "./index";

describe("the clock", () => {
  it("starts the campaign at 08:00 on day 1 and rolls over midnight", () => {
    expect(formatGameTime(480)).toBe("Day 1, 08:00");
    expect(formatGameTime(480 + 16 * 60 + 30)).toBe("Day 2, 00:30");
    expect(toGameTime(1440 * 3 + 61)).toEqual({ day: 4, hour: 1, minute: 1 });
  });
  it("labels the time of day and the natural light", () => {
    expect(timeOfDay(6 * 60)).toBe("dawn");
    expect(timeOfDay(12 * 60)).toBe("day");
    expect(timeOfDay(19 * 60)).toBe("dusk");
    expect(timeOfDay(23 * 60)).toBe("night");
    expect(ambientLight(12 * 60)).toBe("bright");
    expect(ambientLight(2 * 60)).toBe("darkness");
  });
});

describe("light sources", () => {
  it("a torch burns for an hour and goes out", () => {
    const torch = newLight("t", "torch");
    expect(torch.remainingMinutes).toBe(60);
    const half = burnLights([torch], 30);
    expect(half.lights[0]).toMatchObject({ remainingMinutes: 30, lit: true });
    const done = burnLights(half.lights, 45);
    expect(done.lights[0]).toMatchObject({ remainingMinutes: 0, lit: false });
    expect(done.wentOut.map((l) => l.id)).toEqual(["t"]);
  });
  it("lanterns last six hours and unlit lights do not burn", () => {
    const l = { ...newLight("l", "lantern-hooded"), lit: false };
    expect(l.remainingMinutes).toBe(360);
    expect(burnLights([l], 600).lights[0].remainingMinutes).toBe(360);
  });
});

describe("overland travel", () => {
  it("normal pace covers 24 miles a day, slower terrain costs more", () => {
    expect(journey(24, "normal", 30).days).toBe(1);
    expect(journey(24, "normal", 30, "forest").days).toBe(2);
    expect(journey(24, "normal", 30, "mountain").days).toBe(3);
  });
  it("the slowest traveler sets the speed; fast pace risks surprise", () => {
    expect(journey(24, "normal", 20).hours).toBe(12);
    expect(journey(24, "fast", 30).passivePerceptionPenalty).toBe(5);
    expect(journey(24, "slow", 30).canBeStealthy).toBe(true);
    expect(journey(72, "normal", 30)).toMatchObject({ camps: 2, foodDays: 3 });
  });
});

describe("encounter budget", () => {
  const party = [3, 3, 3, 3];
  it("groups count extra", () => {
    expect(groupMultiplier(1)).toBe(1);
    expect(groupMultiplier(3)).toBe(2);
    expect(groupMultiplier(20)).toBe(4);
  });
  it("rates fights against the party", () => {
    expect(encounterDifficulty(["1/4"], party).difficulty).toBe("trivial");
    expect(encounterDifficulty(["1", "1", "1"], party).adjustedXp).toBe(1200);
    expect(encounterDifficulty(["1", "1", "1"], party).difficulty).toBe("hard");
    expect(encounterDifficulty(["1/2", "1/2"], party).difficulty).toBe("easy");
  });
  it("uses the Basic Rules per-character thresholds and party-size steps", () => {
    expect(encounterDifficulty(["1/4"], [1, 1, 1, 1]).thresholds).toEqual({ easy: 100, medium: 200, hard: 300, deadly: 400 });
    expect(encounterDifficulty(["1"], [5, 5, 5]).thresholds.deadly).toBe(1100 * 3);
    expect(encounterDifficulty(["1"], [20, 20, 20, 20, 20, 20]).thresholds.easy).toBe(2800 * 6);
    // four CR 1/4 monsters are x2, and a party of 2 steps that to x2.5
    expect(encounterDifficulty(["1/4", "1/4", "1/4", "1/4"], [1, 1]).adjustedXp).toBe(500);
  });
});

describe("social interaction", () => {
  it("asks harder of hostile creatures and bigger requests", () => {
    expect(requestDc("friendly")).toBe(10);
    expect(requestDc("indifferent", "large")).toBe(20);
    expect(requestDc("hostile")).toBe(20);
  });
  it("moves attitude by a step on big margins, and stops at the ends", () => {
    expect(shiftAttitude("indifferent", 5)).toBe("friendly");
    expect(shiftAttitude("indifferent", -5)).toBe("hostile");
    expect(shiftAttitude("friendly", 12)).toBe("friendly");
    expect(shiftAttitude("hostile", -9)).toBe("hostile");
    expect(shiftAttitude("hostile", 2)).toBe("hostile");
  });
});

describe("downtime", () => {
  it("crafting progresses 5 gp a day and costs half the price", () => {
    expect(downtime("craft", 5, { itemValueCp: 10000, proficientToolOrSkill: true })).toMatchObject({ ok: true, costCp: 5000, days: 5, summary: expect.stringContaining("5 of 20") });
    expect(downtime("craft", 30, { itemValueCp: 10000, proficientToolOrSkill: true })).toMatchObject({ ok: true, days: 20, summary: expect.stringContaining("finished") });
    expect(downtime("craft", 5, { itemValueCp: 10000, proficientToolOrSkill: false }).ok).toBe(false);
    expect(downtime("craft", 5, { itemValueCp: 100000, proficientToolOrSkill: true })).toMatchObject({ ok: true, days: 5, summary: expect.stringContaining("5 of 200") });
  });
  it("training takes 250 days; research costs a gold piece a day; recuperating needs three", () => {
    expect(downtime("train", 100).ok).toBe(false);
    expect(downtime("train", 250)).toMatchObject({ ok: true, costCp: 250000 });
    expect(downtime("research", 6)).toMatchObject({ costCp: 600 });
    expect(downtime("recuperate", 2).ok).toBe(false);
    expect(downtime("work", 0).ok).toBe(false);
  });
});

describe("returning from the dead", () => {
  it("revivify must be fast and leaves 1 HP", () => {
    expect(resurrect("revivify", 0.0005, 40)).toEqual({ ok: true, hp: 1, penalty: 0, costGp: 300 });
    expect(resurrect("revivify", 1, 40).ok).toBe(false);
  });
  it("raise dead has a 10-day window and a penalty that fades per long rest", () => {
    expect(resurrect("raise-dead", 9, 40)).toMatchObject({ ok: true, hp: 1, penalty: 4 });
    expect(resurrect("raise-dead", 11, 40).ok).toBe(false);
    expect(fadePenalty(4)).toBe(3);
    expect(fadePenalty(0)).toBe(0);
  });
  it("resurrection restores full HP; true resurrection has no penalty", () => {
    expect(resurrect("resurrection", 200, 52)).toMatchObject({ hp: 52, penalty: 4 });
    expect(resurrect("true-resurrection", 365 * 150, 52)).toMatchObject({ hp: 52, penalty: 0, costGp: 25000 });
  });
});
