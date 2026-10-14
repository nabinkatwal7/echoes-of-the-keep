import { D20 } from "../ui/D20";

export function SiteFooter() {
  return (
    <footer className="no-print mt-16 border-t border-border/60 bg-black/30 py-8 text-center text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4">
        <D20 className="h-6 w-6 text-gold/70" />
        <p>An unofficial fan project. Not affiliated with or endorsed by Wizards of the Coast.</p>
        <p className="text-xs">Rules content belongs to its owners and is shown for personal use.</p>
        <p className="text-xs"><a className="underline hover:text-goldBright" href="/legal">Legal and attribution</a></p>
      </div>
    </footer>
  );
}
