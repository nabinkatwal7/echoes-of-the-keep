import { cn } from "@/utils/cn";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("field", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("field", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("field min-h-24", className)} {...props} />;
}

/** Label wrapper in the small-caps rune style. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="rune-label">
        {label}
        {hint && <span className="ml-2 normal-case tracking-normal text-muted/70">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
