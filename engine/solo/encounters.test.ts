import { describe, expect, it } from "vitest";
import { encounterDifficulty } from "@/engine/world";
import { buildEncounter, partyLevel, THEME_POOLS, type PoolEntry } from "./encounters";

const pool: PoolEntry[] = [
  { index: "kobold", challenge: "1/8 (25 XP)" }, { index: "goblin", challenge: "1/4 (50 XP)" }, { index: "wolf", challenge: "1/4 (50 XP)" },
  { index: "bugbear", challenge: "1 (200 XP)" }, { index: "ogre", challenge: "2 (450 XP)" }, { index: "troll", challenge: "5 (1800 XP)" },
];
const seq = (n: number) => { let i = 0; return () => ((i++ * 0.37 + n) % 1); };
const total = (picks: { index: string; count: number }[]) => picks.reduce((s, p) => s + p.count, 0);
const levelsOf = (picks: { index: string; count: number }[]) => picks.flatMap((p) => Array.from({ length: p.count }, () => pool.find((x) => x.index === p.index)!.challenge));

describe("building encounters", () => {
  const party = [3, 3, 3, 3];
  for (const target of ["easy", "medium", "hard"] as const) {
    it(`lands on ${target} for a level 3 party`, () => {
      const e = buildEncounter({ pool, partyLevels: party, target, rand: seq(0.1) });
      expect(e).not.toBeNull();
      expect(e!.difficulty).toBe(target);
      expect(encounterDifficulty(levelsOf(e!.picks), party).difficulty).toBe(target);
      expect(total(e!.picks)).toBeLessThanOrEqual(9);
    });
  }

  it("a boss fight has one strong creature", () => {
    const e = buildEncounter({ pool, partyLevels: party, target: "hard", boss: true, rand: seq(0.3) })!;
    expect(e.picks[0].count).toBe(1);
    expect(["bugbear", "ogre", "troll"]).toContain(e.picks[0].index);
  });

  it("does not field creatures far above the party", () => {
    const e = buildEncounter({ pool, partyLevels: [1, 1, 1], target: "medium", rand: seq(0.2) })!;
    expect(e.picks.every((p) => p.index !== "troll" && p.index !== "ogre")).toBe(true);
  });

  it("scales with the party", () => {
    const small = buildEncounter({ pool, partyLevels: [1, 1], target: "medium", rand: seq(0.4) })!;
    const big = buildEncounter({ pool, partyLevels: [5, 5, 5, 5, 5], target: "medium", rand: seq(0.4) })!;
    expect(big.xp).toBeGreaterThan(small.xp);
  });

  it("returns null when nothing fits", () => {
    expect(buildEncounter({ pool: [], partyLevels: party, target: "easy" })).toBeNull();
  });

  it("every theme has creatures to draw on and levels average sensibly", () => {
    for (const k of ["crypt", "wilds", "bandits", "caves"]) expect(THEME_POOLS[k].length).toBeGreaterThanOrEqual(8);
    expect(partyLevel([1, 2, 3])).toBe(2);
    expect(partyLevel([])).toBe(1);
  });
});
