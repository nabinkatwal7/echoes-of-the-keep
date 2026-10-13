import { describe, expect, it } from "vitest";
import { BASE_RACES, SUBRACES, parseAbilityIncrease, parseSpeed } from "./race";

describe("parseAbilityIncrease", () => {
  it("parses a single increase", () => {
    expect(parseAbilityIncrease("Your Constitution score increases by 2.")).toEqual({ fixed: { con: 2 } });
  });
  it("parses two increases", () => {
    expect(parseAbilityIncrease("Your Strength score increases by 2, and your Charisma score increases by 1.")).toEqual({
      fixed: { str: 2, cha: 1 },
    });
    expect(parseAbilityIncrease("Your Intelligence score increases by 1, and your Charisma score increases by 2.").fixed).toEqual({ int: 1, cha: 2 });
  });
  it("parses the human +1 to everything", () => {
    expect(parseAbilityIncrease("Your ability scores each increase by 1.").fixed).toEqual({ str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 });
  });
  it("parses the half-elf choice", () => {
    const r = parseAbilityIncrease("Your Charisma score increases by 2, and two other ability scores of your choice increase by 1.");
    expect(r.fixed).toEqual({ cha: 2 });
    expect(r.choose).toEqual({ count: 2, amount: 1 });
  });
});

describe("parseSpeed", () => {
  it("reads the walking speed", () => {
    expect(parseSpeed("Your base walking speed is 25 feet. Your speed is not reduced by wearing heavy armor.")).toBe(25);
    expect(parseSpeed("Your base walking speed is 30 feet.")).toBe(30);
    expect(parseSpeed(undefined)).toBe(30);
  });
});

describe("race lists", () => {
  it("has nine base races and subraces for four of them", () => {
    expect(BASE_RACES).toHaveLength(9);
    expect(Object.values(SUBRACES).flat()).toHaveLength(9);
  });
});
