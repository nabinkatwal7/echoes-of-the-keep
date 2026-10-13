import { abilityModifier, type Ability } from "../abilities";
import { cryptoRng, rollD20, type Rng, type RollMode } from "../dice";

// ---------------------------------------------------------------- spellcasting numbers (PHB p.205)

export const spellSaveDc = (prof: number, castingAbilityScore: number) => 8 + prof + abilityModifier(castingAbilityScore);
export const spellAttackBonus = (prof: number, castingAbilityScore: number) => prof + abilityModifier(castingAbilityScore);

export const CASTING_ABILITY: Record<string, Ability> = {
  bard: "cha", cleric: "wis", druid: "wis", paladin: "cha", ranger: "wis", sorcerer: "cha", warlock: "cha", wizard: "int",
};

/** Number of spells a prepared caster can prepare (PHB class descriptions); at least 1. */
export function preparedSpellCount(classIndex: string, classLevel: number, castingScore: number): number {
  const mod = abilityModifier(castingScore);
  switch (classIndex) {
    case "cleric":
    case "druid":
    case "wizard":
      return Math.max(1, mod + classLevel);
    case "paladin":
      return Math.max(1, mod + Math.floor(classLevel / 2));
    default:
      throw new Error(`${classIndex} does not prepare spells from a list`);
  }
}

/** Cantrip damage dice multiplier by character level: 1 (levels 1-4), 2, 3, 4 (PHB p.201). */
export const cantripDiceMultiplier = (characterLevel: number) => (characterLevel >= 17 ? 4 : characterLevel >= 11 ? 3 : characterLevel >= 5 ? 2 : 1);

// ---------------------------------------------------------------- slots

export type SlotState = {
  /** total slots by spell level, index 0 = 1st level */
  total: readonly number[];
  /** expended slots by spell level */
  used: readonly number[];
};

export const slotsAvailable = (s: SlotState, level: number) => (s.total[level - 1] ?? 0) - (s.used[level - 1] ?? 0);

/** Lowest slot level at or above `minLevel` with a slot left, or null. */
export function lowestAvailableSlot(s: SlotState, minLevel: number): number | null {
  for (let l = Math.max(1, minLevel); l <= s.total.length; l++) if (slotsAvailable(s, l) > 0) return l;
  return null;
}

export function spendSlot(s: SlotState, level: number): SlotState {
  if (slotsAvailable(s, level) <= 0) throw new Error(`No level ${level} spell slots left`);
  const used = [...s.used];
  used[level - 1] = (used[level - 1] ?? 0) + 1;
  while (used.length < s.total.length) used.push(0);
  return { ...s, used };
}

// ---------------------------------------------------------------- casting rules

export type SpellInfo = {
  name: string;
  level: number;
  /** "1 action", "1 bonus action", "1 reaction", "1 minute", ... */
  castingTime: string;
  components: string;
  ritual?: boolean;
  concentration?: boolean;
};

export type CastingTimeKind = "action" | "bonus" | "reaction" | "long";

export function castingTimeKind(castingTime: string): CastingTimeKind {
  const t = castingTime.toLowerCase();
  if (t.includes("bonus action")) return "bonus";
  if (t.includes("reaction")) return "reaction";
  if (t.startsWith("1 action")) return "action";
  return "long"; // minutes or hours
}

export type CasterContext = {
  /** a spell was already cast this turn with a bonus action */
  castBonusActionSpell?: boolean;
  /** a spell other than a cantrip was already cast this turn */
  castLeveledSpell?: boolean;
  silenced?: boolean;
  /** hands: has a free hand for somatic components */
  freeHand?: boolean;
  /** has a component pouch or suitable focus */
  hasFocusOrPouch?: boolean;
  /** carries the specific costly material, if the spell needs one */
  hasCostlyMaterial?: boolean;
  inCombat?: boolean;
};

export type CastCheck = { ok: true } | { ok: false; reason: string };

/**
 * Can this spell be cast now? Covers the bonus-action rule (PHB p.202), components, long casting times in combat.
 * Slots are checked separately with `lowestAvailableSlot`.
 */
export function checkCasting(spell: SpellInfo, ctx: CasterContext = {}): CastCheck {
  const kind = castingTimeKind(spell.castingTime);
  if (kind === "long" && ctx.inCombat) return { ok: false, reason: "Casting times over 1 action take too long in combat" };

  // a spell cast as a bonus action limits other spells that turn to cantrips with a casting time of 1 action
  if (kind === "bonus" && ctx.castLeveledSpell) {
    return { ok: false, reason: "You cannot cast a bonus action spell after casting another leveled spell this turn" };
  }
  if (kind !== "bonus" && ctx.castBonusActionSpell && spell.level > 0) {
    return { ok: false, reason: "After casting a bonus action spell you can only cast a cantrip with your action" };
  }

  const comps = spell.components.toUpperCase();
  const needs = (c: "V" | "S" | "M") => new RegExp(`(^|[ ,])${c}([ ,(]|$)`).test(comps);
  if (needs("V") && ctx.silenced) return { ok: false, reason: "Verbal components require speech" };
  if (needs("S") && ctx.freeHand === false) return { ok: false, reason: "Somatic components need a free hand" };
  if (needs("M")) {
    const costly = /\d[\d,]*\s?(gp|sp|cp|pp)/i.test(spell.components);
    if (costly && ctx.hasCostlyMaterial === false) return { ok: false, reason: "Missing the costly material component" };
    if (!costly && ctx.hasFocusOrPouch === false) return { ok: false, reason: "No component pouch or spellcasting focus" };
  }
  return { ok: true };
}

/** Ritual casting takes 10 extra minutes and no slot, only if the class can ritual cast (PHB p.202). */
export function canCastAsRitual(spell: SpellInfo, classCanRitualCast: boolean, inCombat = false): boolean {
  return !!spell.ritual && classCanRitualCast && !inCombat;
}

// ---------------------------------------------------------------- concentration (PHB p.203)

export type Concentration = { spell: string } | null;

/** Starting a new concentration spell ends the previous one. */
export function beginConcentration(current: Concentration, spell: string): { state: Concentration; ended: string | null } {
  return { state: { spell }, ended: current?.spell ?? null };
}

/** Constitution save DC to keep concentration after damage: 10 or half the damage, whichever is higher. */
export const concentrationDc = (damage: number) => Math.max(10, Math.floor(damage / 2));

export type ConcentrationCheck = { maintained: boolean; roll: number; dc: number };

export function checkConcentration(
  damage: number,
  conSaveBonus: number,
  opts: { mode?: RollMode; rng?: Rng } = {},
): ConcentrationCheck {
  const dc = concentrationDc(damage);
  const roll = rollD20(conSaveBonus, opts.mode ?? "normal", opts.rng ?? cryptoRng).total;
  return { maintained: roll >= dc, roll, dc };
}

/** Concentration ends automatically when incapacitated or killed. */
export const concentrationBrokenByCondition = (incapacitated: boolean, dead: boolean) => incapacitated || dead;

// ---------------------------------------------------------------- sorcery points (PHB p.101)

const SLOT_POINT_COST: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 };

/** Sorcery point cost to create a spell slot of the given level (levels 1-5 only). */
export function slotCreationCost(level: number): number {
  const cost = SLOT_POINT_COST[level];
  if (!cost) throw new RangeError("Flexible Casting can create slots of levels 1-5 only");
  return cost;
}

/** Converting a spell slot to sorcery points yields points equal to the slot level. */
export const slotToPoints = (level: number) => level;

/** Sorcerer sorcery points equal their level (from level 2). */
export const sorceryPointMax = (sorcererLevel: number) => (sorcererLevel >= 2 ? sorcererLevel : 0);
