"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GiHearts } from "react-icons/gi";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Input } from "@/app/components/ui/Input";
import { changeHitPoints, rollDeathSave } from "@/lib/characters/sheetActions";

export function VitalsPanel({
  id,
  hp,
  maxHp,
  tempHp,
  deathSaves,
  conditions,
}: {
  id: string;
  hp: number;
  maxHp: number;
  tempHp: number;
  deathSaves: { successes: number; failures: number };
  conditions: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState("");
  const [critical, setCritical] = useState(false);
  const [error, setError] = useState("");
  const dead = conditions.includes("dead");
  const stable = conditions.includes("stable");
  const down = hp === 0 && !dead;
  const pct = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));

  function run(fn: () => Promise<{ ok: boolean; errors?: string[] }>) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setError("");
        setAmount("");
        router.refresh();
      } else setError(r.errors?.[0] ?? "Something went wrong");
    });
  }
  const n = Number(amount);

  return (
    <Card className="no-print flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <GiHearts className="text-3xl text-danger" />
          <div>
            <p className="font-display text-3xl">
              {hp}
              <span className="text-lg text-muted"> / {maxHp}</span>
              {tempHp > 0 && <span className="ml-3 text-lg text-arcane">+{tempHp} temp</span>}
            </p>
            <p className="rune-label">Hit points</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {dead && <Badge tone="crimson">Dead</Badge>}
          {stable && <Badge tone="emerald">Stable</Badge>}
          {down && !stable && <Badge tone="ember">Unconscious · dying</Badge>}
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full border border-crimson/60 bg-black/50" role="progressbar" aria-valuenow={hp} aria-valuemax={maxHp} aria-label="Hit points">
        <div className="h-full bg-gradient-to-r from-[#7a1b2a] to-[#d4566a] transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-28">
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" aria-label="Amount" />
        </div>
        <Button variant="danger" disabled={pending || !(n > 0)} onClick={() => run(() => changeHitPoints(id, { kind: "damage", amount: n, critical }))}>
          Damage
        </Button>
        <Button variant="secondary" disabled={pending || !(n > 0)} onClick={() => run(() => changeHitPoints(id, { kind: "heal", amount: n }))}>
          Heal
        </Button>
        <Button variant="secondary" disabled={pending || !(n > 0)} onClick={() => run(() => changeHitPoints(id, { kind: "temp", amount: n }))}>
          Temp HP
        </Button>
        {down && (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} className="accent-[var(--gold)]" /> Critical hit
          </label>
        )}
      </div>

      {down && !stable && (
        <div className="flex flex-wrap items-center gap-4 rounded border border-ember/50 bg-ember/5 p-3">
          <div className="flex items-center gap-2" aria-label="Death saves">
            <span className="rune-label">Successes</span>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-4 w-4 rounded-full border ${i < deathSaves.successes ? "border-emerald bg-emerald" : "border-border"}`} />
            ))}
            <span className="rune-label ml-3">Failures</span>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-4 w-4 rounded-full border ${i < deathSaves.failures ? "border-danger bg-danger" : "border-border"}`} />
            ))}
          </div>
          <Button disabled={pending} onClick={() => run(() => rollDeathSave(id))}>
            Roll death save
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
