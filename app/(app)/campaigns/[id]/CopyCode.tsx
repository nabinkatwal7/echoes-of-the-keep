"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <code className="flex-1 rounded border border-gold/50 bg-black/40 px-4 py-3 text-center font-display text-2xl tracking-[0.35em] text-goldBright">{code}</code>
      <Button
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // clipboard unavailable: the code is still visible to copy by hand
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
