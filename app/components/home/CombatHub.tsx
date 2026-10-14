"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { rollExpression } from "@/engine/dice/roll";
import { Token } from "../pixel/Avatars";

type Fighter = { id: string; name: string; look: { k: "hero" | "monster"; type: string }; init: number; hp: number; max: number; ac: number; conditions: string[]; side: "party" | "foe" };

const START: Fighter[] = [
  { id: "a", name: "Brannoch", look: { k: "hero", type: "fighter" }, init: 18, hp: 31, max: 31, ac: 18, conditions: [], side: "party" },
  { id: "b", name: "Mirela", look: { k: "hero", type: "wizard" }, init: 15, hp: 19, max: 19, ac: 12, conditions: ["Concentrating"], side: "party" },
  { id: "c", name: "Goblin boss", look: { k: "monster", type: "humanoid" }, init: 13, hp: 21, max: 21, ac: 17, conditions: [], side: "foe" },
  { id: "d", name: "Tamsin", look: { k: "hero", type: "rogue" }, init: 12, hp: 24, max: 24, ac: 15, conditions: ["Hidden"], side: "party" },
  { id: "e", name: "Dire wolf", look: { k: "monster", type: "beast" }, init: 9, hp: 37, max: 37, ac: 14, conditions: ["Prone"], side: "foe" },
  { id: "f", name: "Skeleton", look: { k: "monster", type: "undead" }, init: 6, hp: 13, max: 13, ac: 13, conditions: [], side: "foe" },
];

/** A running fight in miniature: initiative order that re-sorts, hit point bars, conditions and a turn marker that advances. */
export function CombatHub() {
  const [order, setOrder] = useState<Fighter[]>(START);
  const [turn, setTurn] = useState(0);
  const [round, setRound] = useState(1);
  const [auto, setAuto] = useState(true);
  const [log, setLog] = useState<string[]>(["Initiative is set. Round 1."]);

  const alive = order.filter((f) => f.hp > 0);
  const next = useCallback(() => {
    setTurn((t) => {
      const n = t + 1;
      if (n >= order.length) {
        setRound((r) => r + 1);
        return 0;
      }
      return n;
    });
  }, [order.length]);

  // the demo plays itself until paused
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      setOrder((o) => {
        const actor = o[turn];
        const foes = o.filter((f) => f.side !== actor?.side && f.hp > 0);
        if (!actor || actor.hp <= 0 || !foes.length) return o;
        const target = foes[Math.floor(Math.random() * foes.length)];
        const dmg = rollExpression(actor.side === "party" ? "1d8+3" : "1d6+2").total;
        setLog((l) => [`${actor.name} hits ${target.name} for ${dmg}.`, ...l].slice(0, 5));
        return o.map((f) => (f.id === target.id ? { ...f, hp: Math.max(0, f.hp - dmg) } : f));
      });
      next();
    }, 2200);
    return () => clearInterval(t);
  }, [auto, turn, next]);

  const reroll = () => {
    const rolled = order.map((f) => ({ ...f, init: rollExpression("1d20").total + (f.side === "party" ? 2 : 1), hp: f.max })).sort((a, b) => b.init - a.init);
    setOrder(rolled);
    setTurn(0);
    setRound(1);
    setLog(["Initiative rolled. Round 1."]);
  };
  const hit = (id: string, n: number) => setOrder((o) => o.map((f) => (f.id === id ? { ...f, hp: Math.min(f.max, Math.max(0, f.hp - n)) } : f)));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-lg uppercase tracking-[0.12em]">Round <motion.span key={round} initial={{ y: -18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-block text-goldBright">{round}</motion.span></p>
          <div className="flex flex-wrap gap-2">
            <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={reroll} className="min-h-10 rounded border border-border px-3 text-sm hover:border-gold">Roll initiative</motion.button>
            <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={next} className="min-h-10 rounded border border-border px-3 text-sm hover:border-gold">Next turn</motion.button>
            <motion.button type="button" whileTap={{ scale: 0.92 }} aria-pressed={!auto} onClick={() => setAuto(!auto)} className="min-h-10 rounded border border-goldBright/70 bg-gold/10 px-3 text-sm text-goldBright">{auto ? "Pause demo" : "Play demo"}</motion.button>
          </div>
        </div>
        <ol className="flex flex-col gap-2" aria-label="Turn order">
          <AnimatePresence initial={false}>
            {order.map((f, i) => {
              const down = f.hp <= 0;
              const pct = (f.hp / f.max) * 100;
              return (
                <motion.li key={f.id} layout transition={{ type: "spring", stiffness: 260, damping: 26 }} className={`relative flex flex-wrap items-center gap-3 rounded border px-3 py-2 ${i === turn ? "border-goldBright bg-gold/10" : "border-border"} ${down ? "opacity-45 grayscale" : ""}`}>
                  {i === turn && <motion.span layoutId="turn-marker" aria-hidden className="absolute -left-1 top-1/2 h-6 w-1.5 -translate-y-1/2 rounded bg-goldBright" />}
                  <span className="w-8 text-center font-display text-xl text-goldBright">{f.init}</span>
                  <span aria-hidden className={`flex h-10 w-10 items-end justify-center overflow-hidden rounded-full border bg-surface2 ${f.side === "party" ? "border-emerald" : "border-danger"}`}>
                    <motion.span animate={i === turn && !down ? { y: [0, -3, 0] } : { y: 0 }} transition={{ duration: 0.8, repeat: i === turn ? Infinity : 0 }}><Token look={f.look} name={f.name} size={30} /></motion.span>
                  </span>
                  <div className="min-w-[9rem] flex-1">
                    <p className="font-semibold">{f.name}{i === turn && !down ? " ◀" : ""}{down ? " (down)" : ""}</p>
                    <div className="mt-1 h-2 overflow-hidden rounded bg-shade/30" role="progressbar" aria-valuenow={f.hp} aria-valuemin={0} aria-valuemax={f.max} aria-label={`${f.name} hit points`}>
                      <motion.div className="h-full" animate={{ width: `${pct}%`, backgroundColor: pct > 60 ? "var(--emerald)" : pct > 30 ? "var(--ember)" : "var(--danger)" }} transition={{ type: "spring", stiffness: 120, damping: 16 }} />
                    </div>
                  </div>
                  <span className="text-sm text-muted">{f.hp}/{f.max} · AC {f.ac}</span>
                  <span className="flex flex-wrap gap-1">
                    {f.conditions.map((c) => (
                      <motion.span key={c} initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-full border border-crimson/60 bg-crimson/10 px-2 text-xs text-danger">{c}</motion.span>
                    ))}
                  </span>
                  <span className="flex gap-1">
                    <button type="button" aria-label={`Hit ${f.name} for 5`} onClick={() => hit(f.id, 5)} className="h-8 rounded border border-border px-2 text-xs hover:border-crimson">−5</button>
                    <button type="button" aria-label={`Heal ${f.name} for 5`} onClick={() => hit(f.id, -5)} className="h-8 rounded border border-border px-2 text-xs hover:border-emerald">+5</button>
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      </div>
      <div className="flex flex-col gap-4">
        <div className="panel p-5">
          <p className="eyebrow mb-2">Combat log</p>
          <ul className="min-h-[9rem] space-y-1 text-sm" aria-live="polite">
            <AnimatePresence initial={false}>
              {log.map((l, i) => (
                <motion.li key={l + i} layout initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1 - i * 0.15, x: 0 }} exit={{ opacity: 0 }}>{l}</motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
        <div className="panel-flat p-4 text-sm text-foreground/80">
          <p>{alive.filter((f) => f.side === "party").length} heroes and {alive.filter((f) => f.side === "foe").length} foes standing. The real tracker adds a battle map with walls and fog of war, spell targeting, opportunity attacks and the computer running monster turns.</p>
        </div>
      </div>
    </div>
  );
}
