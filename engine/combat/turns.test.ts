import { describe, expect, it } from "vitest";
import { seededRng } from "../dice";
import {
  interactWithObject,
  move,
  nextTurn,
  provokesOpportunityAttack,
  rollInitiative,
  standUp,
  startCombat,
  startTurn,
  takeAction,
  takeBonusAction,
  takeReaction,
  type Combatant,
} from "./turns";

const c = (id: string, dexModifier: number, extra: Partial<Combatant> = {}): Combatant => ({ id, name: id, dexModifier, ...extra });
const speeds = { a: 30, b: 30, c: 25 };

describe("initiative", () => {
  it("orders by total, highest first", () => {
    const order = rollInitiative([c("a", 0, { initiative: 5 }), c("b", 0, { initiative: 18 }), c("c", 0, { initiative: 11 })]);
    expect(order.map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
  it("breaks ties by Dex modifier, then original order", () => {
    const order = rollInitiative([c("a", 1, { initiative: 10 }), c("b", 3, { initiative: 10 }), c("c", 1, { initiative: 10 })]);
    expect(order.map((x) => x.id)).toEqual(["b", "a", "c"]);
  });
  it("rolls 1d20 + Dex for combatants without a value", () => {
    const order = rollInitiative([c("a", 2), c("b", -1)], seededRng(11));
    for (const o of order) expect(o.initiative).toBeGreaterThanOrEqual(1 + o.dexModifier);
  });
  it("applies initiative bonuses like Alert", () => {
    const o = rollInitiative([c("a", 0, { initiativeBonus: 5 })], () => 0)[0];
    expect(o.initiative).toBe(6);
  });
});

describe("turn order", () => {
  const order = [c("a", 0, { initiative: 15 }), c("b", 0, { initiative: 10 }), c("c", 0, { initiative: 5 })];
  it("starts at the top of round 1 with fresh resources", () => {
    const s = startCombat(order, speeds);
    expect(s).toMatchObject({ round: 1, active: 0 });
    expect(s.turn).toMatchObject({ action: true, bonusAction: true, reaction: true, movement: 30 });
  });
  it("advances and wraps into a new round", () => {
    let s = startCombat(order, speeds);
    s = nextTurn(s, speeds);
    expect(s.active).toBe(1);
    s = nextTurn(nextTurn(s, speeds), speeds);
    expect(s).toMatchObject({ round: 2, active: 0 });
  });
  it("skips defeated combatants", () => {
    const o = [c("a", 0, { initiative: 15 }), c("b", 0, { initiative: 10, defeated: true }), c("c", 0, { initiative: 5 })];
    expect(nextTurn(startCombat(o, speeds), speeds).active).toBe(2);
  });
  it("restores a creature's reaction when its own turn starts", () => {
    let s = startCombat(order, speeds);
    s = { ...s, turn: takeReaction(s.turn) };
    expect(s.turn.reaction).toBe(false);
    s = nextTurn(nextTurn(nextTurn(s, speeds), speeds), speeds);
    expect(s.turn.reaction).toBe(true);
  });
});

describe("surprise (PHB p.189)", () => {
  it("surprised creatures cannot move, act or react on their first turn only", () => {
    const o = [c("a", 0, { initiative: 15 }), c("b", 0, { initiative: 10, surprised: true })];
    let s = startCombat(o, speeds);
    s = nextTurn(s, speeds);
    expect(s.turn).toMatchObject({ action: false, bonusAction: false, reaction: false, movement: 0, surprisedTurn: true });
    s = nextTurn(nextTurn(s, speeds), speeds); // a, then b again in round 2
    expect(s.round).toBe(2);
    expect(s.turn).toMatchObject({ action: true, movement: 30 });
  });
});

describe("action economy (PHB p.192)", () => {
  it("allows one action, one bonus action and one reaction", () => {
    let t = startTurn(30);
    t = takeAction(t, "attack", 30);
    expect(() => takeAction(t, "dodge", 30)).toThrow(/No action/);
    t = takeBonusAction(t);
    expect(() => takeBonusAction(t)).toThrow(/No bonus action/);
    t = takeReaction(t);
    expect(() => takeReaction(t)).toThrow(/No reaction/);
  });
  it("Dash adds speed to movement", () => {
    expect(takeAction(startTurn(30), "dash", 30).movement).toBe(60);
  });
  it("Dodge and Disengage set their flags", () => {
    expect(takeAction(startTurn(30), "dodge", 30).dodging).toBe(true);
    expect(takeAction(startTurn(30), "disengage", 30).disengaged).toBe(true);
  });
  it("one free object interaction, then it costs the action", () => {
    let t = interactWithObject(startTurn(30));
    expect(t.action).toBe(true);
    t = interactWithObject(t);
    expect(t.action).toBe(false);
  });
});

describe("movement", () => {
  it("tracks remaining feet and refuses to overspend", () => {
    const t = move(startTurn(30), 20);
    expect(t.movement).toBe(10);
    expect(() => move(t, 15)).toThrow(/Only 10 ft/);
  });
  it("standing up costs half your speed", () => {
    expect(standUp(startTurn(30), 30).movement).toBe(15);
  });
  it("leaving reach provokes unless disengaged or forced", () => {
    expect(provokesOpportunityAttack(startTurn(30), true)).toBe(true);
    expect(provokesOpportunityAttack(takeAction(startTurn(30), "disengage", 30), true)).toBe(false);
    expect(provokesOpportunityAttack(startTurn(30), true, false)).toBe(false);
    expect(provokesOpportunityAttack(startTurn(30), false)).toBe(false);
  });
});
