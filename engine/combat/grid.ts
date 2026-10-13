export type Point = { x: number; y: number };

/** Squares are 5 feet. Diagonals cost 5 feet, as in the handbook's basic rule (PHB p.192). */
export const SQUARE_FEET = 5;

export const squaresBetween = (a: Point, b: Point) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export const distanceFeet = (a: Point, b: Point) => squaresBetween(a, b) * SQUARE_FEET;

export const withinFiveFeet = (a: Point, b: Point) => squaresBetween(a, b) <= 1 && !(a.x === b.x && a.y === b.y);

export type MoveCheck = { ok: true; feet: number } | { ok: false; reason: string };

export type MoveOptions = {
  /** squares that cost double movement (difficult terrain), by "x,y" */
  difficult?: ReadonlySet<string>;
  /** squares blocked by walls or enemies you cannot pass */
  blocked?: ReadonlySet<string>;
  /** moving while prone (crawling) costs 1 extra foot per foot (PHB p.190) */
  crawling?: boolean;
  width: number;
  height: number;
};

/** Cost in feet to move one square at a time along `path` (the squares entered, not the start). */
export function pathCost(path: Point[], opts: MoveOptions): MoveCheck {
  let feet = 0;
  for (const p of path) {
    if (p.x < 0 || p.y < 0 || p.x >= opts.width || p.y >= opts.height) return { ok: false, reason: "That square is off the map" };
    const key = `${p.x},${p.y}`;
    if (opts.blocked?.has(key)) return { ok: false, reason: "That square is blocked" };
    const step = SQUARE_FEET * (opts.difficult?.has(key) ? 2 : 1) * (opts.crawling ? 2 : 1);
    feet += step;
  }
  return { ok: true, feet };
}

/** A straight (Chebyshev) path from a to b, excluding a, including b. Good enough for open ground. */
export function straightPath(a: Point, b: Point): Point[] {
  const out: Point[] = [];
  let { x, y } = a;
  while (x !== b.x || y !== b.y) {
    x += Math.sign(b.x - x);
    y += Math.sign(b.y - y);
    out.push({ x, y });
  }
  return out;
}

/** Cost to move from a to b in a straight line. */
export function moveCost(a: Point, b: Point, opts: MoveOptions): MoveCheck {
  return pathCost(straightPath(a, b), opts);
}

/**
 * Which enemies get an opportunity attack for a move: those whose reach covered the mover at the start
 * and does not cover the mover at the end (PHB p.195).
 */
export function opportunityAttackers(from: Point, to: Point, enemies: { id: string; at: Point; reach: number }[]): string[] {
  return enemies
    .filter((e) => distanceFeet(e.at, from) <= e.reach && distanceFeet(e.at, to) > e.reach)
    .map((e) => e.id);
}
