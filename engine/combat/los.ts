import type { Point } from "./grid";

const key = (p: Point) => `${p.x},${p.y}`;

/** The squares a straight line from `a` to `b` passes through, excluding both ends (a supercover-style Bresenham). */
export function squaresBetweenPoints(a: Point, b: Point): Point[] {
  const out: Point[] = [];
  let x = a.x;
  let y = a.y;
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  const sx = Math.sign(b.x - a.x);
  const sy = Math.sign(b.y - a.y);
  let err = dx - dy;
  while (x !== b.x || y !== b.y) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
    if (x !== b.x || y !== b.y) out.push({ x, y });
  }
  return out;
}

/** True when no wall stands on the line between the two squares. Walls block sight but a creature in the way does not. */
export function lineOfSight(a: Point, b: Point, walls: ReadonlySet<string>): boolean {
  if (!walls.size) return true;
  return squaresBetweenPoints(a, b).every((p) => !walls.has(key(p)));
}

/**
 * Every square any of the viewers can see within `radiusSquares` (a circle of Chebyshev distance), unblocked by walls.
 * A wall square itself is visible when a clear line reaches it, so a lit wall face shows.
 */
export function visibleSquares(viewers: Point[], walls: ReadonlySet<string>, radiusSquares: number, width: number, height: number): Set<string> {
  const out = new Set<string>();
  for (const v of viewers) {
    for (let dx = -radiusSquares; dx <= radiusSquares; dx++) {
      for (let dy = -radiusSquares; dy <= radiusSquares; dy++) {
        const p = { x: v.x + dx, y: v.y + dy };
        if (p.x < 0 || p.y < 0 || p.x >= width || p.y >= height || out.has(key(p))) continue;
        if (lineOfSight(v, p, walls)) out.add(key(p));
      }
    }
  }
  return out;
}

/** The cheapest walk from `from` to `to` around walls and blockers (8 directions, 5 ft each), or null if boxed in. */
export function shortestPath(from: Point, to: Point, blocked: ReadonlySet<string>, width: number, height: number): Point[] | null {
  if (key(from) === key(to)) return [];
  if (to.x < 0 || to.y < 0 || to.x >= width || to.y >= height || blocked.has(key(to))) return null;
  const prev = new Map<string, Point | null>([[key(from), null]]);
  const queue: Point[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const n = { x: cur.x + dx, y: cur.y + dy };
        if (n.x < 0 || n.y < 0 || n.x >= width || n.y >= height || prev.has(key(n)) || blocked.has(key(n))) continue;
        prev.set(key(n), cur);
        if (key(n) === key(to)) {
          const path: Point[] = [];
          let at: Point | null = n;
          while (at && key(at) !== key(from)) {
            path.unshift(at);
            at = prev.get(key(at)) ?? null;
          }
          return path;
        }
        queue.push(n);
      }
    }
  }
  return null;
}
