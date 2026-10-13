import { cn } from "@/utils/cn";

/** Shows a dice result, e.g. <DiceChip expression="1d20+5" total={17} crit /> */
export function DiceChip({
  expression,
  total,
  crit,
  fumble,
}: {
  expression: string;
  total: number;
  crit?: boolean;
  fumble?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-2 rounded-md border border-border bg-surface px-2 py-1 text-sm",
        crit && "border-gold text-gold",
        fumble && "border-danger text-danger",
      )}
    >
      <span className="text-muted">{expression}</span>
      <strong>{total}</strong>
    </span>
  );
}
