import { folkSprite, heroSprite } from "@/engine/pixel/heroes";
import { monsterSprite } from "@/engine/pixel/monsters";
import { sceneSprite, type SceneTheme } from "@/engine/pixel/scenes";
import { hashString } from "@/engine/pixel/canvas";
import { cn } from "@/utils/cn";
import { PixelSprite, spriteRuns } from "./PixelSprite";

/** A round frame for a pixel portrait, in the theme's colours. */
function Frame({ size, className, children }: { size: number; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-end justify-center overflow-hidden rounded-full border-2 border-gold/70 bg-surface2 shadow-inner", className)}
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  );
}

/** A hero's picture: their own portrait if they have one, otherwise a pixel sprite of their class. */
export function HeroAvatar({ classIndex, name, portraitUrl, size = 64, className }: { classIndex: string; name: string; portraitUrl?: string | null; size?: number; className?: string }) {
  if (portraitUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={portraitUrl} alt={`Portrait of ${name}`} referrerPolicy="no-referrer" width={size} height={size} className={cn("shrink-0 rounded-full border-2 border-gold/70 object-cover", className)} style={{ width: size, height: size }} />
    );
  }
  const sprite = heroSprite(classIndex, name);
  // the sprite is 16 by 18: scale it so the figure fills the frame
  const scale = Math.max(1, Math.floor((size * 0.92) / 18));
  return (
    <Frame size={size} className={className}>
      <PixelSprite sprite={sprite} scale={scale} label={`${name}, a ${classIndex}`} />
    </Frame>
  );
}

/** A creature's picture, chosen by its type and name. */
export function MonsterAvatar({ type, name, seed, size = 48, className, round = true }: { type?: string | null; name: string; seed?: string; size?: number; className?: string; round?: boolean }) {
  const sprite = monsterSprite(type, name, seed ?? name);
  const scale = Math.max(1, Math.floor((size * 0.9) / 16));
  const inner = <PixelSprite sprite={sprite} scale={scale} label={name} />;
  return round ? (
    <Frame size={size} className={cn("border-danger/60", className)}>
      {inner}
    </Frame>
  ) : (
    <span className={cn("inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      {inner}
    </span>
  );
}

/** A person with no class, such as a villager, from their name. */
export function FolkAvatar({ name, size = 48, className }: { name: string; size?: number; className?: string }) {
  const scale = Math.max(1, Math.floor((size * 0.92) / 18));
  return (
    <Frame size={size} className={className}>
      <PixelSprite sprite={folkSprite(name)} scale={scale} label={name} />
    </Frame>
  );
}

/** A wide pixel banner for an adventure or a page. It is decoration, so it is hidden from screen readers unless given a label. */
export function SceneBanner({ theme, seed = 0, className, label, animate = true }: { theme: SceneTheme; seed?: number | string; className?: string; label?: string; animate?: boolean }) {
  const sprite = sceneSprite(theme, seed);
  return (
    <div className={cn("overflow-hidden rounded border border-border", className)} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg viewBox="0 0 96 32" preserveAspectRatio="xMidYMid slice" shapeRendering="crispEdges" className="block h-full w-full" style={{ imageRendering: "pixelated" }} focusable="false">
        {spriteRuns(sprite).map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
        ))}
        {animate && (
          <g fill="#fff3c4">
            {Array.from({ length: 9 }, (_, i) => {
              const h = hashString(`${seed}${theme}${i}`);
              return <rect key={i} className="anim-twinkle" x={h % 96} y={(h >> 8) % 11} width={1} height={1} style={{ animationDelay: `${(i * 0.37).toFixed(2)}s`, animationDuration: `${2.4 + (i % 4) * 0.7}s` }} />;
            })}
          </g>
        )}
      </svg>
    </div>
  );
}

/** A small unframed figure for a map square or a list row: a hero by class, a monster by type. */
export function Token({ look, name, size = 28 }: { look: { k: "hero" | "monster"; type: string }; name: string; size?: number }) {
  if (look.k === "hero") return <PixelSprite sprite={heroSprite(look.type || "fighter", name)} scale={size / 18} />;
  return <PixelSprite sprite={monsterSprite(look.type || null, name, name)} scale={size / 16} />;
}
