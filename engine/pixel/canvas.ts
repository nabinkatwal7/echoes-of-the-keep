/**
 * A tiny pixel canvas for drawing sprites in code. Each cell holds a one-character palette key, or "." for empty.
 * Sprites are plain strings, so they are easy to test and cheap to render as SVG.
 */
export type Palette = Record<string, string>;
export type Sprite = { rows: string[]; palette: Palette };

export class Canvas {
  readonly cells: string[][];
  constructor(readonly width: number, readonly height: number) {
    this.cells = Array.from({ length: height }, () => Array.from({ length: width }, () => "."));
  }

  px(x: number, y: number, c: string): this {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) this.cells[y][x] = c;
    return this;
  }

  /** Same pixel on the opposite side, mirrored across the vertical centre line. */
  sym(x: number, y: number, c: string): this {
    return this.px(x, y, c).px(this.width - 1 - x, y, c);
  }

  rect(x: number, y: number, w: number, h: number, c: string): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
    return this;
  }

  /** A filled rectangle with a one-pixel outline drawn around it (outside the rectangle). */
  box(x: number, y: number, w: number, h: number, fill: string, outline = "o"): this {
    this.rect(x - 1, y - 1, w + 2, h + 2, outline);
    return this.rect(x, y, w, h, fill);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string): this {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.px(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    return this;
  }

  /** A filled ellipse, good for blobs and heads. */
  oval(cx: number, cy: number, rx: number, ry: number, c: string): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.35);
        const dy = (y - cy) / (ry + 0.35);
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
    }
    return this;
  }

  get(x: number, y: number): string {
    return this.cells[y]?.[x] ?? ".";
  }

  /** Put an outline colour around every filled pixel that touches empty space (in the four directions). */
  outline(c = "o"): this {
    const marks: [number, number][] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.cells[y][x] !== ".") continue;
        const near = [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)];
        if (near.some((n) => n !== "." && n !== c)) marks.push([x, y]);
      }
    }
    for (const [x, y] of marks) this.cells[y][x] = c;
    return this;
  }

  rows(): string[] {
    return this.cells.map((r) => r.join(""));
  }
}

/** A deterministic number from text, so a name always gets the same look. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A small seeded random generator (mulberry32). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(list: readonly T[], seed: number, salt = 0): T => list[Math.abs(Math.floor(seeded(seed + salt * 977)() * list.length)) % list.length];
