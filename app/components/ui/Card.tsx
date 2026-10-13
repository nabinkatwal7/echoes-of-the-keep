import { cn } from "@/utils/cn";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  /** lighter frame without corner flourishes, for dense lists and nested content */
  flat?: boolean;
  /** lift and glow on hover (use on clickable cards) */
  interactive?: boolean;
};

/** Framed tome panel. `Card` is the shared name used across the app. */
export function Card({ className, flat, interactive, ...props }: Props) {
  return <div className={cn(flat ? "panel-flat" : "panel", interactive && "interactive-panel", "p-5", className)} {...props} />;
}

export const Panel = Card;
