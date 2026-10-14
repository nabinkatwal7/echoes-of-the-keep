import { describe, expect, it } from "vitest";
import { readExplore } from "./exploreMap";

describe("exploration map", () => {
  it("falls back to a 12 by 8 map at 5 feet", () => {
    expect(readExplore(undefined)).toMatchObject({ width: 12, height: 8, scale: 5, tokens: [] });
  });
  it("keeps a token inside the grid and honors a custom scale", () => {
    const map = readExplore({ width: 10, height: 6, scale: 10, tokens: [{ id: "a", name: "Rogue", x: 3, y: 2 }] });
    expect(map.scale).toBe(10);
    expect(map.tokens).toEqual([{ id: "a", name: "Rogue", x: 3, y: 2 }]);
  });
});
