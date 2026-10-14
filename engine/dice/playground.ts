import { parseDice } from "./parse";
import { cryptoRng, rollExpression, type Rng, type RollMode, type RollResult } from "./roll";

export type PlaygroundInput = { formula: string; bonus: number; mode: RollMode };

export type PlaygroundResult =
  | { ok: false; error: string }
  | {
      ok: true;
      total: number;
      /** every roll made: one normally, two with advantage or disadvantage */
      rolls: RollResult[];
      /** which of `rolls` counts */
      used: number;
      bonus: number;
      /** advantage or disadvantage only applies to a formula that has a d20 in it */
      modeApplied: RollMode;
      /** natural 20 or natural 1 on a lone d20 */
      natural: "crit" | "fumble" | null;
    };

/**
 * Rolls a dice formula the way the table does: "1d20+5", "4d6kh3", "2d8+1d6+3". A flat bonus is added on top, and
 * advantage or disadvantage rolls the whole formula twice and keeps the better or worse total (only when it has a d20).
 */
export function rollPlayground(input: PlaygroundInput, rng: Rng = cryptoRng): PlaygroundResult {
  let parsed;
  try {
    parsed = parseDice(input.formula);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "That is not a dice formula." };
  }
  const bonus = Number.isFinite(input.bonus) ? Math.trunc(input.bonus) : 0;
  const hasD20 = parsed.terms.some((t) => t.sides === 20 && t.sign === 1);
  const mode: RollMode = hasD20 ? input.mode : "normal";
  const rolls = [rollExpression(parsed, rng)];
  if (mode !== "normal") rolls.push(rollExpression(parsed, rng));
  let used = 0;
  if (rolls.length === 2) {
    const [a, b] = rolls;
    used = mode === "advantage" ? (b.total > a.total ? 1 : 0) : b.total < a.total ? 1 : 0;
  }
  const picked = rolls[used];
  let natural: "crit" | "fumble" | null = null;
  if (parsed.terms.length === 1 && parsed.terms[0].sides === 20 && picked.terms[0].kept.length === 1) {
    const n = picked.terms[0].kept[0];
    natural = n === 20 ? "crit" : n === 1 ? "fumble" : null;
  }
  return { ok: true, total: picked.total + bonus, rolls, used, bonus, modeApplied: mode, natural };
}
