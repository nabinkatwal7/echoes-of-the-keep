export type ExploreToken = { id: string; name: string; x: number; y: number };
export type ExploreMap = { width: number; height: number; scale: number; tokens: ExploreToken[] };

const clamp = (n: unknown, min: number, max: number, fallback: number) => {
  const v = Number(n);
  return Number.isInteger(v) ? Math.min(max, Math.max(min, v)) : fallback;
};

/** Feet per square, width and height. Bad values fall back to a 12 by 8 map at 5 feet. */
export function readExplore(raw: unknown): ExploreMap {
  const o = raw && typeof raw === "object" ? (raw as Partial<ExploreMap>) : {};
  const tokens = Array.isArray(o.tokens)
    ? o.tokens.flatMap((t) => {
        if (!t || typeof t !== "object") return [];
        const token = t as Partial<ExploreToken>;
        if (typeof token.id !== "string" || typeof token.name !== "string") return [];
        return [{ id: token.id, name: token.name.slice(0, 40), x: clamp(token.x, 0, 29, 0), y: clamp(token.y, 0, 29, 0) }];
      })
    : [];
  return { width: clamp(o.width, 4, 30, 12), height: clamp(o.height, 4, 20, 8), scale: clamp(o.scale, 5, 30, 5), tokens };
}
