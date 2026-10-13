/** Weapon training by class (PHB Ch.3). Entries are categories ("simple", "martial") or specific weapon names. */
export const WEAPON_PROFICIENCIES: Record<string, string[]> = {
  barbarian: ["simple", "martial"],
  bard: ["simple", "crossbow, hand", "longsword", "rapier", "shortsword"],
  cleric: ["simple"],
  druid: ["club", "dagger", "dart", "javelin", "mace", "quarterstaff", "scimitar", "sickle", "sling", "spear"],
  fighter: ["simple", "martial"],
  monk: ["simple", "shortsword"],
  paladin: ["simple", "martial"],
  ranger: ["simple", "martial"],
  rogue: ["simple", "crossbow, hand", "longsword", "rapier", "shortsword"],
  sorcerer: ["dagger", "dart", "sling", "quarterstaff", "crossbow, light"],
  warlock: ["simple"],
  wizard: ["dagger", "dart", "sling", "quarterstaff", "crossbow, light"],
};

/** Is a character with these classes proficient with a weapon? `category` is e.g. "Simple Melee Weapons". */
export function weaponProficient(classIndexes: string[], weaponName: string, category: string | null): boolean {
  const kind = category?.toLowerCase().startsWith("martial") ? "martial" : category?.toLowerCase().startsWith("simple") ? "simple" : null;
  return classIndexes.some((c) => {
    const profs = WEAPON_PROFICIENCIES[c] ?? [];
    return (kind !== null && profs.includes(kind)) || profs.includes(weaponName.toLowerCase());
  });
}

/** Starting gold if you skip the class kit (PHB p.143): dice and multiplier. */
export const STARTING_GOLD: Record<string, { dice: string; multiplier: number }> = {
  barbarian: { dice: "2d4", multiplier: 10 },
  bard: { dice: "5d4", multiplier: 10 },
  cleric: { dice: "5d4", multiplier: 10 },
  druid: { dice: "2d4", multiplier: 10 },
  fighter: { dice: "5d4", multiplier: 10 },
  monk: { dice: "5d4", multiplier: 1 },
  paladin: { dice: "5d4", multiplier: 10 },
  ranger: { dice: "5d4", multiplier: 10 },
  rogue: { dice: "4d4", multiplier: 10 },
  sorcerer: { dice: "3d4", multiplier: 10 },
  warlock: { dice: "4d4", multiplier: 10 },
  wizard: { dice: "4d4", multiplier: 10 },
};

export type KitItem = { index: string; quantity?: number; equipped?: boolean };

/** A ready-made kit per class so a new character can start playing immediately. Indexes are equipment catalog keys. */
export const STARTING_KITS: Record<string, KitItem[]> = {
  barbarian: [{ index: "greataxe", equipped: true }, { index: "handaxe", quantity: 2 }, { index: "javelin", quantity: 4 }, { index: "backpack" }],
  bard: [{ index: "rapier", equipped: true }, { index: "dagger" }, { index: "leather", equipped: true }, { index: "backpack" }],
  cleric: [{ index: "mace", equipped: true }, { index: "scale-mail", equipped: true }, { index: "shield", equipped: true }, { index: "crossbow-light" }, { index: "backpack" }],
  druid: [{ index: "scimitar", equipped: true }, { index: "leather", equipped: true }, { index: "backpack" }],
  fighter: [{ index: "longsword", equipped: true }, { index: "chainmail", equipped: true }, { index: "shield", equipped: true }, { index: "crossbow-light" }, { index: "backpack" }],
  monk: [{ index: "shortsword", equipped: true }, { index: "dart", quantity: 10 }, { index: "backpack" }],
  paladin: [{ index: "longsword", equipped: true }, { index: "chainmail", equipped: true }, { index: "shield", equipped: true }, { index: "javelin", quantity: 5 }, { index: "backpack" }],
  ranger: [{ index: "scale-mail", equipped: true }, { index: "shortsword", quantity: 2, equipped: true }, { index: "longbow", equipped: true }, { index: "backpack" }],
  rogue: [{ index: "rapier", equipped: true }, { index: "shortbow" }, { index: "leather", equipped: true }, { index: "dagger", quantity: 2 }, { index: "backpack" }],
  sorcerer: [{ index: "dagger", quantity: 2, equipped: true }, { index: "crossbow-light" }, { index: "backpack" }],
  warlock: [{ index: "dagger", quantity: 2, equipped: true }, { index: "crossbow-light" }, { index: "leather", equipped: true }, { index: "backpack" }],
  wizard: [{ index: "quarterstaff", equipped: true }, { index: "dagger" }, { index: "backpack" }],
};
