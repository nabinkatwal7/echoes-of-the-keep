"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, LinkButton } from "@/app/components/ui/Button";
import { Select } from "@/app/components/ui/Input";
import { attachCharacter } from "@/lib/campaigns/actions";

export function AttachCharacter({ campaignId, characters }: { campaignId: string; characters: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [choice, setChoice] = useState("");
  const [error, setError] = useState("");

  if (characters.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>Bring a hero to this table.</span>
        <LinkButton href="/characters/new" variant="secondary">
          Forge a hero
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1">
        <Select value={choice} onChange={(e) => setChoice(e.target.value)} aria-label="Choose a hero">
          <option value="">Bring a hero to the table…</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <Button
        variant="secondary"
        disabled={pending || !choice}
        onClick={() =>
          start(async () => {
            const r = await attachCharacter(campaignId, choice);
            if (r.ok) {
              setChoice("");
              setError("");
              router.refresh();
            } else setError(r.errors[0]);
          })
        }
      >
        Add to party
      </Button>
      {error && <p className="basis-full text-sm text-danger">{error}</p>}
    </div>
  );
}
