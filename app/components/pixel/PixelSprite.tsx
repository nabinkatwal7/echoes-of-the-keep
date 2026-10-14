import type { Sprite } from "@/engine/pixel/canvas";

/** Merge horizontal runs of one colour into a single rectangle, so a sprite is a few dozen shapes rather than hundreds. */
export function spriteRuns(sprite: Sprite) {
  const out: { x: number; y: number; w: number; fill: string }[] = [];
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === ".") {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      out.push({ x, y, w, fill: sprite.palette[ch] ?? "#ff00ff" });
      x += w;
    }
  });
  return out;
}

/**
 * Pixel art as crisp SVG. Give `label` for a picture that means something (it becomes the accessible name);
 * leave it off for decoration. `scale` is how many screen pixels each sprite pixel covers.
 */
export function PixelSprite({ sprite, scale = 4, label, className, flip = false }: { sprite: Sprite; scale?: number; label?: string; className?: string; flip?: boolean }) {
  const w = sprite.rows[0]?.length ?? 0;
  const h = sprite.rows.length;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w * scale}
      height={h * scale}
      shapeRendering="crispEdges"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
      style={{ imageRendering: "pixelated", transform: flip ? "scaleX(-1)" : undefined }}
      focusable="false"
    >
      {spriteRuns(sprite).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
