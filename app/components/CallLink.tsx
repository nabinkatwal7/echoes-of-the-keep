import { callProvider, safeCallUrl } from "@/lib/campaigns/call";
import { buttonClasses } from "./ui/Button";

/** A button that opens the table's voice or video call in a new tab. Shows nothing when no link is set. */
export function CallLink({ url, variant = "secondary", className }: { url: string | null; variant?: "primary" | "secondary" | "ghost"; className?: string }) {
  const safe = url ? safeCallUrl(url) : null;
  if (!safe) return null;
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer" className={buttonClasses(variant, className)}>
      Join the call ({callProvider(safe)})<span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
