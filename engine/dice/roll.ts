import { parseDice, type DiceExpression } from "./parse";

/** Returns a float in [0, 1). Inject a seeded one in tests. */
export type Rng = () => number;

export const cryptoRng: Rng = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
};

/** Small deterministic RNG (mulberry32) for tests and replays. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type TermResult = { sides: number; sign: 1 | -1; rolls: number[]; kept: number[]; subtotal: number };
export type RollResult = { expression: string; terms: TermResult[]; modifier: number; total: number };

const die = (sides: number, rng: Rng) => Math.floor(rng() * sides) + 1;

export function rollExpression(expr: string | DiceExpression, rng: Rng = cryptoRng): RollResult {
  const parsed = typeof expr === "string" ? parseDice(expr) : expr;
  const terms = parsed.terms.map((t): TermResult => {
    const rolls = Array.from({ length: t.count }, () => die(t.sides, rng));
    let kept = rolls;
    if (t.keep) {
      const sorted = [...rolls].sort((a, b) => (t.keep!.mode === "h" ? b - a : a - b));
      kept = sorted.slice(0, t.keep.n);
    }
    return { sides: t.sides, sign: t.sign, rolls, kept, subtotal: t.sign * kept.reduce((s, n) => s + n, 0) };
  });
  const total = terms.reduce((s, t) => s + t.subtotal, 0) + parsed.modifier;
  return { expression: parsed.source, terms, modifier: parsed.modifier, total };
}

export type RollMode = "normal" | "advantage" | "disadvantage";

/**
 * Advantage/disadvantage: any number of each cancels to a straight roll (PHB p.173).
 */
export function resolveRollMode(sources: { advantage: number; disadvantage: number }): RollMode {
  if (sources.advantage > 0 && sources.disadvantage > 0) return "normal";
  if (sources.advantage > 0) return "advantage";
  if (sources.disadvantage > 0) return "disadvantage";
  return "normal";
}

export type D20Result = {
  mode: RollMode;
  /** both dice when rolling with advantage/disadvantage */
  dice: number[];
  natural: number;
  modifier: number;
  total: number;
  critical: boolean;
  fumble: boolean;
};

export function rollD20(modifier = 0, mode: RollMode = "normal", rng: Rng = cryptoRng): D20Result {
  const dice = mode === "normal" ? [die(20, rng)] : [die(20, rng), die(20, rng)];
  const natural = mode === "disadvantage" ? Math.min(...dice) : Math.max(...dice);
  return { mode, dice, natural, modifier, total: natural + modifier, critical: natural === 20, fumble: natural === 1 };
}
