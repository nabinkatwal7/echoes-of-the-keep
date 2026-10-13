import { describe, expect, it } from "vitest";
import { parseMessage } from "./commands";
import { canSee, newInviteCode } from "./visibility";

const dm = { userId: "dm1", isDm: true };
const alice = { userId: "alice", isDm: false };
const bob = { userId: "bob", isDm: false };

describe("canSee", () => {
  it("shows public events to everyone", () => {
    expect(canSee({ actorId: "alice", audience: "ALL" }, bob)).toBe(true);
  });
  it("hides DM-only events (secret rolls) from players but not from the roller", () => {
    const secret = { actorId: "dm1", audience: "DM" };
    expect(canSee(secret, alice)).toBe(false);
    expect(canSee(secret, dm)).toBe(true);
    // a player whispering to the DM sees their own message
    expect(canSee({ actorId: "alice", audience: "DM" }, alice)).toBe(true);
    expect(canSee({ actorId: "alice", audience: "DM" }, bob)).toBe(false);
  });
  it("limits whispers to the sender and recipient", () => {
    const w = { actorId: "dm1", audience: "USER:alice" };
    expect(canSee(w, alice)).toBe(true);
    expect(canSee(w, dm)).toBe(true);
    expect(canSee(w, bob)).toBe(false);
  });
  it("does not let the DM read whispers between two players", () => {
    expect(canSee({ actorId: "alice", audience: "USER:bob" }, dm)).toBe(false);
  });
  it("hides unknown audiences", () => {
    expect(canSee({ actorId: null, audience: "???" }, dm)).toBe(false);
  });
});

describe("newInviteCode", () => {
  it("generates readable codes of the requested length", () => {
    const code = newInviteCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(newInviteCode(5)).toHaveLength(5);
  });
});

describe("parseMessage", () => {
  it("treats plain text as public chat", () => {
    expect(parseMessage("hello there")).toEqual({ kind: "chat", text: "hello there", audience: "ALL" });
  });
  it("parses rolls with a reason", () => {
    expect(parseMessage("/roll 1d20+5 stealth")).toEqual({ kind: "roll", expression: "1d20+5", reason: "stealth", secret: false });
    expect(parseMessage("/r 2d6")).toMatchObject({ kind: "roll", expression: "2d6", reason: "" });
  });
  it("marks /gmroll as secret", () => {
    expect(parseMessage("/gmroll 1d20")).toMatchObject({ kind: "roll", secret: true });
  });
  it("rejects bad dice and unknown commands", () => {
    expect(parseMessage("/roll banana")).toMatchObject({ kind: "error" });
    expect(parseMessage("/roll")).toMatchObject({ kind: "error" });
    expect(parseMessage("/dance")).toMatchObject({ kind: "error" });
    expect(parseMessage("   ")).toMatchObject({ kind: "error" });
  });
  it("parses emotes and DM whispers", () => {
    expect(parseMessage("/me bows")).toEqual({ kind: "emote", text: "bows" });
    expect(parseMessage("/w dm I check the door")).toEqual({ kind: "whisper-dm", text: "I check the door" });
    expect(parseMessage("/w bob hi")).toMatchObject({ kind: "error" });
  });
});
