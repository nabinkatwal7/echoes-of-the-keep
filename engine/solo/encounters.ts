import { encounterDifficulty, type Difficulty } from "@/engine/world";

export type PoolEntry = { index: string; challenge: string };
export type EncounterPick = { index: string; count: number };

/** Creatures that suit each kind of adventure. Names that are not in the content database are skipped when building. */
export const THEME_POOLS: Record<string, string[]> = {
  crypt: ["skeleton", "zombie", "shadow", "ghoul", "specter", "ghast", "wight", "mummy", "warhorse-skeleton", "minotaur-skeleton"],
  wilds: ["wolf", "boar", "black-bear", "panther", "giant-spider", "dire-wolf", "brown-bear", "lion", "tiger", "constrictor-snake", "swarm-of-ravens"],
  bandits: ["bandit", "cultist", "guard", "thug", "scout", "bandit-captain", "berserker", "veteran", "knight", "cult-fanatic"],
  caves: ["kobold", "goblin", "grimlock", "gnoll", "hobgoblin", "bugbear", "giant-spider", "ogre", "darkmantle", "ettin"],
};

const crValue = (c: string) => {
  const head = c.trim().split(/\s/)[0];
  if (head.includes("/")) {
    const [a, b] = head.split("/").map(Number);
    return a / b;
  }
  return Number(head) || 0;
};
const crKey = (c: string) => c.trim().split(/\s/)[0];

const ORDER: Difficulty[] = ["trivial", "easy", "medium", "hard", "deadly"];

/**
 * Pick a fight for the party that lands on the wanted difficulty. A "boss" fight is one strong creature with a few helpers;
 * ordinary fights are a group of one or two kinds. Returns null if nothing in the pool can make it work.
 */
export function buildEncounter(input: {
  pool: PoolEntry[];
  partyLevels: number[];
  target: Difficulty;
  boss?: boolean;
  rand?: () => number;
}): { picks: EncounterPick[]; difficulty: Difficulty; xp: number } | null {
  const rand = input.rand ?? Math.random;
  const avg = input.partyLevels.reduce((s, l) => s + l, 0) / Math.max(1, input.partyLevels.length);
  // no single creature should out-class the party by much: cap by level, and floor tiny ones out of boss fights
  const usable = input.pool.filter((p) => crValue(p.challenge) <= Math.max(0.5, avg + 1)).filter((p) => !input.boss || crValue(p.challenge) >= Math.min(avg - 1, 1));
  if (!usable.length) return null;

  type Candidate = { picks: EncounterPick[]; difficulty: Difficulty; xp: number; fit: number };
  const wanted = ORDER.indexOf(input.target);
  const candidates: Candidate[] = [];
  const score = (picks: EncounterPick[]) => {
    const list = picks.flatMap((p) => Array.from({ length: p.count }, () => crKey(usable.find((u) => u.index === p.index)!.challenge)));
    const r = encounterDifficulty(list, input.partyLevels);
    return { difficulty: r.difficulty, xp: r.xp, fit: Math.abs(ORDER.indexOf(r.difficulty) - wanted) };
  };

  if (input.boss) {
    const strongest = [...usable].sort((a, b) => crValue(b.challenge) - crValue(a.challenge));
    for (const boss of strongest.slice(0, 4)) {
      for (const helper of usable) {
        for (let n = 0; n <= 5; n++) {
          const picks: EncounterPick[] = [{ index: boss.index, count: 1 }, ...(n && helper.index !== boss.index ? [{ index: helper.index, count: n }] : [])];
          candidates.push({ picks, ...score(picks) });
        }
      }
    }
  } else {
    for (const a of usable) {
      for (let n = 1; n <= 8; n++) {
        const solo = [{ index: a.index, count: n }];
        candidates.push({ picks: solo, ...score(solo) });
        for (const b of usable) {
          if (b.index === a.index) continue;
          for (let m = 1; m <= 4; m++) {
            const pair = [{ index: a.index, count: n }, { index: b.index, count: m }];
            candidates.push({ picks: pair, ...score(pair) });
          }
        }
      }
    }
  }
  const best = Math.min(...candidates.map((c) => c.fit));
  const fits = candidates.filter((c) => c.fit === best && (best === 0 || true));
  // prefer variety: a random one among the exact fits, and not an army
  const sane = fits.filter((c) => c.picks.reduce((s, p) => s + p.count, 0) <= 9);
  const choose = (sane.length ? sane : fits);
  const pick = choose[Math.floor(rand() * choose.length)];
  return pick ? { picks: pick.picks, difficulty: pick.difficulty, xp: pick.xp } : null;
}

/** Average party level, rounded, for choosing how hard the world pushes back. */
export const partyLevel = (levels: number[]) => Math.max(1, Math.round(levels.reduce((s, l) => s + l, 0) / Math.max(1, levels.length)));
