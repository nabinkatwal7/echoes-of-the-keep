"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeHitPoints } from "@/lib/characters/sheetActions";

/** A bar pinned to the bottom of the screen on phones: hit points and the four changes made most at the table. */
export function MobileHpBar({ id, hp, maxHp }: { id: string; hp: number; maxHp: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const change = (kind: "damage" | "heal", amount: number) =>
    start(async () => {
      const r = await changeHitPoints(id, { kind, amount });
      setError(r.ok ? "" : r.errors[0]);
      router.refresh();
    });

  const btn = "min-h-12 min-w-12 rounded border border-border bg-surface2 px-3 font-display text-sm font-semibold disabled:opacity-50 active:translate-y-px";
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-border bg-[var(--header-bg)] px-3 py-2 backdrop-blur md:hidden" role="group" aria-label="Quick hit point changes">
      {error && <p role="alert" className="pb-1 text-center text-xs text-danger">{error}</p>}
      <div className="mx-auto flex max-w-md items-center justify-between gap-2">
        <button type="button" className={`${btn} text-danger`} disabled={pending} onClick={() => change("damage", 5)} aria-label="Take 5 damage">−5</button>
        <button type="button" className={`${btn} text-danger`} disabled={pending} onClick={() => change("damage", 1)} aria-label="Take 1 damage">−1</button>
        <p className="min-w-16 text-center font-display text-lg" aria-live="polite">
          <span className="sr-only">Hit points </span>
          {hp}/{maxHp}
        </p>
        <button type="button" className={`${btn} text-emerald`} disabled={pending} onClick={() => change("heal", 1)} aria-label="Heal 1">+1</button>
        <button type="button" className={`${btn} text-emerald`} disabled={pending} onClick={() => change("heal", 5)} aria-label="Heal 5">+5</button>
      </div>
    </div>
  );
}
