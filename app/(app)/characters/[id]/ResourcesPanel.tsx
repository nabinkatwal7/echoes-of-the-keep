"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { takeLongRest, takeShortRest, spendClassResource, convertSorcery } from "@/lib/characters/playActions";
import type { ResourceView } from "@/lib/characters/play";

export function ResourcesPanel({
  id,
  resources,
  hitDice,
  currentHp,
  maxHp,
}: {
  id: string;
  resources: ResourceView[];
  hitDice: Record<string, { total: number; spent: number }>;
  currentHp: number;
  maxHp: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [spend, setSpend] = useState<Record<string, number>>({});

  function run(fn: () => Promise<{ ok: boolean; errors?: string[]; healed?: number }>, okMessage?: (r: { healed?: number }) => string) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setError("");
        setMessage(okMessage?.(r) ?? "");
        setSpend({});
        router.refresh();
      } else {
        setMessage("");
        setError(r.errors?.[0] ?? "Something went wrong");
      }
    });
  }

  const dice = Object.entries(hitDice).sort((a, b) => Number(b[0]) - Number(a[0]));

  return (
    <Card className="no-print flex flex-col gap-4">
      <h2 className="font-display text-lg uppercase tracking-[0.12em] text-goldBright">Features and rest</h2>

      {resources.some((r) => r.key.endsWith("sorcery-points")) && (
        <div className="flex flex-wrap items-center gap-2 rounded border border-border p-2 text-sm">
          <span className="rune-label">Flexible Casting</span>
          {[1, 2, 3].map((lvl) => (
            <span key={lvl} className="flex gap-1">
              <Button variant="secondary" className="min-h-8 px-2 text-[0.65rem]" disabled={pending} onClick={() => run(() => convertSorcery(id, "slot-to-points", lvl))}>L{lvl} slot → points</Button>
              <Button variant="secondary" className="min-h-8 px-2 text-[0.65rem]" disabled={pending} onClick={() => run(() => convertSorcery(id, "points-to-slot", lvl))}>points → L{lvl} slot</Button>
            </span>
          ))}
        </div>
      )}

      {resources.length > 0 && (
        <ul className="flex flex-col divide-y divide-borderSoft">
          {resources.map((r) => (
            <li key={r.key} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                {r.label}
                <span className="ml-2 text-xs text-muted">{r.recharge === "short" ? "short rest" : r.recharge === "long" ? "long rest" : r.recharge}</span>
              </span>
              {r.style === "uses" && r.max <= 10 ? (
                <span className="flex gap-1.5" aria-label={`${r.max - r.used} of ${r.max} uses left`}>
                  {Array.from({ length: r.max }, (_, i) => (
                    <span key={i} className={`h-4 w-4 rounded-full border ${i < r.max - r.used ? "border-goldBright bg-gold" : "border-border"}`} />
                  ))}
                </span>
              ) : (
                <span className="font-display text-goldBright">
                  {r.max - r.used} / {r.max}
                </span>
              )}
              <Button variant="secondary" className="min-h-8 px-3 text-[0.65rem]" disabled={pending || r.used >= r.max} onClick={() => run(() => spendClassResource(id, r.key, 1))}>
                Use
              </Button>
              {r.style === "pool" && (
                <Button variant="ghost" className="min-h-8 px-2 text-[0.65rem]" disabled={pending || r.used + 5 > r.max} onClick={() => run(() => spendClassResource(id, r.key, 5))}>
                  Use 5
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
        <h3 className="eyebrow">Resting</h3>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {dice.map(([die, d]) => {
            const left = d.total - d.spent;
            return (
              <label key={die} className="flex items-center gap-2">
                d{die}: {left}/{d.total}
                <input
                  type="number"
                  min={0}
                  max={left}
                  value={spend[die] ?? 0}
                  onChange={(e) => setSpend({ ...spend, [die]: Math.max(0, Math.min(left, Number(e.target.value) || 0)) })}
                  className="field w-16 min-h-8 py-0"
                  aria-label={`Spend d${die} hit dice`}
                />
              </label>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              run(
                () => takeShortRest(id, Object.entries(spend).map(([die, count]) => ({ die: Number(die), count }))),
                (r) => `Short rest taken${r.healed ? `: recovered ${r.healed} HP` : ""}.`,
              )
            }
          >
            Short rest
          </Button>
          <Button disabled={pending} onClick={() => run(() => takeLongRest(id), () => "Long rest taken: HP, spell slots and features restored.")}>
            Long rest
          </Button>
          <span className="self-center text-sm text-muted">
            HP {currentHp}/{maxHp}
          </span>
        </div>
      </div>
      {message && <p className="text-sm text-emerald">{message}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
