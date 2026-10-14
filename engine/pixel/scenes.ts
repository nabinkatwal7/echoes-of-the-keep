import { Canvas, hashString, seeded, type Palette, type Sprite } from "./canvas";

export const SCENE_W = 96;
export const SCENE_H = 32;
export type SceneTheme = "crypt" | "wilds" | "bandits" | "caves" | "tavern";
export const SCENE_THEMES: SceneTheme[] = ["crypt", "wilds", "bandits", "caves", "tavern"];

type Sky = [string, string, string, string];
const SKIES: Record<SceneTheme, Sky> = {
  crypt: ["#14122a", "#1f1a40", "#2e2557", "#47356b"],
  wilds: ["#1a2a4a", "#2c4570", "#4a6c94", "#d89a5a"],
  bandits: ["#2a1a2e", "#472a3e", "#7a3e48", "#d8704a"],
  caves: ["#0e0c16", "#161224", "#1e1830", "#2a2040"],
  tavern: ["#101a3a", "#1c2a58", "#31407a", "#5a5a8a"],
};

/** Bands of sky with a dithered seam between each, like old games did. */
function sky(c: Canvas, h: number) {
  const bands = [0, Math.floor(h * 0.25), Math.floor(h * 0.45), Math.floor(h * 0.62)];
  const keys = ["a", "b", "c", "d"];
  for (let i = 0; i < bands.length; i++) {
    const end = i + 1 < bands.length ? bands[i + 1] : h;
    c.rect(0, bands[i], c.width, end - bands[i], keys[i]);
    if (i + 1 < bands.length) for (let x = 0; x < c.width; x++) if ((x + end) % 2 === 0) c.px(x, end - 1, keys[i + 1]);
  }
}

function stars(c: Canvas, rand: () => number, n: number, maxY: number) {
  for (let i = 0; i < n; i++) c.px(Math.floor(rand() * c.width), Math.floor(rand() * maxY), rand() > 0.75 ? "W" : "w");
}

function hills(c: Canvas, rand: () => number, base: number, amp: number, color: string) {
  const phase = rand() * 6;
  for (let x = 0; x < c.width; x++) {
    const y = Math.round(base + Math.sin(x / 9 + phase) * amp + Math.sin(x / 4 + phase * 2) * (amp / 3));
    c.rect(x, y, 1, c.height - y, color);
  }
}

function pine(c: Canvas, x: number, y: number, h: number, color: string) {
  for (let i = 0; i < h; i++) {
    const w = Math.floor(i / 2) + 1;
    c.rect(x - w, y - h + i, w * 2 + 1, 1, color);
  }
  c.rect(x, y, 1, 2, "t");
}

function deadTree(c: Canvas, x: number, y: number, rand: () => number) {
  c.rect(x, y - 8, 1, 8, "t");
  c.line(x, y - 6, x - 3, y - 9, "t").line(x, y - 5, x + 3, y - 8, "t").line(x, y - 8, x + (rand() > 0.5 ? 2 : -2), y - 11, "t");
}

function house(c: Canvas, x: number, y: number, w: number, h: number, roof: string, lit: boolean) {
  c.rect(x, y - h, w, h, "h");
  for (let i = 0; i < Math.ceil(w / 2) + 1; i++) c.rect(x - 1 + i, y - h - 1 - i, w + 2 - i * 2, 1, roof);
  if (lit) c.rect(x + 2, y - h + 2, 2, 2, "y");
  if (w > 7) c.rect(x + w - 4, y - h + 2, 2, 2, "y");
  c.rect(x + Math.floor(w / 2), y - 3, 2, 3, "t");
}

/** A wide night scene for a theme, drawn as pixels. The seed moves the details around. */
export function sceneSprite(theme: SceneTheme, seed: number | string = 0): Sprite {
  const s = typeof seed === "number" ? seed : hashString(seed);
  const rand = seeded(s + hashString(theme));
  const c = new Canvas(SCENE_W, SCENE_H);
  sky(c, SCENE_H);
  const palette: Palette = {
    a: SKIES[theme][0], b: SKIES[theme][1], c: SKIES[theme][2], d: SKIES[theme][3], w: "#e8e4f4", W: "#ffffff",
    t: "#2a1c14", y: "#ffd86a", f: "#ff8a3a", h: "#3a2c3a",
  };

  if (theme === "crypt") {
    stars(c, rand, 26, 14);
    c.oval(76, 8, 6, 6, "m").oval(78, 7, 5, 5, "M").px(73, 7, "n").px(74, 10, "n");
    palette.m = "#e8e8f4"; palette.M = "#fff6d0"; palette.n = "#c8c8dc";
    hills(c, rand, 21, 2, "p");
    palette.p = "#1c1730";
    for (const x of [8, 22, 60, 88]) deadTree(c, x, 24, rand);
    hills(c, rand, 26, 1.2, "q");
    palette.q = "#120f22";
    for (let i = 0; i < 9; i++) {
      const x = 4 + Math.floor(rand() * 86);
      const y = 25 + Math.floor(rand() * 3);
      c.rect(x, y - 4, 3, 5, "g").px(x + 1, y - 5, "g").px(x + 1, y - 3, "G").rect(x, y - 2, 3, 1, "G");
    }
    palette.g = "#6a6a82"; palette.G = "#4a4a62";
    // the crypt: a low stone building with a lit arch
    c.rect(38, 18, 20, 12, "k").rect(36, 17, 24, 2, "K").rect(44, 21, 8, 9, "y").rect(45, 22, 6, 8, "f").rect(44, 20, 8, 1, "K");
    palette.k = "#4a4a62"; palette.K = "#5e5e7a";
    c.rect(0, 29, 96, 3, "q");
    for (let x = 0; x < 96; x += 3) if (rand() > 0.5) c.px(x, 28, "c");
  } else if (theme === "wilds") {
    stars(c, rand, 12, 8);
    c.oval(20, 18, 7, 7, "y").oval(20, 18, 5, 5, "f");
    hills(c, rand, 20, 3, "p");
    palette.p = "#2f5a52";
    for (let i = 0; i < 12; i++) pine(c, 6 + i * 8 + Math.floor(rand() * 4), 24, 7 + Math.floor(rand() * 4), "P");
    palette.P = "#23463f";
    hills(c, rand, 26, 1.5, "q");
    palette.q = "#1a3a30";
    for (let i = 0; i < 7; i++) pine(c, 4 + i * 14 + Math.floor(rand() * 5), 31, 11 + Math.floor(rand() * 4), "Q");
    palette.Q = "#102a22";
  } else if (theme === "bandits") {
    stars(c, rand, 10, 8);
    hills(c, rand, 22, 2, "p");
    palette.p = "#3a2438";
    // a watchtower
    c.rect(72, 10, 6, 17, "k").rect(70, 8, 10, 3, "K").rect(72, 6, 6, 2, "K").rect(74, 12, 2, 3, "y");
    palette.k = "#5a3e48"; palette.K = "#6e4a54";
    hills(c, rand, 27, 1, "q");
    palette.q = "#241626";
    // a road
    for (let y = 26; y < 32; y++) c.rect(Math.floor(30 - (y - 26) * 3), y, 22 + (y - 26) * 4, 1, "r");
    palette.r = "#6a5240";
    // a campfire
    c.rect(20, 28, 4, 1, "t").rect(21, 26, 2, 2, "f").px(21, 25, "y").px(22, 24, "y").px(21, 24, "f");
    for (const x of [8, 40, 54]) {
      c.rect(x, 23, 8, 5, "k").line(x, 23, x + 4, 18, "K").line(x + 8, 23, x + 4, 18, "K").rect(x + 3, 24, 2, 4, "t");
    }
  } else if (theme === "caves") {
    for (let x = 0; x < 96; x += 2 + Math.floor(rand() * 4)) {
      const h = 3 + Math.floor(rand() * 8);
      for (let i = 0; i < h; i++) c.rect(x - Math.floor((h - i) / 3), i, Math.floor((h - i) / 3) * 2 + 1, 1, "k");
    }
    palette.k = "#3a3050";
    for (let x = 3; x < 96; x += 3 + Math.floor(rand() * 6)) {
      const h = 3 + Math.floor(rand() * 7);
      for (let i = 0; i < h; i++) c.rect(x - Math.floor(i / 3), 31 - i, Math.floor(i / 3) * 2 + 1, 1, "K");
    }
    palette.K = "#2a2240";
    for (let i = 0; i < 7; i++) {
      const x = 6 + Math.floor(rand() * 84);
      const y = 22 + Math.floor(rand() * 6);
      const col = i % 2 ? "l" : "m";
      c.rect(x, y - 4, 2, 5, col).px(x + 1, y - 5, col).rect(x + 2, y - 2, 2, 3, col).px(x, y - 4, "w");
    }
    palette.l = "#5ae0e8"; palette.m = "#e85ac8";
    for (let i = 0; i < 20; i++) c.px(Math.floor(rand() * 96), 8 + Math.floor(rand() * 16), rand() > 0.5 ? "l" : "m");
  } else {
    stars(c, rand, 30, 14);
    c.oval(78, 8, 5, 5, "m").oval(80, 7, 4, 4, "M");
    palette.m = "#f4ecd0"; palette.M = "#fffaf0";
    hills(c, rand, 22, 2, "p");
    palette.p = "#1c2448";
    house(c, 6, 28, 10, 8, "R", true);
    house(c, 22, 28, 8, 6, "R", true);
    house(c, 38, 28, 12, 10, "R", true);
    house(c, 58, 28, 9, 7, "R", false);
    house(c, 74, 28, 11, 9, "R", true);
    palette.R = "#7a3a3a"; palette.h = "#4a3a5a";
    for (const x of [42, 10]) c.rect(x, 12, 1, 2, "c").px(x + 1, 11, "c").px(x + 2, 10, "c");
    c.rect(0, 28, 96, 4, "q");
    palette.q = "#14193a";
  }
  c.rows();
  return { rows: c.rows(), palette };
}
