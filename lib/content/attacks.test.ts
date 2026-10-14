import { describe, expect, it } from "vitest";
import { crLabel, crValue, parseAttacks } from "./attacks";

describe("parseAttacks", () => {
  it("reads every attack from a stat block", () => {
    const text =
      "Nimble Escape. The goblin can take the Disengage or Hide action as a bonus action on each of its turns. Scimitar. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage. Shortbow. Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.";
    expect(parseAttacks(text)).toEqual([
      { name: "Scimitar", bonus: 4, damage: "1d6+2", kind: "slashing" },
      { name: "Shortbow", bonus: 4, damage: "1d6+2", kind: "piercing" },
    ]);
  });
  it("keeps the first damage roll when there is extra damage", () => {
    const a = parseAttacks("Bite. Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 19 (2d10 + 8) piercing damage plus 7 (2d6) fire damage.");
    expect(a[0]).toMatchObject({ name: "Bite", bonus: 14, damage: "2d10+8" });
  });
  it("returns nothing for creatures with no weapon attacks", () => {
    expect(parseAttacks("Immune to fire. It glows.")).toEqual([]);
  });
});

describe("challenge rating", () => {
  it("turns fractions and plain numbers into values", () => {
    expect(crValue("1/4 (50 XP)")).toBe(0.25);
    expect(crValue("17 (18,000 XP)")).toBe(17);
    expect(crValue(null)).toBe(0);
    expect(crLabel(0.5)).toBe("1/2");
    expect(crLabel(3)).toBe("3");
  });
});
