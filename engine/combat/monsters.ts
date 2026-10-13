export type MonsterAttack = {
  name: string;
  melee: boolean;
  toHit: number;
  /** reach in feet (melee) or normal/long range (ranged) */
  reach?: number;
  range?: { normal: number; long: number };
  damage: string;
  damageType: string;
  /** flat damage with no dice, e.g. "1 slashing damage" */
  flat: boolean;
};

export type MonsterActions = { attacks: MonsterAttack[]; multiattack: { count: number; text: string } | null };

const NUMBER_WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5 };

/** "7 (1d8 + 3)" -> "1d8+3"; "1" -> "1" */
const diceOf = (flat: string, dice?: string) => (dice ? dice.replace(/\s+/g, "") : flat);

/**
 * Read attack actions out of a stat block's text. Handles the handbook's format:
 * "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage."
 */
export function parseMonsterActions(text: string): MonsterActions {
  const body = text.replace(/\s+/g, " ");
  const attacks: MonsterAttack[] = [];
  const re =
    /([A-Z][A-Za-z' ’()-]{1,40}?)\.\s+(Melee|Ranged) Weapon Attack:\s*\+?(-?\d+) to hit,\s*(?:reach (\d+) ft\.|range (\d+)\/(\d+) ft\.)[^.]*\.\s*Hit:\s*(\d+)(?: \(([^)]+)\))?\s+(\w+) damage/g;
  for (const m of body.matchAll(re)) {
    attacks.push({
      name: m[1].trim(),
      melee: m[2] === "Melee",
      toHit: Number(m[3]),
      ...(m[4] ? { reach: Number(m[4]) } : { range: { normal: Number(m[5]), long: Number(m[6]) } }),
      damage: diceOf(m[7], m[8]),
      damageType: m[9].toLowerCase(),
      flat: !m[8],
    });
  }
  const multi = /Multiattack\.\s+The [^.]*? makes (two|three|four|five) [^.]*attacks?/i.exec(body);
  return { attacks, multiattack: multi ? { count: NUMBER_WORDS[multi[1].toLowerCase()], text: multi[0] } : null };
}

/** Damage resistances, vulnerabilities and immunities written as text, e.g. "bludgeoning, piercing, and slashing from nonmagical attacks". */
export function parseDefenses(resistances: string | null | undefined) {
  const types = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];
  const found = types.filter((t) => new RegExp(`\\b${t}\\b`, "i").test(resistances ?? ""));
  return { resistances: found };
}

/** Health shown to players instead of exact monster hit points. */
export function healthWord(hp: number, maxHp: number, defeated = false): "Defeated" | "Critical" | "Bloodied" | "Wounded" | "Healthy" {
  if (defeated || hp <= 0) return "Defeated";
  const pct = hp / maxHp;
  return pct <= 0.25 ? "Critical" : pct <= 0.5 ? "Bloodied" : pct < 1 ? "Wounded" : "Healthy";
}
