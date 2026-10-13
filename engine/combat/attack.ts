import { parseDice, rollD20, rollExpression, cryptoRng, type D20Result, type Rng, type RollMode } from "../dice";

export type Cover = "none" | "half" | "three-quarters" | "total";

/** Cover bonus to AC and Dexterity saves (PHB p.196). Total cover blocks targeting. */
export function coverBonus(cover: Cover): number {
  switch (cover) {
    case "half": return 2;
    case "three-quarters": return 5;
    default: return 0;
  }
}

export type AttackInput = {
  attackBonus: number;
  targetAc: number;
  cover?: Cover;
  mode?: RollMode;
  /** hits within 5 ft on paralyzed/unconscious targets, etc. */
  autoCrit?: boolean;
  /** Champion's Improved Critical lowers the crit range to 19 */
  critRange?: number;
  rng?: Rng;
};

export type AttackResult = {
  roll: D20Result;
  effectiveAc: number;
  hit: boolean;
  critical: boolean;
  fumble: boolean;
};

/** Attack roll vs AC. A natural 20 always hits and a natural 1 always misses (PHB p.194). */
export function resolveAttack(input: AttackInput): AttackResult {
  const cover = input.cover ?? "none";
  if (cover === "total") throw new Error("A target with total cover cannot be targeted directly");
  const effectiveAc = input.targetAc + coverBonus(cover);
  const roll = rollD20(input.attackBonus, input.mode ?? "normal", input.rng ?? cryptoRng);
  const fumble = roll.natural === 1;
  const hit = !fumble && (roll.natural === 20 || roll.total >= effectiveAc || roll.natural >= (input.critRange ?? 20));
  const critical = hit && (roll.natural >= (input.critRange ?? 20) || !!input.autoCrit);
  return { roll, effectiveAc, hit, critical, fumble };
}

export type DamageRoll = { dice: string; total: number; critical: boolean };

/**
 * Roll weapon damage. On a critical hit all damage dice are rolled twice; the modifier is added once (PHB p.196).
 * `extraDice` covers Sneak Attack, Divine Smite and similar bonus dice, which also double.
 */
export function rollDamage(damage: string, modifier = 0, opts: { critical?: boolean; extraDice?: string[]; rng?: Rng } = {}): DamageRoll {
  const rng = opts.rng ?? cryptoRng;
  const expressions = [damage, ...(opts.extraDice ?? [])];
  let total = modifier;
  const rolled: string[] = [];
  for (const e of expressions) {
    const parsed = parseDice(e);
    const doubled = {
      ...parsed,
      terms: parsed.terms.map((t) => ({ ...t, count: opts.critical ? t.count * 2 : t.count })),
    };
    total += rollExpression(doubled, rng).total;
    rolled.push(opts.critical ? doubled.terms.map((t) => `${t.count}d${t.sides}`).join("+") : e);
  }
  return { dice: rolled.join("+") + (modifier ? `${modifier >= 0 ? "+" : ""}${modifier}` : ""), total: Math.max(0, total), critical: !!opts.critical };
}

/** Off-hand attacks add no ability modifier to damage unless it is negative (PHB p.195), unless Two-Weapon Fighting style. */
export function offHandModifier(abilityModifier: number, twoWeaponFightingStyle = false): number {
  return twoWeaponFightingStyle || abilityModifier < 0 ? abilityModifier : 0;
}

export type RangeInfo = { disadvantage: boolean; outOfRange: boolean };

/** Ranged attacks: long range gives disadvantage, beyond it is impossible; a hostile within 5 ft gives disadvantage (PHB p.195). */
export function rangeModifier(distanceFeet: number, range: { normal: number; long: number }, hostileWithinFiveFeet = false): RangeInfo {
  if (distanceFeet > range.long) return { disadvantage: true, outOfRange: true };
  return { disadvantage: distanceFeet > range.normal || hostileWithinFiveFeet, outOfRange: false };
}

export const SIZES = ["tiny", "small", "medium", "large", "huge", "gargantuan"] as const;
export type Size = (typeof SIZES)[number];

/** A grapple or shove target can be at most one size larger than the attacker (PHB p.195). */
export function canGrappleOrShove(attacker: Size, target: Size): boolean {
  return SIZES.indexOf(target) <= SIZES.indexOf(attacker) + 1;
}

export type ContestResult = { attackerTotal: number; defenderTotal: number; attackerWins: boolean };

/** Contested check for grapple/shove: attacker's Athletics vs the better of the defender's Athletics or Acrobatics. */
export function resolveGrappleOrShove(
  attacker: { athletics: number; mode?: RollMode },
  defender: { athletics: number; acrobatics: number; mode?: RollMode },
  rng: Rng = cryptoRng,
): ContestResult {
  const a = rollD20(attacker.athletics, attacker.mode ?? "normal", rng).total;
  const d = rollD20(Math.max(defender.athletics, defender.acrobatics), defender.mode ?? "normal", rng).total;
  return { attackerTotal: a, defenderTotal: d, attackerWins: a > d };
}

/** Shove outcome chosen by the attacker on success: knock prone or push 5 feet away. */
export type ShoveChoice = "prone" | "push";

/** Escape a grapple: Athletics or Acrobatics vs the grappler's Athletics (uses an action). */
export function escapeGrapple(
  escaper: { athletics: number; acrobatics: number },
  grappler: { athletics: number },
  rng: Rng = cryptoRng,
): boolean {
  const e = rollD20(Math.max(escaper.athletics, escaper.acrobatics), "normal", rng).total;
  const g = rollD20(grappler.athletics, "normal", rng).total;
  return e >= g;
}
