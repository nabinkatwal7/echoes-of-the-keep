import { xpForChallenge } from "../xp";
import { LIGHT_SOURCES, travelDistance, type Pace } from "../exploration";
import { levelUpHp } from "../progression";

// ---------------------------------------------------------------- the clock

export const MINUTES_PER_DAY = 1440;

export type GameTime = { day: number; hour: number; minute: number };

/** Minutes since midnight of day 1 -> day, hour, minute. */
export function toGameTime(totalMinutes: number): GameTime {
  const m = Math.max(0, Math.floor(totalMinutes));
  return { day: Math.floor(m / MINUTES_PER_DAY) + 1, hour: Math.floor((m % MINUTES_PER_DAY) / 60), minute: m % 60 };
}

export const formatGameTime = (totalMinutes: number) => {
  const t = toGameTime(totalMinutes);
  return `Day ${t.day}, ${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
};

export type TimeOfDay = "dawn" | "day" | "dusk" | "night";

export function timeOfDay(totalMinutes: number): TimeOfDay {
  const h = toGameTime(totalMinutes).hour;
  return h >= 5 && h < 7 ? "dawn" : h >= 7 && h < 18 ? "day" : h >= 18 && h < 20 ? "dusk" : "night";
}

/** Natural light outdoors: bright by day, dim at dawn and dusk, darkness at night. */
export const ambientLight = (totalMinutes: number): "bright" | "dim" | "darkness" => {
  const t = timeOfDay(totalMinutes);
  return t === "day" ? "bright" : t === "night" ? "darkness" : "dim";
};

// ---------------------------------------------------------------- light sources burn down

export type LightKind = keyof typeof LIGHT_SOURCES;
export type BurningLight = { id: string; kind: LightKind; remainingMinutes: number; lit: boolean };

export const newLight = (id: string, kind: LightKind): BurningLight => ({ id, kind, remainingMinutes: LIGHT_SOURCES[kind].hours * 60, lit: true });

/** Let time pass: lit sources burn down and go out at zero. Returns which went out. */
export function burnLights(lights: BurningLight[], minutes: number): { lights: BurningLight[]; wentOut: BurningLight[] } {
  const wentOut: BurningLight[] = [];
  const next = lights.map((l) => {
    if (!l.lit) return l;
    const left = Math.max(0, l.remainingMinutes - minutes);
    if (left === 0) {
      const out = { ...l, remainingMinutes: 0, lit: false };
      wentOut.push(out);
      return out;
    }
    return { ...l, remainingMinutes: left };
  });
  return { lights: next, wentOut };
}

// ---------------------------------------------------------------- overland travel

export type Terrain = "road" | "open" | "forest" | "hills" | "mountain" | "swamp" | "difficult";
const TERRAIN_COST: Record<Terrain, number> = { road: 1, open: 1, forest: 2, hills: 2, mountain: 3, swamp: 3, difficult: 2 };

/** Hours and days for a journey, using the slowest traveler's speed and half pace in difficult terrain (PHB p.181-183). */
export function journey(miles: number, pace: Pace, slowestSpeed: number, terrain: Terrain = "open") {
  const per = travelDistance(pace, slowestSpeed);
  const effectiveMph = per.milesPerHour / TERRAIN_COST[terrain];
  const hours = effectiveMph > 0 ? miles / effectiveMph : Infinity;
  const days = hours / 8;
  return {
    hours: Math.round(hours * 10) / 10,
    days: Math.round(days * 10) / 10,
    minutes: Math.round(hours * 60),
    /** nights spent on the road */
    camps: Math.max(0, Math.ceil(days) - 1),
    passivePerceptionPenalty: per.passivePerceptionPenalty,
    canBeStealthy: per.canBeStealthy,
    foodDays: Math.ceil(days),
  };
}

// ---------------------------------------------------------------- encounter budget

/**
 * A simple difficulty gauge for a party. The handbook has no encounter-building tables, so this is a rule of thumb:
 * total monster XP is compared with 25 XP per character level per hero for "easy", scaling up to 100 for "deadly", and groups
 * count extra because many weak enemies out-act one strong one.
 */
export type Difficulty = "trivial" | "easy" | "medium" | "hard" | "deadly";

export function groupMultiplier(count: number): number {
  return count <= 1 ? 1 : count === 2 ? 1.5 : count <= 6 ? 2 : count <= 10 ? 2.5 : count <= 14 ? 3 : 4;
}

export function encounterDifficulty(monsterChallenges: string[], partyLevels: number[]): { xp: number; adjustedXp: number; difficulty: Difficulty; thresholds: Record<Exclude<Difficulty, "trivial">, number> } {
  const sumLevels = partyLevels.reduce((s, l) => s + l, 0);
  const thresholds = { easy: 25 * sumLevels, medium: 50 * sumLevels, hard: 75 * sumLevels, deadly: 100 * sumLevels };
  const xp = monsterChallenges.reduce((s, c) => s + xpForChallenge(c), 0);
  const adjustedXp = Math.round(xp * groupMultiplier(monsterChallenges.length));
  const difficulty: Difficulty = adjustedXp >= thresholds.deadly ? "deadly" : adjustedXp >= thresholds.hard ? "hard" : adjustedXp >= thresholds.medium ? "medium" : adjustedXp >= thresholds.easy ? "easy" : "trivial";
  return { xp, adjustedXp, difficulty, thresholds };
}

// ---------------------------------------------------------------- social (PHB p.185)

export type Attitude = "friendly" | "indifferent" | "hostile";
export const ATTITUDES: readonly Attitude[] = ["hostile", "indifferent", "friendly"];

/** The DC to talk a creature into a request, by attitude (Hostile is hard, Friendly is easy). */
export const requestDc = (attitude: Attitude, requestSize: "small" | "large" = "small") => ({ hostile: 20, indifferent: 15, friendly: 10 }[attitude] + (requestSize === "large" ? 5 : 0));

/** Beat the DC by 5 or more and the attitude improves a step; fail by 5 or more and it worsens a step. */
export function shiftAttitude(current: Attitude, margin: number): Attitude {
  const i = ATTITUDES.indexOf(current);
  const j = margin >= 5 ? Math.min(2, i + 1) : margin <= -5 ? Math.max(0, i - 1) : i;
  return ATTITUDES[j];
}

// ---------------------------------------------------------------- downtime (PHB p.187)

export type DowntimeKind = "work" | "craft" | "profession" | "recuperate" | "research" | "train";

export type DowntimeResult = { ok: true; costCp: number; incomeCp: number; summary: string; days: number } | { ok: false; reason: string };

/**
 * The handbook's downtime activities, reduced to money and time. Crafting: 5 gp of progress per day toward an item worth its
 * price (half cost in materials). Training: 250 days. Recuperating: 3 days per ailment. Work: pays for a modest lifestyle.
 */
export function downtime(kind: DowntimeKind, days: number, opts: { itemValueCp?: number; proficientToolOrSkill?: boolean } = {}): DowntimeResult {
  if (!Number.isInteger(days) || days < 1) return { ok: false, reason: "Spend at least one day" };
  switch (kind) {
    case "work":
      return { ok: true, days, costCp: 0, incomeCp: 0, summary: `Working for ${days} days covers a modest lifestyle` };
    case "profession":
      return { ok: true, days, costCp: 0, incomeCp: 0, summary: `Practicing a profession for ${days} days covers a comfortable lifestyle` };
    case "craft": {
      const value = opts.itemValueCp ?? 0;
      if (value <= 0) return { ok: false, reason: "Name the item and its price" };
      if (!opts.proficientToolOrSkill) return { ok: false, reason: "Crafting needs proficiency with the right tools" };
      const progressCp = 500 * days; // 5 gp per day
      const done = progressCp >= value;
      const daysNeeded = Math.ceil(value / 500);
      return { ok: true, days: done ? daysNeeded : days, costCp: Math.floor(value / 2), incomeCp: 0, summary: done ? `The item is finished after ${daysNeeded} days (materials cost half its price)` : `${days} of ${daysNeeded} days of work done` };
    }
    case "recuperate":
      return days < 3 ? { ok: false, reason: "Recuperating takes at least three days" } : { ok: true, days, costCp: 0, incomeCp: 0, summary: "After three days of rest, make a Constitution save (DC 15) to end a disease or poison" };
    case "research":
      return { ok: true, days, costCp: 100 * days, incomeCp: 0, summary: `${days} days of research cost ${days} gp` };
    case "train":
      return days < 250 ? { ok: false, reason: "Training takes 250 days (10 gp of tuition per day)" } : { ok: true, days: 250, costCp: 250 * 1000, incomeCp: 0, summary: "250 days of training teach a new language or tool proficiency" };
  }
}

// ---------------------------------------------------------------- death and returning (PHB p.197, 266, 272)

export type ResurrectionKind = "revivify" | "raise-dead" | "resurrection" | "reincarnate" | "true-resurrection";

export const RESURRECTIONS: Record<ResurrectionKind, { spellLevel: number; componentCostGp: number; withinDays: number | null; penalty: number; restoresHp: "one" | "full"; note: string }> = {
  revivify: { spellLevel: 3, componentCostGp: 300, withinDays: 1 / 1440, penalty: 0, restoresHp: "one", note: "dead for no more than 1 minute; returns with 1 hit point" },
  "raise-dead": { spellLevel: 5, componentCostGp: 500, withinDays: 10, penalty: 4, restoresHp: "one", note: "dead no more than 10 days; -4 to d20 rolls, reduced by 1 per long rest" },
  resurrection: { spellLevel: 7, componentCostGp: 1000, withinDays: 365 * 100, penalty: 4, restoresHp: "full", note: "dead no more than a century; full hit points; -4 penalty" },
  reincarnate: { spellLevel: 5, componentCostGp: 1000, withinDays: 10, penalty: 0, restoresHp: "full", note: "dead no more than 10 days; returns in a new body (DM picks the race)" },
  "true-resurrection": { spellLevel: 9, componentCostGp: 25000, withinDays: 200 * 365, penalty: 0, restoresHp: "full", note: "dead no more than 200 years; full hit points, no penalty" },
};

export function resurrect(kind: ResurrectionKind, daysDead: number, maxHp: number): { ok: true; hp: number; penalty: number; costGp: number } | { ok: false; reason: string } {
  const r = RESURRECTIONS[kind];
  if (r.withinDays !== null && daysDead > r.withinDays) return { ok: false, reason: `${kind.replace("-", " ")} only works if the creature died within ${r.withinDays < 1 ? "1 minute" : `${Math.round(r.withinDays)} days`}` };
  return { ok: true, hp: r.restoresHp === "one" ? 1 : maxHp, penalty: r.penalty, costGp: r.componentCostGp };
}

/** The raised-from-the-dead penalty drops by 1 after each long rest. */
export const fadePenalty = (penalty: number) => Math.max(0, penalty - 1);

// ---------------------------------------------------------------- milestone leveling

/** HP for a hero who levels at the table without a roll: the fixed average (PHB p.15). */
export const averageLevelHp = (hitDie: number, con: number) => levelUpHp(hitDie, con);
