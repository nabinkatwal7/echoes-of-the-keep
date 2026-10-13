import { describe, expect, it } from "vitest";
import {
  adjustDamage,
  applyDamage,
  deathSave,
  gainTempHp,
  heal,
  newVitals,
  stabilize,
  takeDamage,
  type Vitals,
} from "./index";

const down = (maxHp = 20): Vitals => applyDamage(newVitals(maxHp), maxHp);

describe("resistance, vulnerability, immunity", () => {
  it("halves with resistance (rounded down) and doubles with vulnerability", () => {
    expect(adjustDamage(7, "fire", { resistances: ["fire"] })).toBe(3);
    expect(adjustDamage(7, "fire", { vulnerabilities: ["fire"] })).toBe(14);
  });
  it("applies resistance then vulnerability, each once", () => {
    expect(adjustDamage(7, "fire", { resistances: ["fire"], vulnerabilities: ["fire"] })).toBe(6);
  });
  it("immunity ignores damage; resistAll covers every type", () => {
    expect(adjustDamage(10, "poison", { immunities: ["poison"], vulnerabilities: ["poison"] })).toBe(0);
    expect(adjustDamage(10, "acid", { resistAll: true })).toBe(5);
    expect(adjustDamage(10, "acid")).toBe(10);
  });
});

describe("damage and hit points", () => {
  it("temp HP absorbs damage first", () => {
    const v = applyDamage({ ...newVitals(20), tempHp: 5 }, 8);
    expect(v).toMatchObject({ tempHp: 0, hp: 17 });
  });
  it("damage fully absorbed by temp HP leaves HP unchanged", () => {
    expect(applyDamage({ ...newVitals(20), tempHp: 10 }, 4)).toMatchObject({ tempHp: 6, hp: 20 });
  });
  it("temp HP do not stack", () => {
    expect(gainTempHp({ ...newVitals(20), tempHp: 5 }, 3).tempHp).toBe(5);
    expect(gainTempHp({ ...newVitals(20), tempHp: 5 }, 8).tempHp).toBe(8);
  });
  it("applies typed damage with defenses", () => {
    expect(takeDamage(newVitals(20), 10, "cold", { resistances: ["cold"] }).hp).toBe(15);
  });
});

describe("dropping to 0 HP (PHB p.197)", () => {
  it("falls unconscious and starts dying", () => {
    const v = applyDamage(newVitals(20), 20);
    expect(v).toMatchObject({ hp: 0, dying: true, dead: false });
  });
  it("dies outright when leftover damage equals max HP", () => {
    // 10 HP left, 30 damage: 20 overflow >= 20 max HP
    const v = applyDamage({ ...newVitals(20), hp: 10 }, 30);
    expect(v.dead).toBe(true);
    expect(applyDamage({ ...newVitals(20), hp: 10 }, 29).dead).toBe(false);
  });
  it("monsters die at 0 HP", () => {
    expect(applyDamage(newVitals(15), 15, { diesAtZero: true }).dead).toBe(true);
  });
  it("nonlethal damage knocks out and stabilizes", () => {
    expect(applyDamage(newVitals(15), 15, { nonlethal: true })).toMatchObject({ hp: 0, stable: true, dying: false, dead: false });
  });
  it("damage at 0 HP is a death save failure; a crit is two", () => {
    expect(applyDamage(down(), 3).deathSaves.failures).toBe(1);
    expect(applyDamage(down(), 3, { critical: true }).deathSaves.failures).toBe(2);
    const twice = applyDamage(applyDamage(down(), 3, { critical: true }), 3);
    expect(twice.dead).toBe(true);
  });
  it("damage at 0 HP equal to max HP kills instantly", () => {
    expect(applyDamage(down(20), 20).dead).toBe(true);
  });
  it("damage to a stable creature makes it dying again", () => {
    const s = stabilize(down());
    expect(applyDamage(s, 2)).toMatchObject({ stable: false, dying: true });
  });
});

describe("death saving throws", () => {
  it("10 or higher succeeds, below 10 fails", () => {
    expect(deathSave(down(), 10).deathSaves).toEqual({ successes: 1, failures: 0 });
    expect(deathSave(down(), 9).deathSaves).toEqual({ successes: 0, failures: 1 });
  });
  it("a natural 1 is two failures; a natural 20 regains 1 HP", () => {
    expect(deathSave(down(), 1).deathSaves.failures).toBe(2);
    expect(deathSave(down(), 20)).toMatchObject({ hp: 1, dying: false, deathSaves: { successes: 0, failures: 0 } });
  });
  it("three successes stabilize, three failures kill", () => {
    let v = down();
    for (const n of [12, 15, 11]) v = deathSave(v, n);
    expect(v).toMatchObject({ stable: true, dying: false });
    let w = down();
    for (const n of [5, 5, 5]) w = deathSave(w, n);
    expect(w.dead).toBe(true);
  });
  it("does nothing unless dying", () => {
    const v = newVitals(10);
    expect(deathSave(v, 1)).toBe(v);
  });
});

describe("healing", () => {
  it("cannot exceed max HP", () => {
    expect(heal({ ...newVitals(20), hp: 15 }, 10).hp).toBe(20);
  });
  it("wakes a creature at 0 HP and clears death saves", () => {
    const v = heal(deathSave(down(), 4), 5);
    expect(v).toMatchObject({ hp: 5, dying: false, deathSaves: { successes: 0, failures: 0 } });
  });
  it("cannot revive the dead", () => {
    expect(heal({ ...newVitals(20), hp: 0, dead: true }, 10).hp).toBe(0);
  });
});
