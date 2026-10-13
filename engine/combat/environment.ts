/** Weapons that work underwater in melee (PHB p.198). */
const UNDERWATER_MELEE = ["dagger", "javelin", "shortsword", "spear", "trident"];

export type UnderwaterAttack = { disadvantage: boolean; autoMiss: boolean; note?: string };

/**
 * Underwater combat: a melee attack has disadvantage unless the weapon is a dagger, javelin, shortsword, spear or trident;
 * a ranged attack automatically misses beyond its normal range and has disadvantage within it unless it is a crossbow,
 * net, or thrown like a javelin.
 */
export function underwaterAttack(opts: { melee: boolean; weaponName: string; beyondNormalRange?: boolean }): UnderwaterAttack {
  const name = opts.weaponName.toLowerCase();
  if (opts.melee) {
    const ok = UNDERWATER_MELEE.includes(name);
    return { disadvantage: !ok, autoMiss: false, note: ok ? undefined : "Underwater: melee attack has disadvantage" };
  }
  if (opts.beyondNormalRange) return { disadvantage: true, autoMiss: true, note: "Underwater: ranged attack misses beyond normal range" };
  const ok = /crossbow|net|javelin|dart/.test(name);
  return { disadvantage: !ok, autoMiss: false, note: ok ? undefined : "Underwater: ranged attack has disadvantage" };
}

/** Everything underwater has resistance to fire damage (PHB p.198). */
export const underwaterFireResistance = true;

/** Mounting or dismounting costs an amount of movement equal to half your speed (PHB p.198). */
export const mountMoveCost = (speed: number) => Math.floor(speed / 2);

/** A controlled mount moves as you direct and can only Dash, Disengage or Dodge; an independent mount acts for itself. */
export const CONTROLLED_MOUNT_ACTIONS = ["dash", "disengage", "dodge"] as const;
