import { srdOnly } from "@/lib/srd";
import { Prose } from "./Prose";

/** Handbook prose. In the free-rules build the wording is omitted; the mechanics still run. */
export function SourceText({ text, className }: { text: string; className?: string }) {
  if (srdOnly()) return <p className="text-sm text-muted">Handbook wording is left out of the free-rules build. The rules the app enforces still apply.</p>;
  return <Prose text={text} className={className} />;
}
