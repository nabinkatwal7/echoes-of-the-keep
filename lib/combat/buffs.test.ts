import { describe, expect, it } from "vitest";
import { startTurn } from "@/engine/combat";
import { absorbDamage, beginTurn, movementSpeed, type Cmb } from "./rules";

const cmb = (over: Partial<Cmb> = {}): Cmb => ({
  id: "c", kind: "character", name: "Hero", ac: 15, hp: 30, maxHp: 30, tempHp: 0, speed: 30, initiative: 10, dexMod: 2,
  conditions: [], hidden: false, surprised: false, defeated: false, deathSaves: { successes: 0, failures: 0 },
  turn: startTurn(30), x: 0, y: 0, defenses: {}, ...over,
});

describe("haste", () => {
  const haste = { id: "haste", label: "Haste", rounds: 2, acBonus: 2, speedMultiplier: 2, haste: true, lethargy: true };

  it("doubles speed and grants an extra action", () => {
    const started = beginTurn(cmb({ buffs: [haste] }));
    expect(started.cmb.turn.movement).toBe(60);
    expect(started.cmb.turn.hasteAction).toBe(true);
    expect(movementSpeed(started.cmb)).toBe(60);
  });

  it("applies lethargy on the turn the spell ends", () => {
    const started = beginTurn(cmb({ buffs: [{ ...haste, rounds: 1 }] }));
    expect(started.lines.some((l) => l.includes("lethargic"))).toBe(true);
    expect(started.cmb.turn.action).toBe(false);
    expect(started.cmb.turn.movement).toBe(0);
    expect(started.cmb.turn.reaction).toBe(true);
  });
});

describe("polymorph overflow", () => {
  it("returns excess damage to the original form", () => {
    const beast = cmb({
      name: "Hero (Wolf)", hp: 4, maxHp: 11, polymorph: { name: "Hero", ac: 16, hp: 20, maxHp: 30, speed: 30, attacks: [], defenses: {}, attacksPerAction: 1 },
    });
    const hit = absorbDamage(beast, 10);
    expect(hit.cmb.polymorph).toBeNull();
    expect(hit.cmb.name).toBe("Hero");
    expect(hit.cmb.hp).toBe(14);
    expect(hit.lines[0]).toContain("6 damage carries over");
  });
});
