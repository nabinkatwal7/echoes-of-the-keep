/** Campaign switches the creator and the fight actually follow. Missing keys keep the book's defaults. */

export type HouseRules = {
  /** a level can be taken in a new class */
  multiclass: boolean;
  /** an Ability Score Improvement can be spent on a feat */
  feats: boolean;
  /** optional rule: opposite sides of a foe grant advantage (Basic Rules / Dungeon Master's Guide) */
  flanking: boolean;
};

export const DEFAULT_HOUSE_RULES: HouseRules = { multiclass: true, feats: true, flanking: false };

export function readHouseRules(settings: unknown): HouseRules {
  const s = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {};
  return {
    multiclass: s.multiclass !== false,
    feats: s.feats !== false,
    flanking: s.flanking === true,
  };
}

/** Strictest rule wins when a character sits in more than one campaign. */
export function combineHouseRules(list: HouseRules[]): HouseRules {
  if (!list.length) return DEFAULT_HOUSE_RULES;
  return {
    multiclass: list.every((r) => r.multiclass),
    feats: list.every((r) => r.feats),
    flanking: list.some((r) => r.flanking),
  };
}

type Square = { x: number; y: number };

/** An ally on the opposite side or corner of the target, both adjacent, is flanking. */
export function isFlanking(attacker: Square, target: Square, allies: Square[]): boolean {
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) !== 1) return false;
  return allies.some((a) => a.x - target.x === dx && a.y - target.y === dy);
}
