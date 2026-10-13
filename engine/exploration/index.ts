import { abilityModifier } from "../abilities";
import { rollExpression, type Rng, cryptoRng } from "../dice";

// ---------------------------------------------------------------- travel (PHB p.181)

export type Pace = "fast" | "normal" | "slow";

/** Travel Pace table for a 30 ft speed; other speeds scale proportionally. */
const PACE_TABLE: Record<Pace, { feetPerMinute: number; milesPerHour: number; milesPerDay: number }> = {
  fast: { feetPerMinute: 400, milesPerHour: 4, milesPerDay: 30 },
  normal: { feetPerMinute: 300, milesPerHour: 3, milesPerDay: 24 },
  slow: { feetPerMinute: 200, milesPerHour: 2, milesPerDay: 18 },
};

export function travelDistance(pace: Pace, speed = 30) {
  const base = PACE_TABLE[pace];
  const k = speed / 30;
  return {
    feetPerMinute: Math.round(base.feetPerMinute * k),
    milesPerHour: Math.round(base.milesPerHour * k * 10) / 10,
    milesPerDay: Math.round(base.milesPerDay * k),
    /** fast: -5 to passive Wisdom (Perception); slow: can move stealthily */
    passivePerceptionPenalty: pace === "fast" ? 5 : 0,
    canBeStealthy: pace === "slow",
  };
}

/** Forced march: after 8 hours, each extra hour needs a Con save, DC 10 + 1 per hour beyond 8. */
export function forcedMarchSaveDc(hoursTraveled: number): number | null {
  return hoursTraveled <= 8 ? null : 10 + (hoursTraveled - 8);
}

// ---------------------------------------------------------------- jumping (PHB p.182)

/** Long jump distance in feet: Strength score with a 10 ft run-up, half without. */
export const longJumpFeet = (str: number, runningStart = true) => (runningStart ? str : Math.floor(str / 2));

/** High jump height in feet: 3 + Strength modifier (min 0) with a run-up, half without. */
export function highJumpFeet(str: number, runningStart = true) {
  const full = Math.max(0, 3 + abilityModifier(str));
  return runningStart ? full : Math.floor(full / 2);
}

/** How high you can reach during a high jump: jump height plus 1.5 times your height. */
export const highJumpReach = (jumpFeet: number, heightFeet: number) => jumpFeet + heightFeet * 1.5;

// ---------------------------------------------------------------- environment (PHB p.183)

/** Falling: 1d6 per 10 feet, max 20d6, and the creature lands prone. */
export function fallDamage(feet: number, rng: Rng = cryptoRng) {
  const dice = Math.min(20, Math.floor(feet / 10));
  if (dice < 1) return { dice: 0, damage: 0, prone: false };
  return { dice, damage: rollExpression(`${dice}d6`, rng).total, prone: true };
}

/** Hold breath for 1 + Con modifier minutes (minimum 30 seconds), returned in seconds. */
export function holdBreathSeconds(con: number) {
  return Math.max(30, (1 + abilityModifier(con)) * 60);
}

/** After running out of breath: Con modifier rounds (minimum 1) before dropping to 0 HP. */
export const roundsUntilDying = (con: number) => Math.max(1, abilityModifier(con));

/** Days without food before exhaustion starts: 3 + Con modifier (minimum 1). */
export const daysWithoutFood = (con: number) => Math.max(1, 3 + abilityModifier(con));

export type Climate = "normal" | "hot";
/** Pounds of food and gallons of water needed per day (hot weather doubles water). */
export const dailyRations = (climate: Climate = "normal") => ({ foodLbs: 1, waterGallons: climate === "hot" ? 2 : 1 });

// ---------------------------------------------------------------- carrying (PHB p.176)

export const carryingCapacity = (str: number) => str * 15;
export const pushDragLift = (str: number) => str * 30;

export type EncumbranceStatus = { status: "unencumbered" | "encumbered" | "heavily"; speedPenalty: number; disadvantage: boolean };

/** Variant encumbrance rule: over 5x Str is encumbered (-10 ft), over 10x Str heavily encumbered (-20 ft + disadvantage). */
export function encumbrance(str: number, weightLbs: number): EncumbranceStatus {
  if (weightLbs > str * 10) return { status: "heavily", speedPenalty: 20, disadvantage: true };
  if (weightLbs > str * 5) return { status: "encumbered", speedPenalty: 10, disadvantage: false };
  return { status: "unencumbered", speedPenalty: 0, disadvantage: false };
}

// ---------------------------------------------------------------- light and vision (PHB p.183, 151)

export type LightLevel = "bright" | "dim" | "darkness";

export const LIGHT_SOURCES = {
  candle: { bright: 5, dim: 10, hours: 1 },
  torch: { bright: 20, dim: 40, hours: 1 },
  lamp: { bright: 15, dim: 30, hours: 6 },
  "lantern-hooded": { bright: 30, dim: 60, hours: 6 },
  "lantern-bullseye": { bright: 60, dim: 120, hours: 6 },
} as const;

/** Light level at a distance from a source. */
export function lightAt(source: keyof typeof LIGHT_SOURCES, distanceFeet: number): LightLevel {
  const s = LIGHT_SOURCES[source];
  return distanceFeet <= s.bright ? "bright" : distanceFeet <= s.dim ? "dim" : "darkness";
}

/** What a creature effectively sees: darkvision treats darkness as dim and dim as bright within its radius. */
export function perceivedLight(actual: LightLevel, distanceFeet: number, darkvisionFeet = 0): LightLevel {
  if (darkvisionFeet < distanceFeet) return actual;
  return actual === "darkness" ? "dim" : "bright";
}

/** Perception checks relying on sight have disadvantage in dim light (lightly obscured). */
export const lightlyObscured = (level: LightLevel) => level === "dim";
export const heavilyObscured = (level: LightLevel) => level === "darkness";
