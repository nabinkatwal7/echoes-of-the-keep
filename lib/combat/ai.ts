import type { Point } from "@/engine/combat/grid";
import { distanceFeet, squaresBetween } from "@/engine/combat/grid";
import type { AttackProfile, Cmb } from "./rules";

/** Average damage of one attack's dice and flat modifier. */
export function averageDamage(p: Pick<AttackProfile, "dice" | "modifier">): number {
  let total = p.modifier;
  for (const m of p.dice.matchAll(/([+-]?)(\d+)d(\d+)/g)) total += (m[1] === "-" ? -1 : 1) * Number(m[2]) * ((Number(m[3]) + 1) / 2);
  return Math.max(0, total);
}

/** Chance a d20 attack hits armor class `ac` (a 1 always misses, a 20 always hits). */
export const hitChance = (toHit: number, ac: number) => Math.min(0.95, Math.max(0.05, (21 - (ac - toHit)) / 20));

export const expectedDamage = (p: AttackProfile, ac: number) => hitChance(p.toHit, ac) * averageDamage(p);

export type MonsterPlan =
  | { kind: "attack"; targetId: string; attack: string; moveTo: Point | null; attacks: number; note: string }
  | { kind: "pass"; note: string };

type Foe = Pick<Cmb, "id" | "name" | "ac" | "hp" | "x" | "y" | "defeated" | "hidden">;

const key = (p: Point) => `${p.x},${p.y}`;

/**
 * Decide a monster's turn: pick the foe it can hurt most (finishing weak ones first), the attack with the best expected
 * damage that can reach after moving, and the square to walk to. Pure, so the table can see and test the reasoning.
 */
export function planMonsterTurn(input: {
  self: Pick<Cmb, "id" | "x" | "y" | "turn" | "attacksPerAction" | "name">;
  profiles: AttackProfile[];
  foes: Foe[];
  /** squares other creatures stand on or walls block */
  occupied: ReadonlySet<string>;
  width: number;
  height: number;
}): MonsterPlan {
  const { self, profiles, width, height } = input;
  if (self.x === null || self.y === null) return { kind: "pass", note: `${self.name} is not on the map` };
  if (!profiles.length) return { kind: "pass", note: `${self.name} has no attacks to use` };
  const me = { x: self.x, y: self.y };
  const speedSquares = Math.floor(self.turn.movement / 5);
  const foes = input.foes.filter((f) => !f.defeated && f.hp > 0 && f.x !== null && f.y !== null);
  if (!foes.length) return { kind: "pass", note: "No foes are left to fight" };

  type Option = { foe: Foe; profile: AttackProfile; moveTo: Point | null; score: number };
  const options: Option[] = [];
  for (const foe of foes) {
    const at = { x: foe.x!, y: foe.y! };
    for (const profile of profiles) {
      const reach = profile.melee ? (profile.reach ?? 5) : (profile.range?.normal ?? 30);
      const dist = distanceFeet(me, at);
      let moveTo: Point | null = null;
      if (dist > reach) {
        moveTo = approach(me, at, reach, speedSquares, input.occupied, width, height);
        if (!moveTo) continue;
      }
      const from = moveTo ?? me;
      if (distanceFeet(from, at) > reach) continue;
      // ranged attacks within 5 feet of an enemy have disadvantage, so a little less value
      const penalty = !profile.melee && distanceFeet(from, at) <= 5 ? 0.5 : 1;
      const dmg = expectedDamage(profile, foe.ac) * penalty;
      // prefer foes it can kill, then foes already hurt, then the nearest
      const kill = dmg >= foe.hp ? 1000 : 0;
      const wounded = 100 / Math.max(1, foe.hp);
      const near = -squaresBetween(from, at) * 0.1 - (moveTo ? 5 : 0) * 0.01;
      options.push({ foe, profile, moveTo, score: dmg + kill + wounded + near });
    }
  }
  if (!options.length) {
    // nothing reachable: close the distance to the nearest foe with a Dash-free move
    const nearest = [...foes].sort((a, b) => squaresBetween(me, { x: a.x!, y: a.y! }) - squaresBetween(me, { x: b.x!, y: b.y! }))[0];
    const step = approach(me, { x: nearest.x!, y: nearest.y! }, 5, speedSquares, input.occupied, width, height);
    return step ? { kind: "attack", targetId: nearest.id, attack: profiles[0].name, moveTo: step, attacks: 0, note: `${self.name} advances on ${nearest.name}` } : { kind: "pass", note: `${self.name} cannot reach anyone this turn` };
  }
  options.sort((a, b) => b.score - a.score);
  const best = options[0];
  const attacks = Math.max(1, self.attacksPerAction ?? 1);
  return {
    kind: "attack",
    targetId: best.foe.id,
    attack: best.profile.name,
    moveTo: best.moveTo,
    attacks,
    note: `${self.name} ${best.moveTo ? "moves and " : ""}attacks ${best.foe.name} with ${best.profile.name}`,
  };
}

/** The reachable free square closest to the foe that is within `reachFeet` of it, walking at most `steps` squares. */
export function approach(from: Point, to: Point, reachFeet: number, steps: number, occupied: ReadonlySet<string>, width: number, height: number): Point | null {
  if (steps < 1) return null;
  // breadth-first search over squares within `steps`, so walls and bodies are walked around
  const seen = new Map<string, number>([[key(from), 0]]);
  const queue: Point[] = [from];
  let best: { p: Point; d: number; cost: number } | null = null;
  while (queue.length) {
    const cur = queue.shift()!;
    const cost = seen.get(key(cur))!;
    const d = distanceFeet(cur, to);
    if (d <= reachFeet && key(cur) !== key(from) && (!best || cost < best.cost || (cost === best.cost && d > best.d))) best = { p: cur, d, cost };
    if (cost >= steps) continue;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const n = { x: cur.x + dx, y: cur.y + dy };
        if (n.x < 0 || n.y < 0 || n.x >= width || n.y >= height || seen.has(key(n)) || occupied.has(key(n))) continue;
        seen.set(key(n), cost + 1);
        queue.push(n);
      }
    }
  }
  if (best) return best.p;
  // could not get in range this turn: take the reachable square nearest to the target
  let nearest: { p: Point; d: number } | null = null;
  for (const k of seen.keys()) {
    const [x, y] = k.split(",").map(Number);
    const d = Math.hypot(x - to.x, y - to.y);
    if (k !== key(from) && (!nearest || d < nearest.d)) nearest = { p: { x, y }, d };
  }
  return nearest && nearest.d < Math.hypot(from.x - to.x, from.y - to.y) ? nearest.p : null;
}
