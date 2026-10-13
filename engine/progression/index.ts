import type { Ability, AbilityScores } from "../abilities";
import { abilityModifier } from "../abilities";

/** Total XP needed to reach each level (PHB p.15). Index 0 = level 1. */
export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000,
  265000, 305000, 355000,
] as const;

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) if (xp >= XP_THRESHOLDS[i]) level = i + 1;
  return level;
}

/** XP still needed for the next level, or null at level 20. */
export function xpToNextLevel(xp: number): number | null {
  const level = levelForXp(xp);
  return level >= 20 ? null : XP_THRESHOLDS[level] - xp;
}

/** Levels that grant an Ability Score Improvement (or feat), by class (PHB class tables). */
export function asiLevels(classIndex: string): number[] {
  if (classIndex === "fighter") return [4, 6, 8, 12, 14, 16, 19];
  if (classIndex === "rogue") return [4, 8, 10, 12, 16, 19];
  return [4, 8, 12, 16, 19];
}

export const HIT_DICE: Record<string, number> = {
  barbarian: 12, bard: 8, cleric: 8, druid: 8, fighter: 10, monk: 8,
  paladin: 10, ranger: 10, rogue: 8, sorcerer: 6, warlock: 8, wizard: 6,
};

/** HP at 1st level: max hit die + Con modifier (PHB p.12). */
export const firstLevelHp = (hitDie: number, con: number) => Math.max(1, hitDie + abilityModifier(con));

/** HP gained on later levels: rolled value or the fixed average, plus Con modifier, minimum 1. */
export function levelUpHp(hitDie: number, con: number, roll?: number): number {
  if (roll !== undefined && (roll < 1 || roll > hitDie)) throw new RangeError(`Roll must be 1-${hitDie}`);
  const base = roll ?? Math.floor(hitDie / 2) + 1;
  return Math.max(1, base + abilityModifier(con));
}

// ---------------------------------------------------------------- multiclassing (PHB p.163-165)

type Prereq = { all?: Ability[]; any?: Ability[] };

export const MULTICLASS_PREREQS: Record<string, Prereq> = {
  barbarian: { all: ["str"] },
  bard: { all: ["cha"] },
  cleric: { all: ["wis"] },
  druid: { all: ["wis"] },
  fighter: { any: ["str", "dex"] },
  monk: { all: ["dex", "wis"] },
  paladin: { all: ["str", "cha"] },
  ranger: { all: ["dex", "wis"] },
  rogue: { all: ["dex"] },
  sorcerer: { all: ["cha"] },
  warlock: { all: ["cha"] },
  wizard: { all: ["int"] },
};

export function meetsMulticlassPrereq(classIndex: string, scores: AbilityScores): boolean {
  const p = MULTICLASS_PREREQS[classIndex];
  if (!p) throw new Error(`Unknown class: ${classIndex}`);
  return (p.all ?? []).every((a) => scores[a] >= 13) && (!p.any || p.any.some((a) => scores[a] >= 13));
}

/** You need the prerequisites of your current class(es) and of the new class. */
export function canMulticlassInto(newClass: string, currentClasses: string[], scores: AbilityScores) {
  return [newClass, ...currentClasses].every((c) => meetsMulticlassPrereq(c, scores));
}

export type ClassLevel = { classIndex: string; level: number; subclassIndex?: string };

const FULL_CASTERS = new Set(["bard", "cleric", "druid", "sorcerer", "wizard"]);
const HALF_CASTERS = new Set(["paladin", "ranger"]);
const THIRD_CASTER_SUBCLASSES = new Set(["eldritch-knight", "arcane-trickster"]);

/**
 * Caster level for the spell slot table; Pact Magic (warlock) is separate.
 * A single spellcasting class uses its own table, which rounds half and third casters up (a 5th-level paladin has
 * 4 + 2 slots, like a 3rd-level caster). With several spellcasting classes the levels are added and rounded down (PHB p.164).
 */
export function casterLevel(classes: ClassLevel[]): number {
  const thirds = (c: ClassLevel) => !!c.subclassIndex && THIRD_CASTER_SUBCLASSES.has(c.subclassIndex);
  const casters = classes.filter((c) => FULL_CASTERS.has(c.classIndex) || HALF_CASTERS.has(c.classIndex) || thirds(c));
  const single = casters.length === 1;
  return casters.reduce((sum, c) => {
    if (FULL_CASTERS.has(c.classIndex)) return sum + c.level;
    if (HALF_CASTERS.has(c.classIndex)) return sum + (c.level < 2 ? 0 : single ? Math.ceil(c.level / 2) : Math.floor(c.level / 2));
    return sum + (c.level < 3 ? 0 : single ? Math.ceil(c.level / 3) : Math.floor(c.level / 3));
  }, 0);
}

/** Spell slots per spell level (1st-9th) by caster level 1-20 (Multiclass Spellcaster table, PHB p.165). */
export const SPELL_SLOTS_BY_CASTER_LEVEL: readonly (readonly number[])[] = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Slots indexed by spell level 1-9 (index 0 = 1st level). Empty for non-casters. */
export function spellSlots(classes: ClassLevel[]): number[] {
  const level = Math.min(20, casterLevel(classes));
  return level < 1 ? [] : [...SPELL_SLOTS_BY_CASTER_LEVEL[level - 1]];
}

/** Warlock Pact Magic slots (PHB p.107): count and slot level by warlock level. */
export function pactMagic(warlockLevel: number): { slots: number; slotLevel: number } | null {
  if (warlockLevel < 1) return null;
  const slots = warlockLevel === 1 ? 1 : warlockLevel < 11 ? 2 : warlockLevel < 17 ? 3 : 4;
  const slotLevel = Math.min(5, Math.ceil(warlockLevel / 2));
  return { slots, slotLevel };
}

/** Extra Attack does not stack across classes (PHB p.164); returns attacks per Attack action. */
export function attacksPerAction(classes: ClassLevel[]): number {
  let best = 1;
  for (const c of classes) {
    let n = 1;
    if (c.classIndex === "fighter") n = c.level >= 20 ? 4 : c.level >= 11 ? 3 : c.level >= 5 ? 2 : 1;
    else if (["barbarian", "monk", "paladin", "ranger"].includes(c.classIndex) && c.level >= 5) n = 2;
    best = Math.max(best, n);
  }
  return best;
}
