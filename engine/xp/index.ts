/** Experience points by challenge rating (monster stat blocks / SRD). Keys are CR strings. */
export const XP_BY_CR: Record<string, number> = {
  "0": 10, "1/8": 25, "1/4": 50, "1/2": 100, "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800, "6": 2300,
  "7": 2900, "8": 3900, "9": 5000, "10": 5900, "11": 7200, "12": 8400, "13": 10000, "14": 11500, "15": 13000,
  "16": 15000, "17": 18000, "18": 20000, "19": 22000, "20": 25000, "21": 33000, "22": 41000, "23": 50000,
  "24": 62000, "25": 75000, "26": 90000, "27": 105000, "28": 120000, "29": 135000, "30": 155000,
};

/** XP for a creature: accepts "1/4" or a stat block line like "1/4 (50 XP)". */
export function xpForChallenge(challenge: string): number {
  const explicit = /\(([\d,]+)\s*XP\)/i.exec(challenge);
  if (explicit) return Number(explicit[1].replace(/,/g, ""));
  const key = challenge.trim();
  const xp = XP_BY_CR[key];
  if (xp === undefined) throw new Error(`Unknown challenge rating: ${challenge}`);
  return xp;
}

/** Total XP for defeated monsters, divided evenly among the party; the remainder is dropped (round down). */
export function awardXp(defeated: string[], partySize: number): { total: number; each: number } {
  if (partySize < 1) throw new RangeError("Party must have at least one member");
  const total = defeated.reduce((s, c) => s + xpForChallenge(c), 0);
  return { total, each: Math.floor(total / partySize) };
}
