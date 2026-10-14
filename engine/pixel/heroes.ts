import { Canvas, hashString, pick, type Palette, type Sprite } from "./canvas";

/** Heroes are 16 wide and 18 tall: a big head, a short body, a weapon and a bit of gear that says what the class is. */
export const HERO_W = 16;
export const HERO_H = 18;

const SKIN = ["#f1c9a5", "#e0a878", "#c48a5c", "#8f5d3b", "#5e3b26"];
const SKIN_SHADE = ["#d9ab86", "#c58d5e", "#a86f45", "#744a2e", "#47291a"];
const HAIR = ["#3b2a1e", "#1c1c22", "#8a5a2b", "#d1ab4e", "#a33a2a", "#d8d2c4", "#5b3a6e"];

type Kit = { a: string; A: string; b: string; c: string; k: string };
const KITS: Record<string, Kit> = {
  fighter: { a: "#7d8a98", A: "#5b6674", b: "#b5483a", c: "#4a4f6a", k: "#4a3322" },
  paladin: { a: "#dde2e8", A: "#aab3bd", b: "#e0b941", c: "#6b3a5c", k: "#5a4630" },
  barbarian: { a: "#8a5a3a", A: "#684126", b: "#d9d2c0", c: "#5c4326", k: "#3a2a1a" },
  rogue: { a: "#3d4350", A: "#2a2e37", b: "#9aa4b2", c: "#2a2e37", k: "#1f1f26" },
  ranger: { a: "#4f8240", A: "#386030", b: "#c9a24b", c: "#6b5a3a", k: "#4a3322" },
  cleric: { a: "#ece6d4", A: "#c9c1a8", b: "#e0b941", c: "#ece6d4", k: "#6a5238" },
  druid: { a: "#6f9650", A: "#527538", b: "#c9a24b", c: "#6a5a3a", k: "#4a3a26" },
  monk: { a: "#e0802c", A: "#b8601a", b: "#f1d9a5", c: "#b8601a", k: "#4a3322" },
  bard: { a: "#a63e86", A: "#802c66", b: "#e0b941", c: "#3a3f6a", k: "#4a3322" },
  wizard: { a: "#3f56b8", A: "#2e4090", b: "#e0b941", c: "#3f56b8", k: "#3a2a1a" },
  sorcerer: { a: "#bd3d4e", A: "#8f2a38", b: "#e0b941", c: "#5a2a3a", k: "#3a2a1a" },
  warlock: { a: "#58307a", A: "#3e2058", b: "#7be0a8", c: "#3a2050", k: "#241a30" },
};

export const HERO_CLASSES = Object.keys(KITS);

export function heroPalette(classIndex: string, seed: number): Palette {
  const kit = KITS[classIndex] ?? KITS.fighter;
  const skin = Math.floor((seed % 997) % SKIN.length);
  return {
    o: "#1b1411", s: SKIN[skin], S: SKIN_SHADE[skin], h: pick(HAIR, seed, 3), e: "#1b1411",
    ...kit, m: "#cfd6dd", M: "#8e99a5", g: "#e6bd45", r: "#c2453a", w: "#f1ede2", p: "#9a6bd6", l: "#8fe3ff", n: "#7a5232",
  };
}

/** The common body: head, neck, torso with arms, legs and boots. Gear is drawn over it. */
function base(c: Canvas, oy: number) {
  // legs and boots
  c.rect(5, oy + 12, 2, 2, "c").rect(9, oy + 12, 2, 2, "c").rect(5, oy + 14, 2, 1, "k").rect(9, oy + 14, 2, 1, "k");
  // torso and arms
  c.rect(4, oy + 8, 8, 4, "a").rect(3, oy + 8, 1, 4, "a").rect(12, oy + 8, 1, 4, "a");
  c.rect(4, oy + 11, 8, 1, "A").px(3, oy + 11, "s").px(12, oy + 11, "s");
  c.rect(4, oy + 10, 8, 1, "b");
  // neck and head
  c.rect(7, oy + 7, 2, 1, "S").rect(5, oy + 1, 6, 6, "s");
  c.rect(5, oy + 1, 6, 2, "h").px(5, oy + 3, "h").px(10, oy + 3, "h");
  c.px(6, oy + 4, "e").px(9, oy + 4, "e").px(7, oy + 6, "S").px(8, oy + 6, "S");
}

const sword = (c: Canvas, oy: number, x = 13) => c.rect(x, oy + 2, 1, 7, "m").px(x, oy + 1, "w").rect(x - 1, oy + 9, 3, 1, "g").px(x, oy + 10, "n");
const staff = (c: Canvas, oy: number, x: number, top: string) => c.rect(x, oy + 3, 1, 11, "n").rect(x - 1, oy + 1, 3, 3, top);

const GEAR: Record<string, (c: Canvas, oy: number) => void> = {
  fighter: (c, oy) => {
    c.rect(5, oy, 6, 3, "m").px(5, oy + 3, "m").px(10, oy + 3, "m").rect(5, oy + 3, 6, 0, "m").px(7, oy - 0, "r").px(8, oy, "r");
    c.rect(6, oy + 3, 4, 1, "M");
    c.box(0, oy + 8, 3, 4, "a").px(1, oy + 9, "g").px(1, oy + 10, "g");
    sword(c, oy);
  },
  paladin: (c, oy) => {
    c.rect(5, oy, 6, 3, "m").px(5, oy + 3, "m").px(10, oy + 3, "m").px(7, oy, "g").px(8, oy, "g").rect(6, oy + 3, 4, 1, "M");
    c.rect(3, oy + 7, 1, 6, "r").rect(12, oy + 7, 1, 6, "r");
    c.px(7, oy + 9, "g").px(8, oy + 9, "g").px(7, oy + 8, "g").px(8, oy + 8, "g");
    sword(c, oy);
    c.box(0, oy + 8, 3, 4, "w").px(1, oy + 9, "g");
  },
  barbarian: (c, oy) => {
    c.rect(5, oy, 6, 2, "M").px(4, oy + 1, "w").px(3, oy, "w").px(11, oy + 1, "w").px(12, oy, "w");
    c.rect(4, oy + 8, 8, 1, "b");
    c.rect(13, oy + 1, 1, 10, "n").rect(14, oy + 1, 1, 4, "m").px(15, oy + 2, "m").px(15, oy + 3, "m");
    c.px(3, oy + 8, "s").px(12, oy + 8, "s").px(3, oy + 9, "s").px(12, oy + 9, "s").px(3, oy + 10, "s").px(12, oy + 10, "s");
  },
  rogue: (c, oy) => {
    c.rect(4, oy, 8, 4, "a").rect(5, oy + 3, 6, 3, "s").rect(4, oy + 3, 1, 5, "A").rect(11, oy + 3, 1, 5, "A").px(6, oy + 4, "e").px(9, oy + 4, "e");
    c.rect(5, oy + 5, 6, 2, "A");
    c.rect(13, oy + 6, 1, 4, "m").px(13, oy + 10, "g").rect(0, oy + 9, 1, 3, "m").px(0, oy + 12, "g");
  },
  ranger: (c, oy) => {
    c.rect(4, oy, 8, 3, "a").px(4, oy + 3, "a").px(11, oy + 3, "a").px(7, oy - 0, "A");
    c.rect(13, oy + 1, 1, 12, "n").px(12, oy + 2, "n").px(12, oy + 12, "n").px(14, oy + 6, "w").px(15, oy + 6, "w");
    c.rect(4, oy + 8, 1, 4, "n");
  },
  cleric: (c, oy) => {
    c.rect(5, oy, 6, 1, "g").rect(4, oy + 2, 1, 5, "w").rect(11, oy + 2, 1, 5, "w").rect(5, oy + 1, 6, 1, "w");
    c.px(7, oy + 9, "g").px(8, oy + 9, "g").px(7, oy + 8, "g").px(8, oy + 8, "g").px(7, oy + 10, "g").px(8, oy + 10, "g");
    c.rect(13, oy + 4, 1, 8, "n").rect(12, oy + 2, 3, 3, "g");
    c.box(0, oy + 8, 3, 4, "w").px(1, oy + 9, "g");
  },
  druid: (c, oy) => {
    c.rect(5, oy, 6, 1, "a").px(4, oy + 1, "a").px(11, oy + 1, "a").px(7, oy - 0, "g").px(5, oy + 1, "A").px(10, oy + 1, "A");
    staff(c, oy, 13, "a");
    c.rect(4, oy + 8, 8, 1, "n");
  },
  monk: (c, oy) => {
    c.rect(5, oy + 2, 6, 1, "r");
    c.rect(3, oy + 8, 1, 3, "s").rect(12, oy + 8, 1, 3, "s").px(3, oy + 11, "s").px(12, oy + 11, "s");
    c.rect(4, oy + 10, 8, 1, "r");
    c.px(2, oy + 11, "s").px(13, oy + 11, "s");
  },
  bard: (c, oy) => {
    c.rect(4, oy + 1, 8, 1, "a").rect(5, oy, 6, 1, "a").px(11, oy - 0, "r").px(12, oy, "r").px(12, oy - 0, "w");
    c.oval(13, oy + 10, 2, 2.6, "n").px(13, oy + 10, "o").rect(13, oy + 4, 1, 4, "n");
  },
  wizard: (c, oy) => {
    c.rect(4, oy + 2, 8, 1, "a").rect(5, oy + 1, 6, 1, "a").rect(6, oy, 4, 1, "a").px(7, oy - 0, "a");
    c.px(6, oy + 1, "b").px(9, oy + 1, "b");
    c.rect(5, oy + 5, 6, 3, "w").px(6, oy + 4, "e").px(9, oy + 4, "e").rect(6, oy + 6, 4, 2, "w");
    staff(c, oy, 13, "l");
  },
  sorcerer: (c, oy) => {
    c.rect(5, oy, 1, 2, "r").rect(7, oy - 0, 1, 2, "r").rect(9, oy, 1, 2, "r").rect(10, oy + 1, 1, 1, "r");
    c.rect(12, oy + 5, 3, 3, "l").px(13, oy + 6, "w");
  },
  warlock: (c, oy) => {
    c.rect(4, oy, 8, 4, "a").rect(5, oy + 3, 6, 3, "s").rect(4, oy + 3, 1, 5, "a").rect(11, oy + 3, 1, 5, "a").px(6, oy + 4, "b").px(9, oy + 4, "b");
    c.px(4, oy - 0, "w").px(11, oy, "w").px(3, oy, "w").px(12, oy, "w");
    c.rect(13, oy + 4, 1, 8, "n").rect(12, oy + 2, 3, 2, "b");
  },
};

/** A hero's portrait sprite. The same class and seed always give the same picture. */
export function heroSprite(classIndex: string, seed: number | string = 0): Sprite {
  const s = typeof seed === "number" ? seed : hashString(seed);
  const oy = 1;
  const c = new Canvas(HERO_W, HERO_H);
  base(c, oy);
  (GEAR[classIndex] ?? GEAR.fighter)(c, oy);
  c.outline("o");
  return { rows: c.rows(), palette: heroPalette(KITS[classIndex] ? classIndex : "fighter", s) };
}

/** A townsperson or other person with no class: a plain tunic in a colour chosen from the name. */
export function folkSprite(name: string): Sprite {
  const s = hashString(name);
  const tunics = ["#8a4a3a", "#4a7a5a", "#4a5a8a", "#8a7a3a", "#7a4a7a", "#5a6a6a"];
  const c = new Canvas(HERO_W, HERO_H);
  base(c, 1);
  c.outline("o");
  const palette = heroPalette("fighter", s);
  const t = pick(tunics, s, 5);
  return { rows: c.rows(), palette: { ...palette, a: t, A: t, b: "#3a2a1e", c: "#4a3a2a", k: "#2a1f16" } };
}
