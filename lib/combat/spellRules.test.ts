import { describe, expect, it } from "vitest";
import { startTurn } from "@/engine/combat";
import { parseSpellEffect } from "@/engine/spells/effects";
import { counterspell, dropConcentration, resolveSpell } from "./spellRules";
import { beginTurn, effectiveAc, type Cmb } from "./rules";

const cmb = (over: Partial<Cmb> = {}): Cmb => ({
  id: "c", kind: "character", name: "Hero", ac: 15, hp: 30, maxHp: 30, tempHp: 0, speed: 30, initiative: 10, dexMod: 2,
  conditions: [], hidden: false, surprised: false, defeated: false, deathSaves: { successes: 0, failures: 0 },
  turn: startTurn(30), x: 0, y: 0, defenses: {}, ...over,
});

// every die returns the same fraction: face(20) makes d20 = 20 and d6 = 6; face(1) makes everything 1
const face = (n: number) => () => (n - 0.5) / 20;
const high = () => 0.999;
const low = () => 0;

const fireball = parseSpellEffect({
  level: 3, range: "150 feet", duration: "Instantaneous", concentration: false,
  description: "Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.",
  higherLevels: "the damage increases by 1d6 for each slot level above 3rd.",
});
const meta = (o: object) => ({ index: "x", name: "X", level: 1, concentration: false, ...o });
const base = { casterLevel: 5, castMod: 3, attackBonus: 6, saveDc: 14 };

describe("save spells", () => {
  it("deals full damage on a failed save and half on a success", () => {
    const caster = cmb({ id: "mage", name: "Mage" });
    const weak = cmb({ id: "a", name: "Goblin", hp: 100, maxHp: 100, defenses: { saves: { dex: -5 } } });
    const nimble = cmb({ id: "b", name: "Cat", hp: 100, maxHp: 100, defenses: { saves: { dex: 20 } } });
    const out = resolveSpell({ ...base, caster, targets: [weak, nimble], spell: meta({ index: "fireball", name: "Fireball", level: 3 }), effect: fireball, slotLevel: 3, rng: face(10) });
    // 8d6 with every die at 3 or 4: both take the same roll, one halved
    const a = out.targets.find((t) => t.id === "a")!;
    const b = out.targets.find((t) => t.id === "b")!;
    const fullDamage = 100 - a.hp;
    expect(fullDamage).toBeGreaterThan(0);
    expect(100 - b.hp).toBe(Math.floor(fullDamage / 2));
  });

  it("upcasting adds dice", () => {
    const t = () => [cmb({ id: "a", name: "T", hp: 500, maxHp: 500, defenses: { saves: { dex: -20 } } })];
    const at3 = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: t(), spell: meta({ level: 3, name: "Fireball" }), effect: fireball, slotLevel: 3, rng: high });
    const at5 = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: t(), spell: meta({ level: 3, name: "Fireball" }), effect: fireball, slotLevel: 5, rng: high });
    expect(500 - at3.targets[0].hp).toBe(48);
    expect(500 - at5.targets[0].hp).toBe(60);
  });

  it("applies resistance, and paralyzed creatures auto-fail Dexterity saves", () => {
    const fireProof = cmb({ id: "a", hp: 100, maxHp: 100, defenses: { saves: { dex: -20 }, resistances: ["fire"] } });
    const held = cmb({ id: "b", hp: 100, maxHp: 100, defenses: { saves: { dex: 20 } }, conditions: [{ condition: "paralyzed" }] });
    const out = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: [fireProof, held], spell: meta({ level: 3, name: "Fireball" }), effect: fireball, slotLevel: 3, rng: high });
    expect(100 - out.targets[0].hp).toBe(24);
    expect(100 - out.targets[1].hp).toBe(48);
  });

  it("imposes a timed condition and starts concentration", () => {
    const hold = parseSpellEffect({ level: 2, range: "60 feet", duration: "Concentration, up to 1 minute", concentration: true, higherLevels: "", description: "The target must succeed on a Wisdom saving throw or be paralyzed for the duration." });
    const out = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: [cmb({ id: "t", defenses: { saves: { wis: -20 } } })], spell: meta({ index: "hold-person", name: "Hold Person", level: 2, concentration: true }), effect: hold, slotLevel: 2, rng: low });
    expect(out.targets[0].conditions).toEqual([{ condition: "paralyzed", rounds: 10, source: "spell:m:hold-person" }]);
    expect(out.caster.concentrating).toBe("Hold Person");
    // dropping concentration lifts it
    const dropped = dropConcentration([out.caster, out.targets[0]], "m");
    expect(dropped.all[1].conditions).toEqual([]);
    expect(dropped.all[0].concentrating).toBeNull();
  });
});

describe("attack, auto-hit and healing spells", () => {
  const fireBolt = parseSpellEffect({ level: 0, range: "120 feet", duration: "Instantaneous", concentration: false, higherLevels: "", description: "Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage. This spell’s damage increases by 1d10 when you reach 5th level (2 d10), 11th level (3 d10), and 17th level (4 d10)." });

  it("a spell attack rolls against AC and scales by character level", () => {
    const target = cmb({ id: "t", ac: 12, hp: 100, maxHp: 100 });
    const out = resolveSpell({ ...base, casterLevel: 5, caster: cmb({ id: "m" }), targets: [target], spell: meta({ level: 0, name: "Fire Bolt" }), effect: fireBolt, slotLevel: 0, distanceTo: () => 30, rng: high });
    expect(out.targets[0].hp).toBe(100 - 40 * 0 - 2 * 10 * 2); // natural 20 crits: 2d10 doubled to 4d10 at max = 40
    expect(out.lines.join(" ")).toContain("CRITICAL HIT");
  });

  it("misses cost nothing but a line in the log; targets beyond range are out of reach", () => {
    const far = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: [cmb({ id: "t", hp: 50 })], spell: meta({ level: 0, name: "Fire Bolt" }), effect: fireBolt, slotLevel: 0, distanceTo: () => 500, rng: high });
    expect(far.targets[0].hp).toBe(50);
  });

  it("magic missile never misses and adds darts with slot level", () => {
    const mm = parseSpellEffect({ level: 1, range: "120 feet", duration: "Instantaneous", concentration: false, description: "You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target.", higherLevels: "the spell creates one more dart for each slot level above 1st." });
    const out = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: [cmb({ id: "a", hp: 100, maxHp: 100 }), cmb({ id: "b", hp: 100, maxHp: 100 })], spell: meta({ name: "Magic Missile" }), effect: mm, slotLevel: 2, rng: high });
    // 4 darts at 5 each (max 1d4 + 1), alternating: a gets 2, b gets 2
    expect(out.targets.map((t) => 100 - t.hp)).toEqual([10, 10]);
  });

  it("healing adds the casting modifier and cannot exceed max HP", () => {
    const cure = parseSpellEffect({ level: 1, range: "Touch", duration: "Instantaneous", concentration: false, description: "A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier.", higherLevels: "the healing increases by 1d8 for each slot level above 1st." });
    const hurt = cmb({ id: "t", hp: 0, maxHp: 30 });
    const out = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: [hurt], spell: meta({ name: "Cure Wounds" }), effect: cure, slotLevel: 2, rng: high });
    expect(out.targets[0].hp).toBe(19); // 2d8 at 8 + 3
    const near = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: [cmb({ id: "t", hp: 28, maxHp: 30 })], spell: meta({ name: "Cure Wounds" }), effect: cure, slotLevel: 1, rng: high });
    expect(near.targets[0].hp).toBe(30);
  });
});

describe("buffs and reactions", () => {
  const none = parseSpellEffect({ level: 1, range: "Self", duration: "1 round", concentration: false, higherLevels: "", description: "An invisible barrier of magical force appears and protects you." });

  it("Shield adds 5 AC until the start of the caster's next turn", () => {
    const out = resolveSpell({ ...base, caster: cmb({ id: "m", ac: 12 }), targets: [], spell: meta({ index: "shield", name: "Shield" }), effect: none, slotLevel: 1, rng: low });
    expect(effectiveAc(out.caster)).toBe(17);
    const next = beginTurn(out.caster);
    expect(effectiveAc(next.cmb)).toBe(12);
    expect(next.lines.join(" ")).toContain("fades");
  });

  it("Bless adds a d4 to attacks for each blessed ally", () => {
    const bless = parseSpellEffect({ level: 1, range: "30 feet", duration: "Concentration, up to 1 minute", concentration: true, higherLevels: "", description: "You bless up to three creatures of your choice within range." });
    const out = resolveSpell({ ...base, caster: cmb({ id: "m" }), targets: [cmb({ id: "a" }), cmb({ id: "b" })], spell: meta({ index: "bless", name: "Bless", concentration: true }), effect: bless, slotLevel: 1, rng: low });
    expect(out.targets.every((t) => t.buffs?.some((b) => b.attackDie === 4))).toBe(true);
    expect(out.caster.concentrating).toBe("Bless");
    const cleared = dropConcentration([out.caster, ...out.targets], "m");
    expect(cleared.all.every((c) => !(c.buffs ?? []).length)).toBe(true);
  });

  it("Counterspell: automatic against a spell no higher than its slot, otherwise a check", () => {
    expect(counterspell(3, 3, 0).success).toBe(true);
    expect(counterspell(3, 5, 3, () => 0.999).success).toBe(true); // 20 + 3 vs DC 15
    expect(counterspell(3, 5, 3, () => 0).success).toBe(false); // 1 + 3 vs DC 15
  });
});
