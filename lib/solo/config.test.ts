import { describe, expect, it } from "vitest";
import { controllerOf, readSolo } from "./config";

const solo = (over: object = {}) => readSolo({ solo: { humanId: "me", mode: "player", botDmId: "dm-bot", botIds: ["b1"], ...over } });

describe("reading the solo settings", () => {
  it("is null for ordinary campaigns and bad data", () => {
    expect(readSolo({})).toBeNull();
    expect(readSolo(null)).toBeNull();
    expect(readSolo({ solo: { humanId: "me", mode: "god" } })).toBeNull();
    expect(readSolo({ solo: { mode: "dm" } })).toBeNull();
  });
  it("fills in defaults", () => {
    expect(solo({ mode: "dm", botDmId: undefined })).toMatchObject({ mode: "dm", autoMonsters: false, botDmId: null, theme: "crypt", botIds: ["b1"] });
  });
});

describe("who plays a combatant", () => {
  it("heroes belong to their owners", () => {
    expect(controllerOf(solo(), { kind: "character", characterOwnerId: "me" }, "dm-bot")).toEqual({ who: "human" });
    expect(controllerOf(solo(), { kind: "character", characterOwnerId: "b1" }, "dm-bot")).toEqual({ who: "bot", userId: "b1" });
  });
  it("monsters are the computer's when it is the Dungeon Master", () => {
    expect(controllerOf(solo(), { kind: "monster", characterOwnerId: null }, "dm-bot")).toEqual({ who: "ai-dm", userId: "dm-bot" });
  });
  it("in DM mode the person plays monsters unless they ask the computer to", () => {
    const dm = solo({ mode: "dm", botDmId: undefined });
    expect(controllerOf(dm, { kind: "monster", characterOwnerId: null }, "me")).toEqual({ who: "human" });
    const auto = solo({ mode: "dm", botDmId: undefined, autoMonsters: true });
    expect(controllerOf(auto, { kind: "monster", characterOwnerId: null }, "me")).toEqual({ who: "ai-dm", userId: "me" });
  });
  it("ordinary campaigns are always played by people", () => {
    expect(controllerOf(null, { kind: "monster", characterOwnerId: null }, "x")).toEqual({ who: "human" });
  });
});
