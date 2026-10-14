import { describe, expect, it } from "vitest";
import { Canvas, hashString, seeded } from "./canvas";
import { HERO_CLASSES, HERO_H, HERO_W, folkSprite, heroSprite } from "./heroes";
import { MONSTER_SHAPES, MON_H, MON_W, monsterSprite, shapeFor } from "./monsters";
import { SCENE_H, SCENE_THEMES, SCENE_W, sceneSprite } from "./scenes";
import { ICONS, ICON_SIZE } from "./icons";
import { FIRE_H, FIRE_W, LEAF_H, LEAF_W, RIDGE_H, RIDGE_W, SKY_H, SKY_W, campfireSprite, foliageSprite, ridgeSprite, skySprite } from "./vista";
import type { Sprite } from "./canvas";

/** A sprite is valid when every row is the same width and every colour it uses is in its palette. */
function problems(s: Sprite, w: number, h: number): string[] {
  const out: string[] = [];
  if (s.rows.length !== h) out.push(`height ${s.rows.length}, expected ${h}`);
  s.rows.forEach((r, i) => {
    if (r.length !== w) out.push(`row ${i} is ${r.length} wide, expected ${w}`);
    for (const ch of r) if (ch !== "." && !(ch in s.palette)) out.push(`row ${i} uses "${ch}" which is not in the palette`);
  });
  for (const [k, v] of Object.entries(s.palette)) if (!/^#[0-9a-f]{6}$/i.test(v)) out.push(`palette ${k} is not a colour: ${v}`);
  return out;
}
const filled = (s: Sprite) => s.rows.join("").replace(/\./g, "").length;

describe("canvas", () => {
  it("draws, mirrors and outlines", () => {
    const c = new Canvas(6, 5);
    c.rect(2, 1, 2, 2, "a").sym(0, 4, "b").px(99, 99, "z");
    expect(c.rows()[1]).toBe("..aa..");
    expect(c.rows()[4]).toBe("b....b");
    c.outline("o");
    expect(c.rows()[0]).toBe("..oo..");
    expect(c.rows()[1]).toBe(".oaao.");
  });
  it("draws lines and ovals inside the bounds", () => {
    const c = new Canvas(8, 8).line(0, 0, 7, 7, "x").oval(4, 4, 2, 2, "y");
    expect(c.get(3, 3)).toBe("y");
    expect(c.get(0, 0)).toBe("x");
    expect(c.get(7, 7)).toBe("x");
  });
  it("hashes and seeds deterministically", () => {
    expect(hashString("Mirela")).toBe(hashString("Mirela"));
    expect(hashString("a")).not.toBe(hashString("b"));
    const a = seeded(5);
    const b = seeded(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("hero sprites", () => {
  it("every class draws a complete, valid sprite", () => {
    expect(HERO_CLASSES).toHaveLength(12);
    for (const k of HERO_CLASSES) {
      const s = heroSprite(k, 1);
      expect(problems(s, HERO_W, HERO_H), k).toEqual([]);
      expect(filled(s), k).toBeGreaterThan(70);
    }
  });
  it("classes look different from one another", () => {
    const rows = new Set(HERO_CLASSES.map((k) => heroSprite(k, 1).rows.join("")));
    expect(rows.size).toBe(HERO_CLASSES.length);
  });
  it("the same name always gets the same look, and names vary the colours", () => {
    expect(heroSprite("wizard", "Mirela")).toEqual(heroSprite("wizard", "Mirela"));
    const looks = new Set(["Ann", "Bo", "Cy", "Dee", "Eli", "Flo", "Gus", "Hal"].map((n) => JSON.stringify(heroSprite("rogue", n).palette)));
    expect(looks.size).toBeGreaterThan(2);
  });
  it("unknown classes fall back to a fighter, and folk are valid", () => {
    expect(problems(heroSprite("artificer", 3), HERO_W, HERO_H)).toEqual([]);
    expect(problems(folkSprite("Garrick the Gatekeeper"), HERO_W, HERO_H)).toEqual([]);
  });
});

describe("monster sprites", () => {
  it("every shape is valid and filled", () => {
    for (const shape of MONSTER_SHAPES) {
      const typeFor: Record<string, [string, string]> = {
        beast: ["beast", "Wolf"], skeleton: ["undead", "Skeleton"], ghost: ["undead", "Ghost"], humanoid: ["humanoid", "Bandit"], dragon: ["dragon", "Red Dragon Wyrmling"],
        slime: ["ooze", "Gray Ooze"], spider: ["beast", "Giant Spider"], bat: ["beast", "Swarm of Bats"], fiend: ["fiend", "Imp"], giant: ["giant", "Ogre"],
        construct: ["construct", "Animated Armor"], plant: ["plant", "Shrieker"], eye: ["aberration", "Gibbering Mouther"], wisp: ["elemental", "Fire Elemental"],
        serpent: ["beast", "Constrictor Snake"], fey: ["fey", "Sprite"],
      };
      const [t, n] = typeFor[shape];
      expect(shapeFor(t, n), shape).toBe(shape);
      const s = monsterSprite(t, n);
      expect(problems(s, MON_W, MON_H), shape).toEqual([]);
      expect(filled(s), shape).toBeGreaterThan(40);
    }
  });
  it("picks a sensible shape for the creatures in the rules", () => {
    expect(shapeFor("Medium beast", "Wolf")).toBe("beast");
    expect(shapeFor("Medium undead", "Zombie")).toBe("humanoid");
    expect(shapeFor("Large giant", "Hill Giant")).toBe("giant");
    expect(shapeFor(null, "Goblin")).toBe("humanoid");
    expect(shapeFor("Tiny beast", "Raven")).toBe("bat");
  });
  it("two creatures of one kind can differ", () => {
    const looks = new Set(["Wolf 1", "Wolf 2", "Wolf 3", "Wolf 4", "Wolf 5"].map((n) => JSON.stringify(monsterSprite("beast", "Wolf", n).palette)));
    expect(looks.size).toBeGreaterThan(1);
  });
});

describe("scenes", () => {
  it("every theme draws a full banner", () => {
    for (const t of SCENE_THEMES) {
      const s = sceneSprite(t, 4);
      expect(problems(s, SCENE_W, SCENE_H), t).toEqual([]);
      expect(filled(s), t).toBe(SCENE_W * SCENE_H); // the sky and ground cover every pixel
    }
  });
  it("the seed changes the details and the same seed repeats them", () => {
    expect(sceneSprite("wilds", 1)).toEqual(sceneSprite("wilds", 1));
    expect(sceneSprite("wilds", 1).rows.join("")).not.toBe(sceneSprite("wilds", 2).rows.join(""));
  });
});

describe("landing scene pieces", () => {
  it("sky, ridge, campfire frames and foliage are rectangular and use only palette colours", () => {
    for (const [s, w, h] of [[skySprite(), SKY_W, SKY_H], [ridgeSprite(), RIDGE_W, RIDGE_H], [campfireSprite(0), FIRE_W, FIRE_H], [campfireSprite(1), FIRE_W, FIRE_H], [foliageSprite(), LEAF_W, LEAF_H]] as const) {
      expect(problems(s, w, h)).toEqual([]);
      expect(filled(s)).toBeGreaterThan(40);
    }
  });
  it("the two fire frames differ so the flame can dance", () => {
    expect(campfireSprite(0).rows.join("")).not.toBe(campfireSprite(1).rows.join(""));
  });
});

describe("section icons", () => {
  it("every icon is 12 by 12 and has pixels", () => {
    for (const [name, s] of Object.entries(ICONS)) {
      expect(problems(s, ICON_SIZE, ICON_SIZE), name).toEqual([]);
      expect(filled(s), name).toBeGreaterThan(25);
    }
  });
});
