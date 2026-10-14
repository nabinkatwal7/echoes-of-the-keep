import { areaSquares, creaturesInArea } from "@/engine/combat/area";
import { distanceFeet, type Point } from "@/engine/combat/grid";
import type { SpellEffect } from "@/engine/spells/effects";
import { projectileCount, scaledDice } from "@/engine/spells/effects";
import { approach, averageDamage, expectedDamage, hitChance, planMonsterTurn } from "./ai";
import type { AttackProfile, Cmb } from "./rules";

/** A spell the hero can cast now, with its parsed mechanics. */
export type SpellOption = {
  index: string;
  name: string;
  level: number;
  time: "action" | "bonus" | "reaction" | "long";
  concentration: boolean;
  effect: SpellEffect;
  mode: string;
};

export type HeroStep =
  | { kind: "move"; to: Point }
  | { kind: "cast"; spell: string; slotLevel: number; targetIds: string[]; point?: Point; note: string }
  | { kind: "attack"; targetId: string; attack: string; times: number; note: string }
  | { kind: "dodge"; note: string };

export type HeroPlanInput = {
  self: Cmb;
  allies: Cmb[];
  foes: Cmb[];
  profiles: AttackProfile[];
  spells: SpellOption[];
  /** spell slots left by level, from 1; pact slots count at their level */
  slotsLeft: Record<number, number>;
  spellAttackBonus: number;
  saveDc: number;
  castMod: number;
  round: number;
  occupied: ReadonlySet<string>;
  width: number;
  height: number;
};

const ratio = (c: Cmb) => c.hp / Math.max(1, c.maxHp);
const at = (c: Cmb): Point | null => (c.x !== null && c.y !== null ? { x: c.x, y: c.y } : null);

/** The lowest slot that can cast the spell, or null. Cantrips need none. */
export function slotFor(spell: SpellOption, slotsLeft: Record<number, number>): number | null {
  if (spell.level === 0) return 0;
  for (let l = spell.level; l <= 9; l++) if ((slotsLeft[l] ?? 0) > 0) return l;
  return null;
}

function expectedSpellDamage(s: SpellOption, slot: number, foe: Cmb, input: HeroPlanInput): number {
  const e = s.effect;
  if (!e.damage) return 0;
  const dice = scaledDice(e.damage.dice, e, s.level, slot, input.self.maxHp ? casterLevelGuess(input) : 1);
  const avg = averageDamage({ dice, modifier: e.damage.flat });
  const n = projectileCount(e, s.level, slot);
  if (e.delivery === "auto") return avg * n;
  if (e.delivery === "attack") return hitChance(input.spellAttackBonus, foe.ac) * avg * n;
  if (e.delivery === "save" && e.save) {
    const bonus = foe.defenses.saves?.[e.save] ?? (e.save === "dex" ? foe.dexMod : 0);
    const pass = Math.min(0.95, Math.max(0.05, (21 - (input.saveDc - bonus)) / 20));
    return avg * ((1 - pass) + (e.halfOnSave ? pass / 2 : 0));
  }
  return 0;
}

// Cantrip scaling depends on character level, which the plan input does not carry; the numbers only rank options.
const casterLevelGuess = (input: HeroPlanInput) => Math.max(1, Math.min(20, Math.round(input.self.maxHp / 9)));

const areaSpec = (a: NonNullable<SpellEffect["area"]>) =>
  a.shape === "sphere" || a.shape === "cylinder" ? ({ shape: a.shape, radius: a.size } as const)
  : a.shape === "cube" ? ({ shape: "cube", side: a.size } as const)
  : a.shape === "cone" ? ({ shape: "cone", length: a.size } as const)
  : ({ shape: "line", length: a.size, width: a.width ?? 5 } as const);

/** Decide a hero's turn: heal the hurt, burn the pack with an area spell, then pick the best single attack or spell. */
export function planHeroTurn(input: HeroPlanInput): { steps: HeroStep[]; note: string } {
  const { self } = input;
  const me = at(self);
  const steps: HeroStep[] = [];
  const foes = input.foes.filter((f) => !f.defeated && f.hp > 0 && at(f));
  if (!me) return { steps: [{ kind: "dodge", note: `${self.name} waits` }], note: "not on the map" };
  if (!foes.length) return { steps, note: "no foes" };

  const everyone = [self, ...input.allies];
  const castable = input.spells.map((s) => ({ s, slot: slotFor(s, input.slotsLeft) })).filter((x): x is { s: SpellOption; slot: number } => x.slot !== null && x.s.time !== "long" && x.s.time !== "reaction");
  const canConcentrate = !self.concentrating;
  let usedBonus = false;
  let usedAction = false;

  // 1. someone is down or badly hurt: heal them (a bonus action spell first, so the action stays free)
  const hurt = everyone.filter((c) => !c.defeated && ratio(c) <= 0.35 && at(c)).sort((a, b) => ratio(a) - ratio(b))[0];
  if (hurt) {
    const heals = castable.filter((x) => x.s.mode === "heal");
    const bonus = heals.find((x) => x.s.time === "bonus");
    const action = heals.find((x) => x.s.time === "action");
    for (const pick of [bonus, action]) {
      if (!pick) continue;
      if ((pick.s.time === "bonus" && usedBonus) || (pick.s.time === "action" && usedAction)) continue;
      const range = pick.s.effect.range.kind === "touch" ? 5 : pick.s.effect.range.feet;
      const target = at(hurt)!;
      if (distanceFeet(me, target) > range) {
        const step = approach(me, target, range, Math.floor(self.turn.movement / 5), input.occupied, input.width, input.height);
        if (!step) continue;
        steps.push({ kind: "move", to: step });
      }
      steps.push({ kind: "cast", spell: pick.s.index, slotLevel: pick.slot, targetIds: [hurt.id], note: `${self.name} tends to ${hurt.name}` });
      if (pick.s.time === "bonus") {
        usedBonus = true;
        break; // one heal a turn: the action is free for the fight
      }
      usedAction = true;
      return { steps, note: "heals" };
    }
  }

  // 2. a buff on the first round for the whole party
  if (input.round <= 1 && canConcentrate && !usedAction) {
    const buff = castable.find((x) => x.s.index === "bless" && x.s.time === "action");
    const near = input.allies.filter((a) => !a.defeated && at(a) && distanceFeet(me, at(a)!) <= 30).slice(0, 2);
    if (buff && near.length >= 1) {
      steps.push({ kind: "cast", spell: buff.s.index, slotLevel: buff.slot, targetIds: [self.id, ...near.map((n) => n.id)], note: `${self.name} blesses the party` });
      usedAction = true;
    }
  }

  // 3. an area spell that catches two or more foes and no friends
  if (!usedAction) {
    let best: { x: { s: SpellOption; slot: number }; score: number; point: Point; ids: string[] } | null = null;
    for (const x of castable.filter((c) => c.s.effect.area && c.s.mode === "save" && c.s.time === "action" && (!c.s.concentration || canConcentrate))) {
      if (x.s.level > 0 && x.slot > x.s.level + 1) continue; // do not spend a big slot on a small spell
      const area = x.s.effect.area!;
      const spec = areaSpec(area);
      for (const f of foes) {
        const aim = at(f)!;
        const origin = area.fromSelf ? me : aim;
        if (!area.fromSelf && distanceFeet(me, aim) > x.s.effect.range.feet) continue;
        const squares = areaSquares(spec, origin, aim, { width: input.width, height: input.height, fromSelf: area.fromSelf });
        const hitFoes = creaturesInArea(squares, foes, area.fromSelf ? self.id : undefined);
        const hitFriends = creaturesInArea(squares, everyone.filter((c) => !c.defeated), area.fromSelf ? self.id : undefined);
        if (hitFoes.length < 2 || hitFriends.length > 0) continue;
        const score = hitFoes.reduce((s, t) => s + expectedSpellDamage(x.s, x.slot, t, input), 0);
        if (!best || score > best.score) best = { x, score, point: aim, ids: hitFoes.map((t) => t.id) };
      }
    }
    if (best) {
      steps.push({ kind: "cast", spell: best.x.s.index, slotLevel: best.x.slot, targetIds: [], point: best.point, note: `${self.name} casts ${best.x.s.name} on ${best.ids.length} foes` });
      return { steps, note: "area spell" };
    }
  }

  // 4. the best single-target attack: a spell or a weapon
  const weapon = planMonsterTurn({
    self: { id: self.id, name: self.name, x: self.x, y: self.y, turn: self.turn, attacksPerAction: self.attacksPerAction },
    profiles: input.profiles, foes, occupied: input.occupied, width: input.width, height: input.height,
  });
  const weaponTarget = weapon.kind === "attack" ? foes.find((f) => f.id === weapon.targetId) : undefined;
  const weaponScore = weapon.kind === "attack" && weaponTarget && weapon.attacks > 0
    ? (input.profiles.find((p) => p.name === weapon.attack) ? expectedDamage(input.profiles.find((p) => p.name === weapon.attack)!, weaponTarget.ac) * weapon.attacks : 0)
    : 0;

  let spellPick: { x: { s: SpellOption; slot: number }; target: Cmb; score: number } | null = null;
  if (!usedAction) {
    for (const x of castable.filter((c) => c.s.time === "action" && ["attack", "auto", "save"].includes(c.s.mode) && !c.s.effect.area && c.s.effect.damage && (!c.s.concentration || canConcentrate))) {
      if (x.s.level > 0 && x.slot > x.s.level + 1) continue;
      for (const f of foes) {
        const range = x.s.effect.range.kind === "touch" ? 5 : x.s.effect.range.feet;
        const dist = distanceFeet(me, at(f)!);
        const reachable = dist <= range || approach(me, at(f)!, range, Math.floor(self.turn.movement / 5), input.occupied, input.width, input.height) !== null;
        if (!reachable) continue;
        // slots are for fights that matter: a leveled spell must clearly beat the alternatives
        const penalty = x.s.level > 0 ? 0.85 : 1;
        const score = expectedSpellDamage(x.s, x.slot, f, input) * penalty + (f.hp <= 5 ? 5 : 0);
        if (!spellPick || score > spellPick.score) spellPick = { x, target: f, score };
      }
    }
  }

  const caster = input.profiles.length === 0 || (spellPick !== null && spellPick.score > weaponScore);
  if (spellPick && caster) {
    const range = spellPick.x.s.effect.range.kind === "touch" ? 5 : spellPick.x.s.effect.range.feet;
    const tp = at(spellPick.target)!;
    if (distanceFeet(me, tp) > range) {
      const step = approach(me, tp, range, Math.floor(self.turn.movement / 5), input.occupied, input.width, input.height);
      if (step) steps.push({ kind: "move", to: step });
    }
    steps.push({ kind: "cast", spell: spellPick.x.s.index, slotLevel: spellPick.x.slot, targetIds: [spellPick.target.id], note: `${self.name} casts ${spellPick.x.s.name} at ${spellPick.target.name}` });
    return { steps, note: "spell" };
  }

  if (weapon.kind === "attack") {
    if (weapon.moveTo) steps.push({ kind: "move", to: weapon.moveTo });
    if (weapon.attacks > 0 && !usedAction) steps.push({ kind: "attack", targetId: weapon.targetId, attack: weapon.attack, times: weapon.attacks, note: weapon.note });
    return { steps, note: "weapon" };
  }
  if (!usedAction) steps.push({ kind: "dodge", note: `${self.name} takes the Dodge action` });
  return { steps, note: "dodge" };
}
