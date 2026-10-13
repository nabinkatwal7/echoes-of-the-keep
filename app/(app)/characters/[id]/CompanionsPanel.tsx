"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GiPawPrint } from "react-icons/gi";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Field, Input, Select } from "@/app/components/ui/Input";
import { addCompanion, removeCompanion, setCompanionHp, type Companion, type CompanionKind } from "@/lib/characters/companionActions";

const KIND_LABEL: Record<CompanionKind, string> = {
  familiar: "Familiar",
  "beast-companion": "Beast companion",
  "wild-shape": "Wild Shape",
  summon: "Summon",
};

export function CompanionsPanel({
  id,
  companions,
  creatures,
  kinds,
}: {
  id: string;
  companions: Companion[];
  creatures: { index: string; name: string; challenge: string | null }[];
  /** which kinds this character can have, from its classes and spells */
  kinds: CompanionKind[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<CompanionKind>(kinds[0] ?? "summon");
  const [creature, setCreature] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function run(fn: () => Promise<{ ok: boolean; errors?: string[] }>) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setError("");
        router.refresh();
      } else setError(r.errors?.[0] ?? "Something went wrong");
    });
  }

  return (
    <Card className="no-print flex flex-col gap-4">
      <h2 className="flex items-center gap-2 font-display text-lg uppercase tracking-[0.12em] text-goldBright">
        <GiPawPrint /> Companions and forms
      </h2>
      {companions.length === 0 ? (
        <p className="text-muted">No companions, familiars or active forms.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-borderSoft">
          {companions.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-2">
              <Badge tone={c.kind === "wild-shape" ? "emerald" : "gold"}>{KIND_LABEL[c.kind]}</Badge>
              <Link href={`/wiki/creatures/${c.creatureIndex}`} className="min-w-0 flex-1 truncate hover:text-goldBright">
                {c.name}
              </Link>
              <span className="flex items-center gap-1 font-display">
                <Button variant="ghost" className="min-h-8 px-2" disabled={pending} onClick={() => run(() => setCompanionHp(id, c.id, c.hp - 1))} aria-label={`Lower ${c.name} HP`}>
                  −
                </Button>
                {c.hp}/{c.maxHp}
                <Button variant="ghost" className="min-h-8 px-2" disabled={pending} onClick={() => run(() => setCompanionHp(id, c.id, c.hp + 1))} aria-label={`Raise ${c.name} HP`}>
                  +
                </Button>
              </span>
              <Button variant="ghost" className="min-h-8 px-2 text-[0.65rem]" disabled={pending} onClick={() => run(() => removeCompanion(id, c.id))}>
                {c.kind === "wild-shape" ? "Revert" : "Dismiss"}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-[1fr_1.4fr_1fr_auto] sm:items-end">
        <Field label="Kind">
          <Select value={kind} onChange={(e) => setKind(e.target.value as CompanionKind)}>
            {[...kinds, "summon" as const].filter((k, i, a) => a.indexOf(k) === i).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Creature">
          <Select value={creature} onChange={(e) => setCreature(e.target.value)}>
            <option value="">Choose a creature</option>
            {creatures.map((c) => (
              <option key={c.index} value={c.index}>
                {c.name}
                {c.challenge ? ` (CR ${c.challenge.split(" ")[0]})` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Name" hint="optional">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </Field>
        <Button disabled={pending || !creature} onClick={() => run(() => addCompanion(id, creature, kind, name))}>
          Add
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
