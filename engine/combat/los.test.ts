import { describe, expect, it } from "vitest";
import { lineOfSight, shortestPath, squaresBetweenPoints, visibleSquares } from "./los";

const walls = (...s: string[]) => new Set(s);

describe("line of sight", () => {
  it("lists the squares between two points", () => {
    expect(squaresBetweenPoints({ x: 0, y: 0 }, { x: 4, y: 0 })).toEqual([{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]);
    expect(squaresBetweenPoints({ x: 0, y: 0 }, { x: 1, y: 0 })).toEqual([]);
    expect(squaresBetweenPoints({ x: 0, y: 0 }, { x: 3, y: 3 })).toEqual([{ x: 1, y: 1 }, { x: 2, y: 2 }]);
  });
  it("is open with no walls and blocked by a wall on the line", () => {
    expect(lineOfSight({ x: 0, y: 5 }, { x: 8, y: 5 }, walls())).toBe(true);
    expect(lineOfSight({ x: 0, y: 5 }, { x: 8, y: 5 }, walls("4,5"))).toBe(false);
    expect(lineOfSight({ x: 0, y: 5 }, { x: 8, y: 5 }, walls("4,4", "4,6"))).toBe(true); // a gap in the wall
  });
  it("an adjacent square is always visible, even a wall face", () => {
    expect(lineOfSight({ x: 3, y: 3 }, { x: 4, y: 3 }, walls("4,3"))).toBe(true);
  });
  it("is symmetric for straight lines and sees along diagonals", () => {
    const w = walls("3,3");
    expect(lineOfSight({ x: 1, y: 1 }, { x: 6, y: 6 }, w)).toBe(false);
    expect(lineOfSight({ x: 6, y: 6 }, { x: 1, y: 1 }, w)).toBe(false);
  });
});

describe("fog of war", () => {
  it("shows a disc of squares and hides what is behind a wall", () => {
    const seen = visibleSquares([{ x: 5, y: 5 }], walls("7,4", "7,5", "7,6"), 4, 20, 20);
    expect(seen.has("5,5")).toBe(true);
    expect(seen.has("6,5")).toBe(true);
    expect(seen.has("7,5")).toBe(true); // the wall face
    expect(seen.has("9,5")).toBe(false); // behind it
    expect(seen.has("5,9")).toBe(true);
    expect(seen.has("5,10")).toBe(false); // beyond the radius
  });
  it("combines several viewers and stays on the map", () => {
    const seen = visibleSquares([{ x: 0, y: 0 }, { x: 10, y: 0 }], walls(), 2, 12, 5);
    expect(seen.has("2,0")).toBe(true);
    expect(seen.has("8,0")).toBe(true);
    expect(seen.has("5,0")).toBe(false);
    expect([...seen].every((k) => k.split(",").every((n) => Number(n) >= 0))).toBe(true);
  });
});

describe("walking around walls", () => {
  it("goes straight when open and around when blocked", () => {
    expect(shortestPath({ x: 0, y: 0 }, { x: 3, y: 0 }, walls(), 10, 10)).toHaveLength(3);
    const around = shortestPath({ x: 0, y: 2 }, { x: 4, y: 2 }, walls("2,0", "2,1", "2,2", "2,3", "2,4"), 10, 10);
    expect(around).not.toBeNull();
    expect(around!.length).toBeGreaterThan(4);
    expect(around!.some((p) => p.x === 2 && [0, 1, 2, 3, 4].includes(p.y))).toBe(false);
  });
  it("returns null when walled in or the goal is a wall", () => {
    const ring = walls("1,1", "2,1", "3,1", "1,2", "3,2", "1,3", "2,3", "3,3");
    expect(shortestPath({ x: 2, y: 2 }, { x: 8, y: 8 }, ring, 12, 12)).toBeNull();
    expect(shortestPath({ x: 0, y: 0 }, { x: 5, y: 5 }, walls("5,5"), 12, 12)).toBeNull();
    expect(shortestPath({ x: 0, y: 0 }, { x: 0, y: 0 }, walls(), 5, 5)).toEqual([]);
  });
});
