/** Metamagic (Player's Handbook, sorcerer). One option per casting; the point cost is fixed before the roll. */

export const METAMAGIC_OPTIONS = ["careful", "distant", "empowered", "extended", "heightened", "quickened", "subtle", "twinned"] as const;

export type MetamagicName = (typeof METAMAGIC_OPTIONS)[number];

export const isMetamagic = (v: string): v is MetamagicName => (METAMAGIC_OPTIONS as readonly string[]).includes(v);

/** How many options a sorcerer knows: 2 at level 3, 3 at 10, 4 at 17. */
export const metamagicKnownCount = (sorcererLevel: number) => (sorcererLevel >= 17 ? 4 : sorcererLevel >= 10 ? 3 : sorcererLevel >= 3 ? 2 : 0);

/**
 * The options this sorcerer can use. A saved list wins. Until they choose, the first options in the book order stand in.
 * ponytail: the stand-in list is fixed; the sheet's picker replaces it.
 */
export function knownMetamagic(sorcererLevel: number, chosen?: readonly string[]): MetamagicName[] {
  const n = metamagicKnownCount(sorcererLevel);
  const pick = [...new Set((chosen ?? []).filter(isMetamagic))].slice(0, n);
  return pick.length ? pick : METAMAGIC_OPTIONS.slice(0, n);
}

/** Sorcery points spent. Twinned Spell costs the spell's level, at least 1 (a cantrip). */
export function metamagicCost(name: MetamagicName, spellLevel: number): number {
  if (name === "quickened") return 2;
  if (name === "heightened") return 3;
  if (name === "twinned") return Math.max(1, spellLevel);
  return 1;
}
