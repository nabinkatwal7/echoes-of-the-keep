"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/app/components/ui/Button";
import { importCharacter } from "@/lib/characters/portableActions";

/** Choose an exported .json file and create a hero from it. */
export function ImportButton() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          start(async () => {
            const r = await importCharacter(await file.text());
            if (r.ok) router.push(`/characters/${r.id}`);
            else setError(r.errors.slice(0, 3).join(" · "));
          });
        }}
      />
      <Button variant="secondary" disabled={pending} onClick={() => input.current?.click()}>
        {pending ? "Importing…" : "Import hero"}
      </Button>
      {error && <p className="max-w-xs text-right text-xs text-danger">{error}</p>}
    </div>
  );
}
