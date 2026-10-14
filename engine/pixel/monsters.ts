import { Canvas, hashString, pick, seeded, type Palette, type Sprite } from "./canvas";

/** Monster sprites are 16 by 16, drawn from a few shapes that cover the creature types in the rules. */
export const MON_W = 16;
export const MON_H = 16;

export type MonsterShape = "beast" | "skeleton" | "ghost" | "humanoid" | "dragon" | "slime" | "spider" | "bat" | "fiend" | "giant" | "construct" | "plant" | "eye" | "wisp" | "serpent" | "fey";

/** Which shape draws which creature, from the stat block's type and name. */
export function shapeFor(type: string | null | undefined, name = ""): MonsterShape {
  const t = (type ?? "").toLowerCase();
  const n = name.toLowerCase();
  if (/swarm|bat\b|raven|hawk|eagle|owl|vulture/.test(n) || /swarm/.test(t)) return "bat";
  if (/spider|scorpion|centipede|crab|beetle|ankheg/.test(n)) return "spider";
  if (/snake|serpent|naga|worm|eel|constrictor|basilisk|hydra/.test(n)) return "serpent";
  if (/ghost|specter|spectre|wraith|shadow|banshee|poltergeist/.test(n)) return "ghost";
  if (/skeleton|zombie|ghoul|ghast|wight|mummy|lich|vampire/.test(n) || t.includes("undead")) return /zombie|ghoul|ghast|mummy/.test(n) ? "humanoid" : "skeleton";
  if (/will-o|wisp|elemental|mephit|salamander|magmin/.test(n) || t.includes("elemental")) return "wisp";
  if (/beholder|gazer|eye|aboleth|cloaker|gibbering|mouther/.test(n) || t.includes("aberration")) return "eye";
  if (t.includes("dragon") || /dragon|wyvern|drake|pseudodragon/.test(n)) return "dragon";
  if (t.includes("ooze") || /ooze|pudding|jelly|cube|slime/.test(n)) return "slime";
  if (t.includes("plant") || /shrub|treant|mound|fungus|shrieker|tree/.test(n)) return "plant";
  if (t.includes("construct") || /golem|armor|sword|guardian/.test(n)) return "construct";
  if (t.includes("fiend") || /imp\b|quasit|devil|demon|hound|hag|dretch/.test(n)) return "fiend";
  if (t.includes("giant") || /giant\b|ogre|troll|ettin|oni/.test(n)) return "giant";
  if (t.includes("fey") || /sprite|pixie|dryad|satyr|blink dog/.test(n)) return "fey";
  if (t.includes("beast") || t.includes("monstrosity") || /wolf|bear|boar|cat|lion|tiger|panther|dog|horse|rat|mastiff|mule|crocodile|shark|ape/.test(n)) return "beast";
  return "humanoid";
}

const FUR = [["#8a8f98", "#5f646c"], ["#8a6a45", "#5f4630"], ["#3c3a40", "#26252a"], ["#b89a6a", "#8a7048"], ["#c9c2b0", "#9a937f"]];
const SKINS = [["#7aa05a", "#587a3e"], ["#a07a5a", "#7a5a40"], ["#8a9a6a", "#667a4a"], ["#c7a07a", "#a07a58"], ["#6a8aa0", "#4a6a80"]];

type Draw = (c: Canvas, seed: number) => Palette;

const DRAW: Record<MonsterShape, Draw> = {
  beast: (c, seed) => {
    const [f, d] = pick(FUR, seed);
    // side view, facing right: body, legs, tail, head with ears and snout
    c.rect(3, 6, 8, 4, "f").rect(3, 9, 8, 1, "d").rect(2, 5, 2, 2, "f").px(1, 4, "f").px(1, 5, "f");
    c.rect(4, 10, 2, 3, "f").rect(9, 10, 2, 3, "f").rect(4, 12, 2, 1, "d").rect(9, 12, 2, 1, "d");
    c.rect(11, 4, 4, 4, "f").rect(14, 6, 2, 2, "d").px(11, 3, "f").px(13, 3, "f").px(13, 5, "e").px(15, 6, "n");
    c.px(12, 8, "w").px(14, 8, "w");
    return { o: "#1b1411", f, d, e: "#f6e27a", n: "#1b1411", w: "#f1ede2" };
  },
  skeleton: (c) => {
    c.rect(5, 1, 6, 5, "w").rect(6, 6, 4, 1, "w").px(6, 3, "e").px(7, 3, "e").px(9, 3, "e").px(8, 3, "e").px(7, 5, "d").px(9, 5, "d");
    c.rect(7, 7, 2, 1, "w").rect(5, 8, 6, 1, "w").rect(6, 9, 4, 1, "d").rect(5, 10, 6, 1, "w").rect(6, 11, 4, 1, "d");
    c.rect(3, 8, 1, 4, "w").rect(12, 8, 1, 4, "w").rect(6, 12, 1, 3, "w").rect(9, 12, 1, 3, "w");
    c.rect(13, 5, 1, 8, "m").rect(12, 11, 3, 1, "n");
    return { o: "#1b1411", w: "#e8e2d0", d: "#a39b84", e: "#1b1411", m: "#9aa4b0", n: "#6a4a2a" };
  },
  ghost: (c, seed) => {
    c.oval(8, 6, 4, 5, "w").rect(4, 8, 8, 5, "w");
    for (let x = 4; x < 12; x += 2) c.rect(x, 13, 1, 2, "w");
    c.rect(6, 5, 1, 2, "e").rect(9, 5, 1, 2, "e").rect(7, 8, 2, 1, "e");
    c.px(4, 12, "d").px(11, 12, "d");
    const tint = pick(["#bfd8f0", "#d8c8f0", "#c8f0e0"], seed);
    return { o: "#2a2a44", w: tint, d: "#9ab8d8", e: "#1b1b33" };
  },
  humanoid: (c, seed) => {
    const [s, d] = pick(SKINS, seed);
    c.rect(5, 1, 6, 6, "s").rect(5, 1, 6, 2, "h").px(6, 4, "e").px(9, 4, "e").px(7, 6, "d").px(8, 6, "d").rect(7, 7, 2, 1, "d");
    c.rect(4, 8, 8, 4, "a").rect(3, 8, 1, 4, "a").rect(12, 8, 1, 4, "a").rect(4, 11, 8, 1, "b").px(3, 11, "s").px(12, 11, "s");
    c.rect(5, 12, 2, 3, "c").rect(9, 12, 2, 3, "c");
    c.rect(13, 5, 1, 7, "n").rect(12, 4, 3, 2, "m");
    return { o: "#1b1411", s, d, h: pick(["#2a2018", "#4a3020", "#1c1c22"], seed, 2), e: "#d8402a", a: pick(["#5a4a3a", "#4a3a5a", "#3a4a3a"], seed, 3), b: "#2a2018", c: "#3a2e24", n: "#6a4a2a", m: "#8e99a5" };
  },
  dragon: (c, seed) => {
    c.rect(4, 7, 7, 4, "b").rect(4, 10, 7, 1, "d").rect(11, 4, 4, 4, "b").px(14, 6, "b").px(15, 6, "b").px(13, 5, "e").px(11, 3, "h").px(13, 3, "h");
    c.rect(2, 9, 2, 2, "b").px(1, 10, "b").px(0, 11, "b");
    c.rect(5, 11, 2, 3, "b").rect(9, 11, 2, 3, "b");
    c.rect(4, 3, 1, 4, "w").rect(5, 2, 1, 4, "w").rect(6, 3, 1, 3, "w").rect(7, 4, 1, 2, "w");
    c.px(15, 8, "r").px(14, 8, "r");
    const [col, dark] = pick([["#5a9a4a", "#3e7234"], ["#b84a3a", "#8a3226"], ["#4a6ab8", "#324a8a"], ["#9a9aa8", "#74747f"], ["#b89a3a", "#8a7226"]], seed);
    return { o: "#1b1411", b: col, d: dark, w: dark, e: "#f6e27a", h: "#e8e2d0", r: "#ff8a3a" };
  },
  slime: (c, seed) => {
    c.oval(8, 10, 6, 4, "b").rect(3, 12, 10, 2, "b").oval(8, 9, 4, 2, "l").px(6, 9, "e").px(9, 9, "e").px(6, 8, "w").rect(7, 12, 2, 1, "d");
    const [col, light] = pick([["#5ab86a", "#9ae8a8"], ["#8a5ab8", "#c8a0e8"], ["#4a9ab8", "#9ad8e8"], ["#b8a03a", "#e8d88a"]], seed);
    return { o: "#1b1411", b: col, l: light, e: "#1b1411", w: "#ffffff", d: "#1b1411" };
  },
  spider: (c, seed) => {
    c.oval(8, 8, 3, 3, "b").oval(8, 5, 2, 2, "b").px(7, 4, "e").px(9, 4, "e");
    for (const [dx, dy] of [[-1, -2], [-2, 0], [-2, 2], [-1, 4]] as const) {
      c.line(5, 7 + Math.floor(dy / 2), 2 + (dx < -1 ? -1 : 0), 6 + dy, "l");
      c.line(10, 7 + Math.floor(dy / 2), 13 + (dx < -1 ? 1 : 0), 6 + dy, "l");
    }
    c.px(8, 10, "d").px(8, 11, "d");
    const [col, leg] = pick([["#3a3040", "#6a5a78"], ["#5a3a2a", "#8a6a4a"], ["#2a4a3a", "#4a7a5a"]], seed);
    return { o: "#1b1411", b: col, l: leg, e: "#e83a3a", d: "#a8283a" };
  },
  bat: (c, seed) => {
    c.rect(7, 6, 2, 4, "b").rect(6, 4, 4, 3, "b").px(6, 3, "b").px(9, 3, "b").px(7, 5, "e").px(8, 5, "e");
    c.rect(1, 5, 5, 3, "w").rect(2, 8, 3, 1, "w").px(1, 4, "w").rect(10, 5, 5, 3, "w").rect(11, 8, 3, 1, "w").px(14, 4, "w");
    c.px(7, 10, "b").px(8, 10, "b");
    const [col, wing] = pick([["#4a3a58", "#6a5a7a"], ["#3a3a3a", "#5a5a5e"], ["#5a3a3a", "#7a5656"]], seed);
    return { o: "#1b1411", b: col, w: wing, e: "#ff6a6a" };
  },
  fiend: (c, seed) => {
    c.rect(5, 2, 6, 5, "b").px(4, 1, "h").px(5, 0, "h").px(11, 1, "h").px(10, 0, "h").px(6, 4, "e").px(9, 4, "e").rect(7, 6, 2, 1, "d");
    c.rect(4, 8, 8, 4, "b").rect(3, 8, 1, 4, "b").rect(12, 8, 1, 4, "b").rect(5, 12, 2, 3, "d").rect(9, 12, 2, 3, "d");
    c.rect(12, 11, 1, 3, "b").px(13, 13, "b").px(14, 13, "b").px(14, 12, "b");
    c.px(2, 7, "w").px(1, 6, "w").px(13, 7, "w").px(14, 6, "w");
    const [col, dark] = pick([["#c0392b", "#8a2a20"], ["#8a3aa8", "#64287a"], ["#d8702a", "#a05020"]], seed);
    return { o: "#1b1411", b: col, d: dark, h: "#e8dcc0", e: "#ffe86a", w: dark };
  },
  giant: (c, seed) => {
    const [s, d] = pick(SKINS, seed);
    c.rect(4, 0, 8, 6, "s").rect(4, 0, 8, 2, "h").px(6, 3, "e").px(9, 3, "e").rect(6, 5, 4, 1, "d");
    c.rect(2, 6, 12, 5, "a").rect(0, 7, 2, 5, "a").rect(14, 7, 2, 5, "a").rect(2, 10, 12, 1, "b").px(0, 11, "s").px(15, 11, "s");
    c.rect(4, 11, 3, 4, "c").rect(9, 11, 3, 4, "c").rect(4, 14, 3, 1, "k").rect(9, 14, 3, 1, "k");
    return { o: "#1b1411", s, d, h: "#3a2a1e", e: "#1b1411", a: pick(["#7a5a3a", "#5a5a6a", "#6a4a3a"], seed, 4), b: "#3a2a1e", c: "#4a3a2a", k: "#2a1f16" };
  },
  construct: (c, seed) => {
    c.rect(5, 1, 6, 5, "b").rect(6, 3, 4, 1, "e").rect(4, 6, 8, 5, "b").rect(2, 6, 2, 5, "b").rect(12, 6, 2, 5, "b").rect(5, 11, 2, 4, "d").rect(9, 11, 2, 4, "d");
    c.rect(5, 6, 6, 1, "d").px(7, 8, "g").px(8, 8, "g");
    const [col, dark] = pick([["#9aa4b0", "#6a7480"], ["#a8a090", "#78705f"], ["#b09070", "#806a4a"]], seed);
    return { o: "#1b1411", b: col, d: dark, e: "#7be0ff", g: "#e6bd45" };
  },
  plant: (c, seed) => {
    c.oval(8, 7, 5, 4, "b").oval(5, 5, 2, 2, "l").oval(11, 5, 2, 2, "l").rect(7, 11, 2, 4, "t").rect(5, 14, 6, 1, "t");
    c.px(6, 7, "e").px(9, 7, "e").rect(7, 9, 2, 1, "d");
    const [col, light] = pick([["#4a8a3a", "#7ac05a"], ["#6a8a3a", "#a0c05a"], ["#8a5a8a", "#c08ac0"]], seed);
    return { o: "#1b1411", b: col, l: light, t: "#5a3e24", e: "#1b1411", d: "#1b1411" };
  },
  eye: (c, seed) => {
    c.oval(8, 8, 5, 5, "b").oval(8, 8, 3, 3, "w").oval(8, 8, 1.4, 1.4, "e").px(7, 7, "h");
    for (const x of [4, 6, 10, 12]) c.line(x, 4, x < 8 ? x - 2 : x + 2, 1, "b").px(x < 8 ? x - 2 : x + 2, 0, "e");
    const col = pick(["#8a3aa8", "#3a8aa8", "#a83a5a"], seed);
    return { o: "#1b1411", b: col, w: "#f1ede2", e: "#d8301a", h: "#ffffff" };
  },
  wisp: (c, seed) => {
    c.oval(8, 9, 3.5, 4.5, "b").oval(8, 9, 2, 3, "l").px(8, 3, "b").px(8, 2, "b").px(7, 5, "b").px(9, 5, "b").px(7, 4, "b").px(9, 4, "b").px(6, 7, "b").px(10, 7, "b");
    c.px(7, 9, "e").px(9, 9, "e");
    const [col, light] = pick([["#e8702a", "#ffd86a"], ["#4aa8e8", "#c8f0ff"], ["#7ae84a", "#e8ffc0"], ["#a84ae8", "#f0c8ff"]], seed);
    return { o: "#3a1a0a", b: col, l: light, e: "#1b1411" };
  },
  serpent: (c, seed) => {
    c.oval(5, 11, 3, 2, "b").oval(9, 9, 3, 2, "b").oval(11, 6, 2.4, 2, "b").rect(12, 4, 3, 3, "b").px(14, 5, "e").px(15, 6, "t").rect(2, 12, 3, 1, "b").px(1, 12, "b");
    c.px(7, 10, "d").px(9, 8, "d").px(5, 12, "d");
    const [col, dark] = pick([["#6aa04a", "#486e30"], ["#a08a4a", "#6e5e30"], ["#4a7aa0", "#305070"]], seed);
    return { o: "#1b1411", b: col, d: dark, e: "#f6e27a", t: "#d8402a" };
  },
  fey: (c, seed) => {
    c.rect(6, 2, 4, 4, "s").rect(6, 2, 4, 1, "h").px(7, 4, "e").px(9, 4, "e").rect(6, 6, 4, 4, "a").rect(6, 10, 1, 3, "s").rect(9, 10, 1, 3, "s");
    c.rect(1, 4, 4, 2, "w").rect(2, 6, 3, 2, "w").rect(11, 4, 4, 2, "w").rect(11, 6, 3, 2, "w").px(7, 1, "g").px(8, 1, "g");
    const [col, wing] = pick([["#5ab87a", "#bff0d0"], ["#b85aa8", "#f0c8e8"], ["#5a8ab8", "#c8e0f0"]], seed);
    return { o: "#1b1411", s: "#f1c9a5", h: "#e0b941", e: "#1b1411", a: col, w: wing, g: "#ffe86a" };
  },
};

/** A creature's sprite, chosen by its shape and varied by its name so two wolves are not always identical. */
export function monsterSprite(type: string | null | undefined, name = "", seed: number | string = name): Sprite {
  const shape = shapeFor(type, name);
  const s = typeof seed === "number" ? seed : hashString(seed);
  const c = new Canvas(MON_W, MON_H);
  const palette = DRAW[shape](c, s);
  c.outline("o");
  return { rows: c.rows(), palette };
}

export const MONSTER_SHAPES = Object.keys(DRAW) as MonsterShape[];

/** A deterministic variant number, for tests. */
export const variantOf = (name: string) => Math.floor(seeded(hashString(name))() * 1000);
