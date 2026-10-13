import { describe, expect, it } from "vitest";
import { advance, beginTurn, finishTurn, monsterProfiles, resolveAttackAction, resolveGrappleAction, spendSimpleAction, splitDamage, type AttackProfile, type Cmb } from "./rules";
import { parseMonsterActions } from "@/engine/combat";
import { startTurn } from "@/engine/combat";

// d20 face rng: every die rolled returns the same fraction, so d20 = face and dN = ceil-ish
const face = (n: number) => () => (n - 0.5) / 20;

const cmb = (over: Partial<Cmb> = {}): Cmb => ({
  id: "c", kind: "character", name: "Hero", ac: 15, hp: 20, maxHp: 20, tempHp: 0, speed: 30, initiative: 10, dexMod: 2,
  conditions: [], hidden: false, surprised: false, defeated: false, deathSaves: { successes: 0, failures: 0 },
  turn: startTurn(30), x: 0, y: 0, defenses: {}, ...over,
});

const sword: AttackProfile = { name: "Longsword", toHit: 5, dice: "1d8", modifier: 3, damageType: "slashing", melee: true };
const bow: AttackProfile = { name: "Longbow", toHit: 4, dice: "1d8", modifier: 2, damageType: "piercing", melee: false, range: { normal: 150, long: 600 } };

describe("splitDamage and monster profiles", () => {
  it("splits dice and modifier", () => {
    expect(splitDamage("1d8+3")).toEqual({ dice: "1d8", modifier: 3 });
    expect(splitDamage("2d6")).toEqual({ dice: "2d6", modifier: 0 });
    expect(splitDamage("1d6-1")).toEqual({ dice: "1d6", modifier: -1 });
  });
  it("turns parsed monster attacks into profiles, including flat damage", () => {
    const wolf = monsterProfiles(parseMonsterActions("Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) piercing damage.").attacks)[0];
    expect(wolf).toMatchObject({ toHit: 4, dice: "2d4", modifier: 2, damageType: "piercing", melee: true });
    const cat = monsterProfiles(parseMonsterActions("Claws. Melee Weapon Attack: +0 to hit, reach 5 ft., one target. Hit: 1 slashing damage.").attacks)[0];
    expect(cat.dice).toBe("");
    expect(cat.modifier).toBe(1);
  });
});

describe("turns", () => {
  it("restores the action economy and speed", () => {
    const tired = cmb({ turn: { ...startTurn(30), action: false, movement: 0, reaction: false } });
    const { cmb: c } = beginTurn(tired);
    expect(c.turn).toMatchObject({ action: true, bonusAction: true, reaction: true, movement: 30 });
  });
  it("stunned creatures cannot act and grappled ones cannot move", () => {
    const stunned = beginTurn(cmb({ conditions: [{ condition: "stunned" }] }));
    expect(stunned.cmb.turn).toMatchObject({ action: false, bonusAction: false, reaction: false });
    expect(stunned.lines.join()).toMatch(/cannot act/);
    expect(beginTurn(cmb({ conditions: [{ condition: "grappled" }] })).cmb.turn.movement).toBe(0);
  });
  it("surprised creatures lose their first turn, then recover", () => {
    const first = beginTurn(cmb({ surprised: true }));
    expect(first.cmb.turn).toMatchObject({ action: false, reaction: false, movement: 0 });
    expect(finishTurn(first.cmb).cmb.surprised).toBe(false);
  });
  it("a dying character rolls a death save at the start of the turn", () => {
    const dying = cmb({ hp: 0 });
    const r = beginTurn(dying, face(20)); // natural 20
    expect(r.cmb.hp).toBe(1);
    expect(r.lines.join()).toMatch(/regains 1 HP/);
    const failing = beginTurn(dying, face(5));
    expect(failing.cmb.deathSaves.failures).toBe(1);
  });
  it("timers expire at the right moment", () => {
    const c = cmb({ conditions: [{ condition: "poisoned", rounds: 1 }, { condition: "prone" }] });
    const r = finishTurn(c);
    expect(r.cmb.conditions.map((x) => x.condition)).toEqual(["prone"]);
    expect(r.lines.join()).toMatch(/no longer poisoned/);
  });
  it("advances through the order, skipping the defeated", () => {
    const order = [{ id: "a", defeated: false }, { id: "b", defeated: true }, { id: "c", defeated: false }];
    expect(advance(order, 0, 1)).toEqual({ activeIndex: 2, round: 1 });
    expect(advance(order, 2, 1)).toEqual({ activeIndex: 0, round: 2 });
  });
  it("simple actions spend the action and set flags", () => {
    const { cmb: c } = spendSimpleAction(cmb(), "dodge");
    expect(c.turn).toMatchObject({ action: false, dodging: true });
    expect(() => spendSimpleAction(c, "dash")).toThrow(/No action/);
    expect(spendSimpleAction(cmb(), "dash").cmb.turn.movement).toBe(60);
    expect(() => spendSimpleAction(cmb({ conditions: [{ condition: "paralyzed" }] }), "dash")).toThrow(/cannot take actions/);
  });
});

describe("attacks", () => {
  it("hits, rolls damage, and spends the action", () => {
    const r = resolveAttackAction(cmb(), cmb({ id: "t", name: "Goblin", ac: 12, hp: 7, maxHp: 7, kind: "monster" }), sword, {}, face(12));
    expect(r.hit).toBe(true);
    expect(r.attacker.turn.action).toBe(false);
    expect(r.target.hp).toBeLessThan(7);
    expect(r.lines[0]).toMatch(/attacks Goblin with Longsword: hit/);
  });
  it("misses on a low roll and a natural 1 always misses", () => {
    expect(resolveAttackAction(cmb(), cmb({ id: "t", ac: 25 }), sword, {}, face(10)).hit).toBe(false);
    const nat1 = resolveAttackAction(cmb(), cmb({ id: "t", ac: 5 }), { ...sword, toHit: 30 }, {}, face(1));
    expect(nat1).toMatchObject({ hit: false, fumble: true });
  });
  it("a critical hit doubles the dice", () => {
    const r = resolveAttackAction(cmb(), cmb({ id: "t", ac: 30, hp: 100, maxHp: 100, kind: "monster" }), sword, {}, face(20));
    expect(r.critical).toBe(true);
    expect(r.lines[0]).toMatch(/CRITICAL HIT/);
  });
  it("monsters die at 0 HP, characters fall unconscious", () => {
    const big = { ...sword, dice: "", modifier: 50 };
    const monster = resolveAttackAction(cmb(), cmb({ id: "m", kind: "monster", hp: 5, maxHp: 5, ac: 5 }), big, {}, face(15));
    expect(monster.target).toMatchObject({ hp: 0, defeated: true });
    expect(monster.dropped).toBe(true);
    const pc = resolveAttackAction(cmb(), cmb({ id: "p", hp: 5, maxHp: 20, ac: 5 }), { ...big, modifier: 6 }, {}, face(15));
    expect(pc.target).toMatchObject({ hp: 0, defeated: false });
    expect(pc.lines.join()).toMatch(/falls unconscious/);
  });
  it("massive damage kills a character outright", () => {
    const r = resolveAttackAction(cmb(), cmb({ id: "p", hp: 5, maxHp: 20, ac: 5 }), { ...sword, dice: "", modifier: 40 }, {}, face(15));
    expect(r.target.defeated).toBe(true);
  });
  it("applies resistances", () => {
    const r = resolveAttackAction(cmb(), cmb({ id: "t", kind: "monster", hp: 50, maxHp: 50, ac: 5, defenses: { resistances: ["slashing"] } }), { ...sword, dice: "", modifier: 10 }, {}, face(15));
    expect(r.damage).toBe(5); // 10 halved
    expect(r.lines[0]).toMatch(/before resistances/);
  });
  it("Extra Attack: the first swing spends the action, the next is free, then no more", () => {
    const hero = cmb({ attacksPerAction: 2 });
    const target = cmb({ id: "t", kind: "monster", hp: 99, maxHp: 99, ac: 5 });
    const first = resolveAttackAction(hero, target, sword, {}, face(15));
    expect(first.attacker.turn).toMatchObject({ action: false, attacksRemaining: 1 });
    const second = resolveAttackAction(first.attacker, first.target, sword, {}, face(15));
    expect(second.attacker.turn.attacksRemaining).toBe(0);
    expect(() => resolveAttackAction(second.attacker, second.target, sword, {}, face(15))).toThrow(/No action/);
  });
  it("advantage sources: prone target up close, dodge, ranged at long range, hostile adjacent", () => {
    const target = (over: Partial<Cmb>) => cmb({ id: "t", kind: "monster", hp: 50, maxHp: 50, ac: 5, ...over });
    expect(resolveAttackAction(cmb(), target({ conditions: [{ condition: "prone" }] }), sword, { withinFiveFeet: true }, face(10)).mode).toBe("advantage");
    expect(resolveAttackAction(cmb(), target({ conditions: [{ condition: "prone" }] }), sword, { withinFiveFeet: false }, face(10)).mode).toBe("disadvantage");
    expect(resolveAttackAction(cmb(), target({ turn: { ...startTurn(30), dodging: true } }), sword, {}, face(10)).mode).toBe("disadvantage");
    expect(resolveAttackAction(cmb(), target({}), bow, { withinFiveFeet: false, distanceFeet: 300 }, face(10)).mode).toBe("disadvantage");
    expect(resolveAttackAction(cmb(), target({}), bow, { withinFiveFeet: true, distanceFeet: 5 }, face(10)).mode).toBe("disadvantage");
    expect(resolveAttackAction(cmb(), target({}), bow, { withinFiveFeet: false, distanceFeet: 100 }, face(10)).mode).toBe("normal");
  });
  it("advantage and disadvantage cancel", () => {
    const t = cmb({ id: "t", kind: "monster", ac: 5, conditions: [{ condition: "blinded" }], turn: { ...startTurn(30), dodging: true } });
    expect(resolveAttackAction(cmb({ conditions: [{ condition: "poisoned" }] }), t, sword, {}, face(10)).mode).toBe("normal");
  });
  it("out of range ranged attacks miss", () => {
    const r = resolveAttackAction(cmb(), cmb({ id: "t", ac: 1 }), bow, { withinFiveFeet: false, distanceFeet: 700 }, face(15));
    expect(r.hit).toBe(false);
  });
  it("underwater melee with a non-piercing weapon has disadvantage", () => {
    const t = cmb({ id: "t", kind: "monster", ac: 5 });
    expect(resolveAttackAction(cmb(), t, { ...sword, weapon: "Longsword" }, { underwater: true }, face(10)).mode).toBe("disadvantage");
    expect(resolveAttackAction(cmb(), t, { ...sword, weapon: "Spear" }, { underwater: true }, face(10)).mode).toBe("normal");
  });
  it("off-hand attacks use the bonus action and drop a positive modifier", () => {
    const dagger = { ...sword, dice: "1d4", modifier: 3, name: "Dagger" };
    const r = resolveAttackAction(cmb(), cmb({ id: "t", kind: "monster", hp: 50, maxHp: 50, ac: 5 }), dagger, { offHand: true }, face(15));
    expect(r.attacker.turn).toMatchObject({ bonusAction: false, action: true });
    expect(r.damage).toBeGreaterThanOrEqual(1); // 1d4 with no +3
    expect(r.damage).toBeLessThanOrEqual(4);
  });
  it("opportunity attacks use the reaction", () => {
    const r = resolveAttackAction(cmb(), cmb({ id: "t", kind: "monster", ac: 5 }), sword, { reaction: true }, face(15));
    expect(r.attacker.turn).toMatchObject({ reaction: false, action: true });
  });
  it("reports the concentration DC for a concentrating target", () => {
    const t = cmb({ id: "t", concentrating: "bless", ac: 5, hp: 50, maxHp: 50 });
    const r = resolveAttackAction(cmb(), t, { ...sword, dice: "", modifier: 30 }, {}, face(15));
    expect(r.concentrationDc).toBe(15);
  });
  it("defeated or incapacitated attackers cannot attack", () => {
    expect(() => resolveAttackAction(cmb({ defeated: true }), cmb({ id: "t" }), sword)).toThrow();
    expect(() => resolveAttackAction(cmb({ conditions: [{ condition: "stunned" }] }), cmb({ id: "t" }), sword)).toThrow();
  });
});

describe("grapple and shove", () => {
  const strong = cmb({ defenses: { athletics: 8 } });
  const weak = cmb({ id: "t", name: "Goblin", kind: "monster", dexMod: 0, defenses: { athletics: -1, acrobatics: 2 } });
  it("a successful grapple applies the condition", () => {
    const r = resolveGrappleAction(strong, weak, "grapple", { attacker: "medium", target: "small" }, face(10));
    expect(r.success).toBe(true);
    expect(r.target.conditions).toEqual([{ condition: "grappled", source: "c" }]);
    expect(r.attacker.turn.action).toBe(false);
  });
  it("a failed contest changes nothing", () => {
    const r = resolveGrappleAction(weak, strong, "grapple", { attacker: "small", target: "medium" }, face(10));
    expect(r.success).toBe(false);
    expect(r.target.conditions).toEqual([]);
  });
  it("shoving can knock prone, and the target cannot be too large", () => {
    expect(resolveGrappleAction(strong, weak, "shove-prone", { attacker: "medium", target: "small" }, face(10)).target.conditions[0].condition).toBe("prone");
    expect(() => resolveGrappleAction(strong, weak, "grapple", { attacker: "medium", target: "huge" })).toThrow(/too large/);
  });
});

describe("bonus damage dice (Sneak Attack, Divine Smite)", () => {
  it("adds each extra die pool on a hit, doubles it on a crit and respects its own damage type", () => {
    const hit = resolveAttackAction(cmb(), cmb({ id: "t", ac: 10, hp: 100, maxHp: 100 }), sword, { bonusDamage: [{ dice: "2d6", label: "Sneak Attack" }, { dice: "2d8", type: "radiant", label: "Divine Smite" }] }, face(15));
    expect(hit.hit).toBe(true);
    expect(hit.lines.join(" ")).toContain("Sneak Attack");
    expect(hit.lines.join(" ")).toContain("radiant from Divine Smite");
    const plain = resolveAttackAction(cmb(), cmb({ id: "t", ac: 10, hp: 100, maxHp: 100 }), sword, {}, face(15));
    expect(hit.damage).toBeGreaterThan(plain.damage);
  });
  it("radiant smite ignores slashing resistance and a miss adds nothing", () => {
    const resistant = cmb({ id: "t", ac: 10, hp: 100, maxHp: 100, defenses: { resistances: ["slashing"] } });
    const hit = resolveAttackAction(cmb(), resistant, sword, { bonusDamage: [{ dice: "2d8", type: "radiant", label: "Divine Smite" }] }, face(15));
    expect(hit.lines.join(" ")).toContain("before resistances");
    const miss = resolveAttackAction(cmb(), cmb({ id: "t", ac: 30 }), sword, { bonusDamage: [{ dice: "2d8", type: "radiant" }] }, face(2));
    expect(miss.damage).toBe(0);
  });
});
