import { describe, expect, it } from "vitest";
import { foeList, narrate, plural, SCENES, titleFor } from "./story";

const seq = (n: number) => { let i = 0; return () => ((i++ * 0.41 + n) % 1); };

describe("the computer DM's narration", () => {
  it("lists foes naturally", () => {
    expect(foeList([{ name: "Wolf", count: 3 }])).toBe("3 Wolves");
    expect(foeList([{ name: "Ogre", count: 1 }])).toBe("an Ogre");
    expect(foeList([{ name: "Goblin", count: 4 }, { name: "Bugbear", count: 1 }])).toBe("4 Goblins and a Bugbear");
    expect(foeList([])).toBe("enemies");
  });

  it("writes every scene with no unfilled placeholders, for every theme", () => {
    for (const theme of ["crypt", "wilds", "bandits", "caves"]) {
      for (const kind of [...SCENES, "victory", "defeat"] as const) {
        for (let n = 0; n < 6; n++) {
          const text = narrate(kind, theme, seq(n / 7), { foes: "3 Skeletons", loot: "a silver ring", place: "the Old Mill" });
          expect(text, `${theme}/${kind}`).not.toMatch(/\{\w+\}/);
          expect(text.length).toBeGreaterThan(20);
        }
      }
    }
  });

  it("pluralizes creature names", () => {
    expect([plural("Wolf"), plural("Swarm of Ravens"), plural("Giant Spider"), plural("Ogre"), plural("Wolf")]).toEqual(["Wolves", "Swarms of Ravens", "Giant Spiders", "Ogres", "Wolves"]);
    expect(plural("Bugbear")).toBe("Bugbears");
    expect(plural("Harpy")).toBe("Harpies");
    expect(plural("Lich")).toBe("Liches");
  });

  it("capitalizes the start of sentences, even when a foe list opens one", () => {
    const text = narrate("fight-1", "crypt", () => 0.5, { foes: "a Skeleton and 3 Zombies" });
    expect(text).toMatch(/(^|\. )A Skeleton/);
  });

  it("works the foes and the loot into the text", () => {
    expect(narrate("fight-1", "crypt", seq(0.1), { foes: "3 Skeletons" })).toContain("3 Skeletons");
    expect(narrate("rest-1", "wilds", seq(0.2), { loot: "a silver ring" })).toContain("a silver ring");
    expect(narrate("intro", "bandits", seq(0.3), { place: "Corrow Mill" })).toContain("Corrow Mill");
  });

  it("titles chapters", () => {
    expect(titleFor("caves", 2, seq(0.5))).toMatch(/^Chapter 2: /);
  });
});
