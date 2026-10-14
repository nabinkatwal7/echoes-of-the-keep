import { describe, expect, it } from "vitest";
import { startTurn } from "@/engine/combat";
import { approach, averageDamage, expectedDamage, hitChance, planMonsterTurn } from "./ai";
import type { AttackProfile } from "./rules";

const claw: AttackProfile = { name: "Claw", toHit: 5, dice: "1d6", modifier: 3, damageType: "slashing", melee: true };
const bite: AttackProfile = { name: "Bite", toHit: 5, dice: "2d6", modifier: 3, damageType: "piercing", melee: true };
const spit: AttackProfile = { name: "Spit", toHit: 4, dice: "1d4", modifier: 0, damageType: "acid", melee: false, range: { normal: 30, long: 60 } };
const self = (x: number, y: number, movement = 30, attacksPerAction = 1) => ({ id: "m", name: "Wolf", x, y, turn: { ...startTurn(movement), movement }, attacksPerAction });
const foe = (id: string, x: number, y: number, hp = 20, ac = 12) => ({ id, name: id, ac, hp, x, y, defeated: false, hidden: false });
const base = { occupied: new Set<string>(), width: 20, height: 20 };

describe("damage maths", () => {
  it("averages dice and adds the modifier", () => {
    expect(averageDamage(claw)).toBe(6.5);
    expect(averageDamage({ dice: "", modifier: 1 })).toBe(1);
    expect(averageDamage({ dice: "1d8", modifier: -1 })).toBe(3.5);
  });
  it("a 1 always misses and a 20 always hits", () => {
    expect(hitChance(5, 12)).toBe(0.7);
    expect(hitChance(-5, 30)).toBe(0.05);
    expect(hitChance(20, 5)).toBe(0.95);
    expect(expectedDamage(bite, 12)).toBeGreaterThan(expectedDamage(claw, 12));
  });
});

describe("planning a monster turn", () => {
  it("attacks an adjacent foe with its best attack and does not move", () => {
    const plan = planMonsterTurn({ ...base, self: self(5, 5), profiles: [claw, bite], foes: [foe("hero", 6, 5)] });
    expect(plan).toMatchObject({ kind: "attack", targetId: "hero", attack: "Bite", moveTo: null });
  });
  it("walks up to a distant foe and attacks, stopping next to it", () => {
    const plan = planMonsterTurn({ ...base, self: self(2, 5), profiles: [bite], foes: [foe("hero", 6, 5)] });
    expect(plan.kind).toBe("attack");
    if (plan.kind === "attack") {
      expect(plan.moveTo).not.toBeNull();
      expect(Math.max(Math.abs(plan.moveTo!.x - 6), Math.abs(plan.moveTo!.y - 5))).toBe(1);
    }
  });
  it("prefers the foe it can kill", () => {
    const plan = planMonsterTurn({ ...base, self: self(5, 5), profiles: [claw], foes: [foe("tank", 6, 5, 60), foe("weak", 4, 5, 3)] });
    expect(plan).toMatchObject({ targetId: "weak" });
  });
  it("uses a ranged attack when the foe is too far for melee reach", () => {
    const plan = planMonsterTurn({ ...base, self: self(2, 5, 0), profiles: [claw, spit], foes: [foe("hero", 8, 5)] });
    expect(plan).toMatchObject({ kind: "attack", attack: "Spit", moveTo: null });
  });
  it("advances when it cannot reach anyone this turn", () => {
    const plan = planMonsterTurn({ ...base, self: self(0, 5, 10), profiles: [claw], foes: [foe("hero", 15, 5)] });
    expect(plan).toMatchObject({ kind: "attack", attacks: 0, moveTo: { x: 2, y: 5 } });
  });
  it("makes every attack of its Multiattack", () => {
    const plan = planMonsterTurn({ ...base, self: self(5, 5, 30, 3), profiles: [claw], foes: [foe("hero", 6, 5)] });
    expect(plan).toMatchObject({ attacks: 3 });
  });
  it("passes when it has nothing to do", () => {
    expect(planMonsterTurn({ ...base, self: self(5, 5), profiles: [], foes: [foe("h", 6, 5)] }).kind).toBe("pass");
    expect(planMonsterTurn({ ...base, self: self(5, 5), profiles: [claw], foes: [] }).kind).toBe("pass");
    expect(planMonsterTurn({ ...base, self: { ...self(5, 5), x: null, y: null }, profiles: [claw], foes: [foe("h", 6, 5)] }).kind).toBe("pass");
  });
});

describe("walking around obstacles", () => {
  it("steps around a wall and never onto an occupied square", () => {
    const wall = new Set(["4,5", "4,4", "4,6"]);
    const p = approach({ x: 2, y: 5 }, { x: 6, y: 5 }, 5, 8, wall, 20, 20);
    expect(p).not.toBeNull();
    expect(wall.has(`${p!.x},${p!.y}`)).toBe(false);
    expect(Math.max(Math.abs(p!.x - 6), Math.abs(p!.y - 5))).toBe(1);
  });
  it("returns null when boxed in", () => {
    const boxed = new Set(["1,1", "1,2", "1,3", "2,1", "2,3", "3,1", "3,2", "3,3"]);
    expect(approach({ x: 2, y: 2 }, { x: 8, y: 2 }, 5, 6, boxed, 20, 20)).toBeNull();
  });
});
