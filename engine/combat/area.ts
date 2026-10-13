import type { Point } from "./grid";

export type AreaSpec =
  | { shape: "sphere" | "cylinder"; radius: number }
  | { shape: "cube"; side: number }
  | { shape: "cone"; length: number }
  | { shape: "line"; length: number; width: number };

/** Squares are 5 feet. */
const SQ = 5;
const key = (p: Point) => `${p.x},${p.y}`;

/**
 * The grid squares an area covers, as "x,y" keys.
 *
 * `origin` is the caster for cones, lines and "self" cubes, or the chosen point for spheres, cylinders and point cubes.
 * `toward` is a square that sets the direction for cones, lines and self cubes. Distances use square centers.
 */
export function areaSquares(spec: AreaSpec, origin: Point, toward?: Point, opts: { width: number; height: number; fromSelf?: boolean } = { width: 40, height: 40 }): Set<string> {
  const out = new Set<string>();
  const add = (p: Point) => {
    if (p.x >= 0 && p.y >= 0 && p.x < opts.width && p.y < opts.height) out.add(key(p));
  };
  const dir = toward ? { x: toward.x - origin.x, y: toward.y - origin.y } : { x: 1, y: 0 };
  const len = Math.hypot(dir.x, dir.y) || 1;
  const unit = { x: dir.x / len, y: dir.y / len };

  switch (spec.shape) {
    case "sphere":
    case "cylinder": {
      const r = spec.radius / SQ;
      const reach = Math.ceil(r);
      for (let dx = -reach; dx <= reach; dx++) for (let dy = -reach; dy <= reach; dy++) if (Math.hypot(dx, dy) <= r + 0.001) add({ x: origin.x + dx, y: origin.y + dy });
      break;
    }
    case "cube": {
      const side = spec.side / SQ;
      if (opts.fromSelf) {
        // one face touches the caster; extend along the dominant axis toward the target
        const horizontal = Math.abs(dir.x) >= Math.abs(dir.y);
        const sx = Math.sign(dir.x) || 1;
        const sy = Math.sign(dir.y) || 1;
        for (let a = 1; a <= side; a++) {
          for (let b = 0; b < side; b++) {
            const off = b - Math.floor((side - 1) / 2);
            add(horizontal ? { x: origin.x + sx * a, y: origin.y + off } : { x: origin.x + off, y: origin.y + sy * a });
          }
        }
      } else {
        const lo = -Math.floor((side - 1) / 2);
        for (let dx = 0; dx < side; dx++) for (let dy = 0; dy < side; dy++) add({ x: origin.x + lo + dx, y: origin.y + lo + dy });
      }
      break;
    }
    case "cone": {
      // width equals distance from the origin: a half-angle of about 26.6 degrees (PHB p.204)
      const length = spec.length / SQ;
      const cos = Math.cos(Math.atan(0.5));
      const reach = Math.ceil(length);
      for (let dx = -reach; dx <= reach; dx++) {
        for (let dy = -reach; dy <= reach; dy++) {
          if (!dx && !dy) continue;
          const d = Math.hypot(dx, dy);
          if (Math.max(Math.abs(dx), Math.abs(dy)) > length + 0.001) continue;
          if ((dx * unit.x + dy * unit.y) / d >= cos - 0.001) add({ x: origin.x + dx, y: origin.y + dy });
        }
      }
      break;
    }
    case "line": {
      const length = spec.length / SQ;
      const halfWidth = spec.width / SQ / 2;
      const reach = Math.ceil(length);
      for (let dx = -reach; dx <= reach; dx++) {
        for (let dy = -reach; dy <= reach; dy++) {
          if (!dx && !dy) continue;
          const along = dx * unit.x + dy * unit.y;
          const across = Math.abs(dx * unit.y - dy * unit.x);
          if (along > 0.001 && along <= length + 0.001 && across <= halfWidth + 0.001) add({ x: origin.x + dx, y: origin.y + dy });
        }
      }
      break;
    }
  }
  return out;
}

/** Which of these creatures stand inside the area. The caster is excluded from areas that start at them. */
export function creaturesInArea<T extends { id: string; x: number | null; y: number | null }>(squares: ReadonlySet<string>, creatures: T[], excludeId?: string): T[] {
  return creatures.filter((c) => c.id !== excludeId && c.x !== null && c.y !== null && squares.has(`${c.x},${c.y}`));
}
