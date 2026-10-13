import { D20 } from "./D20";

/** Decorative divider: gold rule with a die in the middle. */
export function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 text-gold ${className}`} aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/60 to-gold/80" />
      <D20 className="h-5 w-5 opacity-90" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/60 to-gold/80" />
    </div>
  );
}
