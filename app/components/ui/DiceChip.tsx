import { cn } from "@/utils/cn";

/** A dice result, e.g. <DiceChip expression="1d20+5" total={17} crit /> */
export function DiceChip({ expression, total, crit, fumble }: { expression: string; total: number; crit?: boolean; fumble?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-2 rounded border bg-shade/30 px-2.5 py-1 text-sm",
        crit ? "border-goldBright text-goldBright shadow-[0_0_12px_rgba(239,205,111,0.35)]" : fumble ? "border-danger text-danger" : "border-border",
      )}
    >
      <span className="text-muted">{expression}</span>
      <strong className="font-display text-base">{total}</strong>
    </span>
  );
}
