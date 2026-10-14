import { ReadingOptions } from "./ReadingOptions";
import { LOGO } from "@/engine/pixel/logo";
import { PixelSprite } from "../pixel/PixelSprite";
import { ThemeToggle } from "./ThemeToggle";

export function SiteFooter() {
  return (
    <footer className="no-print mt-16 border-t border-border/60 bg-shade/30 py-8 text-center text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4">
        <PixelSprite sprite={LOGO} scale={2} />
        <p className="font-display text-sm uppercase tracking-[0.2em] text-foreground">Emberhall</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ThemeToggle showLabel className="h-9 text-xs" />
          <ReadingOptions />
        </div>
        <p>An unofficial fan project. Not affiliated with or endorsed by Wizards of the Coast.</p>
        <p className="text-xs">Rules content belongs to its owners and is shown for personal use.</p>
        <p className="text-xs">
          <a className="underline hover:text-goldBright" href="/rules-notes">Rules notes</a>
          {" · "}
          <a className="underline hover:text-goldBright" href="/legal">Legal and attribution</a>
        </p>
      </div>
    </footer>
  );
}
