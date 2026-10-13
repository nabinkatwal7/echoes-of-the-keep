import { cn } from "@/utils/cn";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("min-h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm", className)}
      {...props}
    />
  );
}
