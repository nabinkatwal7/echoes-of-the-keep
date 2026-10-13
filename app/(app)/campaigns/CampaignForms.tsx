"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Field, Input, Textarea } from "@/app/components/ui/Input";
import { createCampaign, joinCampaign } from "@/lib/campaigns/actions";

export function CampaignForms() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  function run(fn: () => Promise<{ ok: true; id: string } | { ok: false; errors: string[] }>) {
    start(async () => {
      const r = await fn();
      if (r.ok) router.push(`/campaigns/${r.id}`);
      else setErrors(r.errors);
    });
  }

  return (
    <aside className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <h2 className="font-display uppercase tracking-[0.12em] text-goldBright">Start a campaign</h2>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="The Lost Mine" maxLength={80} />
        </Field>
        <Field label="Premise" hint="optional">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} />
        </Field>
        <Button disabled={pending || name.trim().length < 2} onClick={() => run(() => createCampaign(name, description))}>
          Become the Dungeon Master
        </Button>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-display uppercase tracking-[0.12em] text-goldBright">Join a party</h2>
        <Field label="Invite code">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="K7QF2XMA" maxLength={12} className="font-display tracking-[0.3em]" />
        </Field>
        <Button variant="secondary" disabled={pending || code.trim().length < 4} onClick={() => run(() => joinCampaign(code))}>
          Join
        </Button>
      </Card>

      {errors.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-danger">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </aside>
  );
}
