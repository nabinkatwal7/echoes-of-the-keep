import { ABILITIES, type Ability, type AbilityScores } from "./index";
import { cryptoRng, rollExpression, type Rng } from "../dice";

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_COSTS: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

export type Validation = { valid: boolean; errors: string[] };

export function validateStandardArray(scores: AbilityScores): Validation {
  const used = ABILITIES.map((a) => scores[a]).sort((a, b) => b - a);
  const expected = [...STANDARD_ARRAY];
  const valid = used.length === expected.length && used.every((n, i) => n === expected[i]);
  return { valid, errors: valid ? [] : [`Use each of ${expected.join(", ")} exactly once`] };
}

export function pointBuyCost(scores: AbilityScores): number {
  return ABILITIES.reduce((sum, a) => sum + (POINT_BUY_COSTS[scores[a]] ?? Infinity), 0);
}

export function validatePointBuy(scores: AbilityScores): Validation {
  const errors: string[] = [];
  for (const a of ABILITIES) {
    if (!(scores[a] in POINT_BUY_COSTS)) errors.push(`${a.toUpperCase()} must be between 8 and 15 before racial bonuses`);
  }
  if (!errors.length) {
    const cost = pointBuyCost(scores);
    if (cost > POINT_BUY_BUDGET) errors.push(`Spent ${cost} points, budget is ${POINT_BUY_BUDGET}`);
  }
  return { valid: errors.length === 0, errors };
}

/** Six 4d6-drop-lowest results, unassigned and sorted high to low. */
export function rollAbilityScores(rng: Rng = cryptoRng): number[] {
  return Array.from({ length: 6 }, () => rollExpression("4d6kh3", rng).total).sort((a, b) => b - a);
}

/** Assign rolled values to abilities; the multiset must match what was rolled. */
export function validateRolledAssignment(rolled: number[], scores: AbilityScores): Validation {
  const used = ABILITIES.map((a: Ability) => scores[a]).sort((a, b) => b - a);
  const expected = [...rolled].sort((a, b) => b - a);
  const valid = used.length === expected.length && used.every((n, i) => n === expected[i]);
  return { valid, errors: valid ? [] : ["Assigned scores must match the rolled values"] };
}
