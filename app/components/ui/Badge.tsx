import { cn } from "@/utils/cn";

const tones = {
  neutral: "border-border text-muted",
  gold: "border-gold/60 bg-gold/10 text-goldBright",
  crimson: "border-crimson/70 bg-crimson/15 text-danger",
  arcane: "border-arcane/60 bg-arcane/10 text-arcane",
  emerald: "border-emerald/60 bg-emerald/10 text-emerald",
  ember: "border-ember/60 bg-ember/10 text-ember",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-display text-[0.65rem] uppercase tracking-[0.14em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
