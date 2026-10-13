import type { Ability } from "../abilities";

/** The 15 PHB conditions (Appendix A). Exhaustion is tracked as a level 0-6 separately. */
export const CONDITIONS = [
  "blinded",
  "charmed",
  "deafened",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
] as const;

export type Condition = (typeof CONDITIONS)[number];
export type ConditionSet = ReadonlySet<Condition>;

const has = (c: ConditionSet, ...names: Condition[]) =>
  names.some((n) => c.has(n));

/** Conditions that include "incapacitated": no actions or reactions. */
export function cannotAct(c: ConditionSet): boolean {
  return has(
    c,
    "incapacitated",
    "paralyzed",
    "petrified",
    "stunned",
    "unconscious",
  );
}

/** Conditions that stop all movement. Grappled/restrained set speed to 0 (see effectiveSpeed). */
export function cannotMove(c: ConditionSet): boolean {
  return has(
    c,
    "paralyzed",
    "petrified",
    "stunned",
    "unconscious",
    "grappled",
    "restrained",
  );
}

/** Automatic failure on Strength and Dexterity saving throws. */
export function autoFailsSave(c: ConditionSet, ability: Ability): boolean {
  return (
    (ability === "str" || ability === "dex") &&
    has(c, "paralyzed", "petrified", "stunned", "unconscious")
  );
}

export function autoFailsCheck(
  c: ConditionSet,
  requires: "sight" | "hearing",
): boolean {
  return requires === "sight" ? c.has("blinded") : c.has("deafened");
}

export type AttackContext = {
  attacker: ConditionSet;
  target: ConditionSet;
  /** attacker is within 5 feet of the target */
  withinFiveFeet: boolean;
  attackerExhaustion?: number;
  /** a frightened attacker has disadvantage only while the source of fear is in sight */
  fearSourceInSight?: boolean;
  /** attacker can see the target (an invisible target is unseen unless detected) */
  attackerCanSeeTarget?: boolean;
};

export type AttackModifiers = {
  advantage: number;
  disadvantage: number;
  autoCrit: boolean;
};

/** Advantage/disadvantage sources and auto-crit from conditions on an attack roll (App. A). */
export function attackModifiers(ctx: AttackContext): AttackModifiers {
  const { attacker, target } = ctx;
  let advantage = 0;
  let disadvantage = 0;

  if (has(attacker, "blinded", "poisoned", "prone", "restrained"))
    disadvantage++;
  if (attacker.has("frightened") && ctx.fearSourceInSight !== false)
    disadvantage++;
  if ((ctx.attackerExhaustion ?? 0) >= 3) disadvantage++;
  if (attacker.has("invisible")) advantage++;

  if (
    has(
      target,
      "blinded",
      "restrained",
      "stunned",
      "paralyzed",
      "petrified",
      "unconscious",
    )
  )
    advantage++;
  if (target.has("invisible") && ctx.attackerCanSeeTarget !== true)
    disadvantage++;
  if (target.has("prone")) ctx.withinFiveFeet ? advantage++ : disadvantage++;

  const autoCrit =
    ctx.withinFiveFeet && has(target, "paralyzed", "unconscious");
  return { advantage, disadvantage, autoCrit };
}

/** Disadvantage on ability checks from conditions and exhaustion level 1+. */
export function abilityCheckDisadvantage(
  c: ConditionSet,
  exhaustion = 0,
  fearSourceInSight = true,
): boolean {
  return (
    c.has("poisoned") ||
    (c.has("frightened") && fearSourceInSight) ||
    exhaustion >= 1
  );
}

/** Exhaustion level 3+ gives disadvantage on saving throws. */
export function saveDisadvantage(exhaustion = 0): boolean {
  return exhaustion >= 3;
}

/** Walking speed after conditions and exhaustion (levels 2 halves, 5 sets to 0). */
export function effectiveSpeed(
  baseSpeed: number,
  c: ConditionSet,
  exhaustion = 0,
): number {
  if (cannotMove(c) || exhaustion >= 5) return 0;
  return exhaustion >= 2 ? Math.floor(baseSpeed / 2) : baseSpeed;
}

/** Exhaustion level 4+ halves the hit point maximum. */
export function maxHpFactor(exhaustion = 0): number {
  return exhaustion >= 4 ? 0.5 : 1;
}

export const exhaustionKills = (exhaustion: number) => exhaustion >= 6;

/** Petrified creatures resist all damage and are immune to poison and disease. */
export function resistsAllDamage(c: ConditionSet): boolean {
  return c.has("petrified");
}

/** Add exhaustion levels, capped at 6 (death). */
export const addExhaustion = (current: number, levels = 1) =>
  Math.min(6, current + levels);
