import { SCENE_THEMES } from "@/engine/pixel/scenes";
import { hashString } from "@/engine/pixel/canvas";
import { SceneBanner } from "../pixel/Avatars";
import { Ornament } from "./Ornament";

/** A page title with a pixel scene fading in from the right. The scene is picked from the title so each page keeps its own. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const h = hashString(title);
  const theme = SCENE_THEMES[h % SCENE_THEMES.length];
  return (
    <header className="relative mb-8 flex flex-col gap-3 overflow-hidden rounded-lg">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-full sm:w-3/5">
        <SceneBanner theme={theme} seed={h} className="h-full rounded-none border-0 opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent" />
      </div>
      <div className="relative flex flex-wrap items-end justify-between gap-4 py-2">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="anim-bob flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gold/60 bg-surface2 text-3xl text-gold shadow-[0_0_20px_var(--glow-1)]">
              {icon}
            </div>
          )}
          <div>
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            <h1 className="gilded text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <Ornament />
    </header>
  );
}
