import { abilityModifier } from "../abilities";

/** How each spellcasting class gets its spells (PHB Ch.3 class tables). */
export type CasterKind = "known" | "prepared";

export const CASTER_KIND: Record<string, CasterKind> = {
  bard: "known", sorcerer: "known", warlock: "known", ranger: "known",
  cleric: "prepared", druid: "prepared", paladin: "prepared", wizard: "prepared",
};

/** Cantrips known by class level 1-20 (0 = none). */
const CANTRIPS: Record<string, number[]> = {
  bard: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  cleric: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  druid: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  sorcerer: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  warlock: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  wizard: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
};

/** Spells known by class level for "known" casters. */
const SPELLS_KNOWN: Record<string, number[]> = {
  bard: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
  sorcerer: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
  warlock: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  ranger: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
};

export const isCaster = (classIndex: string) => classIndex in CASTER_KIND;

export const cantripsKnown = (classIndex: string, level: number): number => CANTRIPS[classIndex]?.[level - 1] ?? 0;

export type SpellLimits = {
  kind: CasterKind;
  cantrips: number;
  /** spells known (known casters) or prepared (prepared casters) */
  spells: number;
  /** wizards copy spells into a spellbook: 6 at 1st level, +2 each level */
  spellbook?: number;
};

export function spellLimits(classIndex: string, level: number, castingScore: number): SpellLimits | null {
  const kind = CASTER_KIND[classIndex];
  if (!kind) return null;
  if (kind === "known") return { kind, cantrips: cantripsKnown(classIndex, level), spells: SPELLS_KNOWN[classIndex][level - 1] };
  const mod = abilityModifier(castingScore);
  const prepared =
    classIndex === "paladin" ? (level < 2 ? 0 : Math.max(1, mod + Math.floor(level / 2))) : Math.max(1, mod + level);
  return { kind, cantrips: cantripsKnown(classIndex, level), spells: prepared, ...(classIndex === "wizard" ? { spellbook: 6 + 2 * (level - 1) } : {}) };
}

/** Highest spell level the class can cast at this class level (half casters start at 2nd; warlock tops out at 5th). */
export function maxSpellLevel(classIndex: string, level: number): number {
  if (["bard", "cleric", "druid", "sorcerer", "wizard"].includes(classIndex)) return Math.min(9, Math.ceil(level / 2));
  // half casters: 1st-level spells at class level 2, then a new spell level every 4 levels (2nd at 5, 3rd at 9, ...)
  if (["paladin", "ranger"].includes(classIndex)) return level < 2 ? 0 : Math.min(5, Math.floor((level + 3) / 4));
  if (classIndex === "warlock") return Math.min(5, Math.ceil(level / 2));
  return 0;
}

export const CLASS_NAME: Record<string, string> = {
  bard: "Bard", cleric: "Cleric", druid: "Druid", paladin: "Paladin", ranger: "Ranger",
  sorcerer: "Sorcerer", warlock: "Warlock", wizard: "Wizard",
};

export type SpellMeta = { index: string; name: string; level: number; classes: readonly string[] };

export type SpellSelection = { known: string[]; prepared: string[]; spellbook: string[] };

/**
 * Validate chosen spells against a class: on the class list, within the castable level, and within the limits.
 * `catalog` maps spell index to its metadata.
 */
export function validateSpellSelection(
  classIndex: string,
  level: number,
  castingScore: number,
  sel: SpellSelection,
  catalog: ReadonlyMap<string, SpellMeta>,
): string[] {
  const limits = spellLimits(classIndex, level, castingScore);
  if (!limits) return sel.known.length + sel.prepared.length + sel.spellbook.length ? [`${classIndex} does not cast spells`] : [];
  const errors: string[] = [];
  const className = CLASS_NAME[classIndex];
  const maxLevel = maxSpellLevel(classIndex, level);
  const check = (list: string[], label: string) => {
    for (const idx of list) {
      const s = catalog.get(idx);
      if (!s) errors.push(`Unknown spell: ${idx}`);
      else if (!s.classes.includes(className)) errors.push(`${s.name} is not a ${className} spell`);
      else if (s.level > maxLevel) errors.push(`${s.name} is above the ${label} spell level you can cast`);
    }
    if (new Set(list).size !== list.length) errors.push(`Duplicate spells in ${label}`);
  };

  const pool = limits.kind === "known" ? sel.known : sel.prepared;
  const cantrips = pool.filter((i) => catalog.get(i)?.level === 0);
  const leveled = pool.filter((i) => catalog.get(i)?.level !== 0);
  check(pool, limits.kind === "known" ? "known" : "prepared");
  if (cantrips.length > limits.cantrips) errors.push(`You know ${cantrips.length} cantrips but can only know ${limits.cantrips}`);
  if (leveled.length > limits.spells) errors.push(`You have ${leveled.length} spells but the limit is ${limits.spells}`);

  if (limits.kind === "prepared" && classIndex === "wizard") {
    check(sel.spellbook, "spellbook");
    const book = new Set(sel.spellbook);
    if (sel.spellbook.length > (limits.spellbook ?? 0)) errors.push(`Spellbook holds ${limits.spellbook} spells at this level`);
    for (const i of leveled) if (!book.has(i)) errors.push(`${catalog.get(i)?.name ?? i} must be in your spellbook to be prepared`);
  }
  return errors;
}
