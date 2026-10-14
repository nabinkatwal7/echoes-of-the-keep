import Link from "next/link";
import { cn } from "@/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const base =
  "inline-flex min-h-11 select-none items-center justify-center gap-2 rounded px-5 py-2 font-display text-[0.78rem] font-semibold uppercase tracking-[0.14em] transition duration-150 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.97] disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-goldBright/70 bg-gradient-to-b from-[var(--btn-1)] via-[var(--btn-2)] to-[var(--btn-3)] text-onGold shadow-[0_2px_0_var(--btn-edge),0_6px_16px_rgb(var(--shade)/0.35)] hover:brightness-110 hover:shadow-[0_2px_0_var(--btn-edge),0_0_22px_rgba(239,205,111,0.35)] active:translate-y-px",
  secondary:
    "border border-border bg-surface2/80 text-foreground hover:border-gold hover:text-goldBright hover:shadow-[0_0_16px_rgba(201,162,75,0.15)]",
  danger: "border border-crimson bg-gradient-to-b from-[#b8344a] to-[#7a1b2a] text-white shadow-[0_2px_0_#4a0f19] hover:brightness-110",
  ghost: "text-muted hover:text-goldBright",
};

export const buttonClasses = (variant: ButtonVariant = "primary", className?: string) => cn(base, variants[variant], className);

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}
