import { Canvas, seeded, type Sprite } from "./canvas";

/** Pieces of the cinematic landing scene: sky, ridge with cathedral ruins, a campfire and framing foliage. All drawn in code. */

export const SKY_W = 160;
export const SKY_H = 72;
const SKY_BANDS = ["#05040c", "#0a0716", "#120c24", "#1b1034", "#2a1745", "#3d1f56"];

/** A stormy night: dark violet bands with dithered seams, a few stars and ragged cloud banks. */
export function skySprite(seed = 3): Sprite {
  const c = new Canvas(SKY_W, SKY_H);
  const rand = seeded(seed);
  const per = SKY_H / SKY_BANDS.length;
  SKY_BANDS.forEach((_, i) => {
    const y0 = Math.floor(i * per);
    const y1 = Math.floor((i + 1) * per);
    c.rect(0, y0, SKY_W, y1 - y0, String(i));
    if (i + 1 < SKY_BANDS.length) for (let x = 0; x < SKY_W; x++) if ((x + i) % 2 === 0) c.px(x, y1 - 1, String(i + 1));
  });
  for (let i = 0; i < 46; i++) c.px(Math.floor(rand() * SKY_W), Math.floor(rand() * SKY_H * 0.6), rand() > 0.8 ? "W" : "w");
  // low storm clouds: lumpy bands slightly lighter than the sky behind them
  for (let b = 0; b < 5; b++) {
    const y = 8 + b * 11 + Math.floor(rand() * 4);
    const x0 = Math.floor(rand() * 60);
    const len = 50 + Math.floor(rand() * 70);
    for (let x = x0; x < x0 + len; x++) {
      const h = 1 + Math.round(Math.abs(Math.sin((x - x0) / 6 + b)) * 2);
      c.rect(x, y - h, 1, h * 2, "k");
    }
  }
  const rows = c.rows();
  return { rows, palette: { "0": SKY_BANDS[0], "1": SKY_BANDS[1], "2": SKY_BANDS[2], "3": SKY_BANDS[3], "4": SKY_BANDS[4], "5": SKY_BANDS[5], w: "#c7c1ff", W: "#fff3c4", k: "#241540" } };
}

export const RIDGE_W = 160;
export const RIDGE_H = 56;

/** Far mountains with the black shell of a gothic cathedral on one of them, and pines along the bottom. */
export function ridgeSprite(seed = 9): Sprite {
  const c = new Canvas(RIDGE_W, RIDGE_H);
  const rand = seeded(seed);
  const phase = rand() * 5;
  for (let x = 0; x < RIDGE_W; x++) {
    const y = Math.round(30 + Math.sin(x / 13 + phase) * 8 + Math.sin(x / 5 + phase * 3) * 2.5);
    c.rect(x, y, 1, RIDGE_H - y, "m");
  }
  // cathedral ruins on the right
  const bx = 98;
  const by = 44;
  c.rect(bx, by - 22, 38, 22, "r"); // nave
  c.rect(bx - 6, by - 36, 8, 36, "r"); // west tower
  for (let i = 0; i < 10; i++) c.rect(bx - 6 + Math.floor(i * 0.4), by - 37 - i, 8 - Math.floor(i * 0.8), 1, "r"); // spire
  c.rect(bx + 30, by - 30, 7, 30, "r"); // east tower, broken
  c.rect(bx + 30, by - 33, 3, 3, "r");
  c.rect(bx + 35, by - 31, 2, 1, "r");
  // pointed windows
  for (const wx of [bx + 4, bx + 11, bx + 18, bx + 25]) {
    c.rect(wx, by - 16, 3, 8, ".");
    c.rect(wx + 1, by - 18, 1, 2, ".");
    c.px(wx, by - 17, ".");
    c.px(wx + 2, by - 17, ".");
  }
  c.rect(bx - 4, by - 30, 2, 5, ".");
  c.rect(bx + 32, by - 24, 2, 5, ".");
  // a broken roofline
  for (let x = bx; x < bx + 30; x++) if ((x * 7) % 5 === 0) c.px(x, by - 22, ".");
  // pines
  for (let x = 2; x < RIDGE_W; x += 5 + Math.floor(rand() * 5)) {
    const h = 9 + Math.floor(rand() * 12);
    const base = RIDGE_H - 1;
    for (let i = 0; i < h; i++) c.rect(x - Math.floor(i / 3) - 1, base - h + i, Math.floor(i / 3) * 2 + 3, 1, "p");
    c.rect(x, base - 1, 1, 1, "p");
  }
  c.rect(0, RIDGE_H - 4, RIDGE_W, 4, "p");
  return { rows: c.rows(), palette: { m: "#150f2a", r: "#0a0714", p: "#05040a" } };
}

export const FIRE_W = 22;
export const FIRE_H = 22;
const FIRE_PALETTE = { s: "#4a4358", S: "#2f2a3c", b: "#6b4a2b", d: "#3a2a1a", r: "#a3283a", e: "#e0702f", y: "#f6c445", w: "#fff3c4" };

/** A campfire on stones, in two frames so the flame can dance. */
export function campfireSprite(frame: 0 | 1): Sprite {
  const c = new Canvas(FIRE_W, FIRE_H);
  const lean = frame === 0 ? 0 : 1;
  // stones
  for (const x of [2, 5, 8, 11, 14, 17]) {
    c.rect(x, 18, 3, 2, "s");
    c.rect(x, 19, 3, 1, "S");
  }
  c.rect(3, 20, 16, 1, "S");
  // logs
  c.line(4, 18, 17, 15, "b").line(4, 17, 17, 14, "d");
  c.line(18, 18, 5, 15, "b").line(18, 17, 5, 14, "d");
  // flame: three nested teardrops
  const tip = 1 + lean;
  c.oval(11, 12, 5, 5, "r");
  c.oval(11 + lean - 1, 8, 3, 6, "r");
  c.oval(11, 12, 4, 4, "e");
  c.oval(11 + lean - 1, 8, 2.5, 5.5, "e");
  c.px(11 + lean * 2 - 1, tip, "e").px(11 + lean * 2 - 1, tip + 1, "e").rect(10 + lean, tip + 2, 3, 2, "e");
  c.oval(11, 13, 2.5, 3, "y");
  c.oval(11 + lean - 1, 9, 1.5, 4, "y");
  c.oval(11, 14, 1, 1.5, "w");
  return { rows: c.rows(), palette: FIRE_PALETTE };
}

export const LEAF_W = 34;
export const LEAF_H = 34;

/** Dark vines and leaves that climb out of a bottom corner (flip it for the other side). */
export function foliageSprite(seed = 4): Sprite {
  const c = new Canvas(LEAF_W, LEAF_H);
  const rand = seeded(seed);
  const stems = 5;
  for (let s = 0; s < stems; s++) {
    let x = 1 + s * 3;
    let y = LEAF_H - 1;
    const lean = 0.25 + rand() * 0.6;
    const len = 14 + Math.floor(rand() * 18);
    for (let i = 0; i < len; i++) {
      c.px(Math.round(x), y, "v");
      if (i % 3 === 1) {
        const dir = rand() > 0.5 ? 1 : -1;
        c.rect(Math.round(x) + dir, y, 2, 1, "l");
        c.px(Math.round(x) + dir * 2, y - 1, "l");
        if (rand() > 0.7) c.px(Math.round(x) + dir * 2, y, "g");
      }
      x += lean * (i < len / 2 ? 1 : 0.4);
      y -= 1;
    }
    c.oval(Math.round(x), y, 1.6, 1.6, "l");
  }
  c.rect(0, LEAF_H - 3, 14, 3, "v");
  for (let x = 0; x < 16; x++) if (rand() > 0.5) c.px(x, LEAF_H - 4 - Math.floor(rand() * 2), "l");
  return { rows: c.rows(), palette: { v: "#07050c", l: "#0f1a14", g: "#2f5a3a" } };
}
