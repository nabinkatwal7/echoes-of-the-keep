import { Canvas, type Sprite } from "./canvas";

export const ICON_SIZE = 12;
const PALETTE = { o: "#2a2016", g: "#f6c445", G: "#b8862a", w: "#fff3c4", r: "#c23a4a", b: "#5f72c9", l: "#9db0ff", e: "#52ad82", p: "#8a5ccf", s: "#a8a2b8", S: "#5a566a", n: "#7a5a36", y: "#ffd84a" };

const draw = (fn: (c: Canvas) => void): Sprite => {
  const c = new Canvas(ICON_SIZE, ICON_SIZE);
  fn(c);
  c.outline("o");
  return { rows: c.rows(), palette: PALETTE };
};

export type IconName = "search" | "rules" | "dice" | "sheet" | "book" | "eye" | "swords" | "pin" | "flask" | "seal";

export const ICONS: Record<IconName, Sprite> = {
  search: draw((c) => {
    c.oval(5, 5, 3.6, 3.6, "l").px(3, 3, "w").px(4, 3, "w").px(3, 4, "w");
    c.line(8, 8, 10, 10, "n").line(9, 8, 10, 9, "n");
  }),
  rules: draw((c) => {
    for (let y = 1; y <= 10; y++) {
      const half = y < 7 ? 4 : 4 - (y - 6);
      c.rect(6 - Math.max(half, 0), y, Math.max(half, 0) * 2, 1, y < 3 ? "w" : "s");
    }
    c.rect(5, 3, 2, 5, "r").rect(4, 4, 4, 1, "r");
  }),
  dice: draw((c) => {
    c.oval(5.5, 5.5, 4.6, 4.6, "g");
    c.line(5, 1, 1, 8, "G").line(1, 8, 9, 8, "G").line(9, 8, 5, 1, "G");
    c.px(5, 5, "w").px(5, 6, "w");
  }),
  sheet: draw((c) => {
    c.rect(2, 1, 8, 10, "w");
    for (const y of [3, 5, 7, 9]) c.rect(3, y, 6, 1, "s");
    c.rect(3, 2, 2, 1, "r");
  }),
  book: draw((c) => {
    c.rect(1, 2, 10, 8, "p").rect(5, 2, 2, 8, "G");
    c.px(3, 5, "y").px(2, 5, "y").px(3, 4, "y").px(3, 6, "y").px(8, 5, "y").px(9, 5, "y").px(8, 4, "y").px(8, 6, "y");
  }),
  eye: draw((c) => {
    c.oval(5.5, 5.5, 5.2, 3.2, "w").oval(5.5, 5.5, 2, 2.4, "r").px(5, 5, "o").px(5, 6, "o");
  }),
  swords: draw((c) => {
    c.line(1, 1, 9, 9, "s").line(2, 1, 10, 9, "s").line(10, 1, 2, 9, "s").line(9, 1, 1, 9, "s");
    c.px(10, 10, "n").px(1, 10, "n").px(9, 10, "G").px(2, 10, "G");
  }),
  pin: draw((c) => {
    c.oval(5.5, 3.6, 3.2, 3.2, "r").px(5, 3, "w");
    for (let y = 6; y <= 10; y++) c.rect(5 - Math.floor((10 - y) / 2) + 1, y, Math.max(1, 10 - y) + (y === 10 ? 0 : 0), 1, "r");
  }),
  flask: draw((c) => {
    c.rect(5, 1, 2, 3, "s").rect(4, 4, 4, 1, "s");
    c.oval(5.5, 7.3, 3.6, 3, "p").px(4, 6, "w").px(7, 8, "w");
  }),
  seal: draw((c) => {
    c.rect(3, 9, 2, 3, "b").rect(7, 9, 2, 3, "b");
    c.oval(5.5, 5, 4.4, 4.4, "r").oval(5.5, 5, 2.6, 2.6, "G").px(5, 5, "y");
  }),
};
