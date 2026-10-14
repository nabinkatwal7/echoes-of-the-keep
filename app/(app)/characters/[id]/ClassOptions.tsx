"use client";

import { useState, useTransition } from "react";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { INVOCATION_OPTIONS, invocationSlots } from "@/engine/classes/invocations";
import { METAMAGIC_OPTIONS, metamagicKnownCount } from "@/engine/spells/metamagic";
import { saveClassOptions } from "@/lib/characters/options";

const label = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function ClassOptions({
  id, sorcererLevel, warlockLevel, metamagic, invocations,
}: {
  id: string;
  sorcererLevel: number;
  warlockLevel: number;
  metamagic: string[];
  invocations: string[];
}) {
  const [meta, setMeta] = useState(metamagic);
  const [inv, setInv] = useState(invocations);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const metaMax = metamagicKnownCount(sorcererLevel);
  const invMax = invocationSlots(warlockLevel);
  if (!metaMax && !invMax) return null;

  function toggle(list: string[], set: (v: string[]) => void, value: string, max: number) {
    set(list.includes(value) ? list.filter((x) => x !== value) : list.length < max ? [...list, value] : list);
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="eyebrow">Class options</h2>
      {metaMax > 0 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm text-muted">Metamagic ({meta.length}/{metaMax})</legend>
          <div className="flex flex-wrap gap-2">
            {METAMAGIC_OPTIONS.map((name) => (
              <label key={name} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={meta.includes(name)} onChange={() => toggle(meta, setMeta, name, metaMax)} />
                {label(name)}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {invMax > 0 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm text-muted">Invocations ({inv.length}/{invMax}). Agonizing Blast adds your Charisma modifier to eldritch blast.</legend>
          <div className="flex flex-wrap gap-2">
            {INVOCATION_OPTIONS.map((name) => (
              <label key={name} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={inv.includes(name)} onChange={() => toggle(inv, setInv, name, invMax)} />
                {label(name)}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <Button
        disabled={pending}
        onClick={() => start(async () => {
          const r = await saveClassOptions(id, meta, inv);
          setError(r.ok ? "" : r.errors[0]);
        })}
      >
        {pending ? "Saving…" : "Save options"}
      </Button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
