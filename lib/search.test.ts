import { describe, expect, it } from "vitest";
import { rank } from "./search";

describe("rank", () => {
  it("puts exact matches first, then prefixes, then word starts, then substrings", () => {
    const hits = ["Mage Armor", "Fire", "Wall of Fire", "Fireball", "Campfire"].map((title) => ({ title }));
    expect(rank(hits, "fire").map((h) => h.title)).toEqual(["Fire", "Fireball", "Wall of Fire", "Campfire", "Mage Armor"]);
  });
  it("prefers shorter names within a tier", () => {
    const hits = [{ title: "Cure Wounds" }, { title: "Cure" }];
    expect(rank(hits, "cure")[0].title).toBe("Cure");
  });
});
