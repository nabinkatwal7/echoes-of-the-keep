"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { rollPlayground, type PlaygroundResult } from "@/engine/dice/playground";
import type { RollMode } from "@/engine/dice/roll";
import { D20 } from "../ui/D20";
import { Label } from "./Section";

const PRESETS = ["1d20", "4d6kh3", "2d8+1d6", "8d6", "1d100"];
type Entry = { id: number; formula: string; bonus: number; mode: RollMode; total: number; natural: "crit" | "fumble" | null };

/** A dice tray that runs the app's own dice engine: formulas with keep-highest, a bonus, advantage and disadvantage. */
export function DiceLab() {
  const [formula, setFormula] = useState("1d20");
  const [bonus, setBonus] = useState(5);
  const [mode, setMode] = useState<RollMode>("normal");
  const [result, setResult] = useState<Extract<PlaygroundResult, { ok: true }> | null>(null);
  const [error, setError] = useState("");
  const [shown, setShown] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState<Entry[]>([]);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const roll = () => {
    const r = rollPlayground({ formula, bonus, mode });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError("");
    setRolling(true);
    if (timer.current) clearInterval(timer.current);
    // the number scrambles for a moment, then lands on the real total
    let ticks = 0;
    timer.current = setInterval(() => {
      ticks++;
      setShown(Math.floor(Math.random() * 20) + 1);
      if (ticks > 10) {
        if (timer.current) clearInterval(timer.current);
        setShown(r.total);
        setResult(r);
        setRolling(false);
        setHistory((h) => [{ id: ++seq.current, formula, bonus, mode: r.modeApplied, total: r.total, natural: r.natural }, ...h].slice(0, 6));
      }
    }, 60);
  };

  const flash = result?.natural === "crit" ? "text-emerald" : result?.natural === "fumble" ? "text-danger" : "text-goldBright";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="panel flex flex-col gap-5 p-6">
        <div>
          <Label htmlFor="dice-formula">Formula</Label>
          <input id="dice-formula" value={formula} onChange={(e) => setFormula(e.target.value)} onKeyDown={(e) => e.key === "Enter" && roll()} className="field font-mono text-lg" spellCheck={false} />
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <motion.button key={p} type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.92 }} onClick={() => setFormula(p)} className={`rounded border px-2.5 py-1 font-mono text-sm ${formula === p ? "border-goldBright text-goldBright" : "border-border text-muted"}`}>
                {p}
              </motion.button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <Label>Modifier</Label>
            <div className="flex items-center gap-2">
              <motion.button type="button" whileTap={{ scale: 0.85 }} aria-label="Decrease modifier" onClick={() => setBonus((b) => Math.max(-10, b - 1))} className="h-10 w-10 rounded border border-border text-xl">−</motion.button>
              <output aria-live="polite" className="w-12 text-center font-display text-2xl text-goldBright">{bonus >= 0 ? `+${bonus}` : bonus}</output>
              <motion.button type="button" whileTap={{ scale: 0.85 }} aria-label="Increase modifier" onClick={() => setBonus((b) => Math.min(20, b + 1))} className="h-10 w-10 rounded border border-border text-xl">+</motion.button>
            </div>
          </div>
          <fieldset>
            <legend className="rune-label mb-1">Roll with</legend>
            <div className="relative flex rounded border border-border p-0.5">
              {(["disadvantage", "normal", "advantage"] as const).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`relative z-10 px-3 py-2 text-sm capitalize ${mode === m ? "text-onGold" : "text-muted"}`}>
                  {mode === m && <motion.span layoutId="dice-mode" className="absolute inset-0 -z-10 rounded bg-gold" transition={{ type: "spring", stiffness: 300, damping: 26 }} />}
                  {m === "normal" ? "Normal" : m === "advantage" ? "Advantage" : "Disadvantage"}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <motion.button type="button" onClick={roll} disabled={rolling} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} className="min-h-12 self-start rounded border border-goldBright/70 bg-gradient-to-b from-[var(--btn-1)] via-[var(--btn-2)] to-[var(--btn-3)] px-8 font-display text-sm uppercase tracking-[0.16em] text-onGold shadow-[0_3px_0_var(--btn-edge)] disabled:opacity-60">
          {rolling ? "Rolling…" : "Roll the dice"}
        </motion.button>
        {error && <p role="alert" className="text-danger">{error}</p>}
        <ol aria-label="Recent rolls" className="flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {history.map((h) => (
              <motion.li key={h.id} layout initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="rounded border border-borderSoft px-2 py-1 text-sm text-muted">
                {h.formula}
                {h.bonus ? (h.bonus > 0 ? `+${h.bonus}` : h.bonus) : ""} → <strong className={h.natural === "crit" ? "text-emerald" : h.natural === "fumble" ? "text-danger" : "text-foreground"}>{h.total}</strong>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </div>

      <div className="panel flex min-h-[22rem] flex-col items-center justify-center gap-4 p-6 text-center">
        <motion.div
          key={rolling ? "rolling" : result?.total ?? "idle"}
          animate={rolling ? { rotate: [0, 120, 240, 360, 480, 600, 720], scale: [1, 1.15, 0.95, 1.1, 1], y: [0, -24, 0, -14, 0] } : { rotate: 0, scale: [1.25, 1], y: 0 }}
          transition={rolling ? { duration: 0.7, ease: "easeInOut" } : { type: "spring", stiffness: 300, damping: 12 }}
          className="relative h-44 w-44 text-gold"
        >
          <D20 className="h-full w-full drop-shadow-[0_0_24px_var(--glow-1)]" />
          <span className={`absolute inset-0 flex items-center justify-center font-display text-5xl font-bold ${flash}`} aria-hidden>{shown ?? "?"}</span>
        </motion.div>
        <div aria-live="polite" className="min-h-[5rem]">
          {result ? (
            <>
              <p className={`font-display text-4xl ${flash}`}>
                {result.natural === "crit" ? "Natural 20! " : result.natural === "fumble" ? "Natural 1. " : ""}
                {result.total}
              </p>
              <p className="text-sm text-muted">
                {result.rolls.map((r, i) => (
                  <span key={i} className={i === result.used ? "text-foreground" : "line-through opacity-60"}>
                    {i > 0 && " | "}
                    [<DiceList terms={r.terms} />]
                    {r.modifier ? ` ${r.modifier > 0 ? "+" : ""}${r.modifier}` : ""}
                  </span>
                ))}
                {result.bonus ? ` ${result.bonus > 0 ? "+" : "−"} ${Math.abs(result.bonus)}` : ""}
              </p>
              {result.modeApplied !== "normal" && <p className="text-xs uppercase tracking-widest text-gold">{result.modeApplied}: kept the {result.modeApplied === "advantage" ? "higher" : "lower"} roll</p>}
            </>
          ) : (
            <p className="text-muted">Press roll. Try 4d6kh3 for a set of ability scores.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Every die in order; dice dropped by a keep-highest or keep-lowest term are struck through. */
function DiceList({ terms }: { terms: { rolls: number[]; kept: number[] }[] }) {
  return (
    <>
      {terms.map((t, ti) => {
        const pool = [...t.kept];
        return (
          <span key={ti}>
            {ti > 0 && " + "}
            {t.rolls.map((n, i) => {
              const at = pool.indexOf(n);
              const kept = at >= 0;
              if (kept) pool.splice(at, 1);
              return (
                <span key={i} className={kept ? "" : "line-through opacity-50"}>
                  {i > 0 && ", "}
                  {n}
                </span>
              );
            })}
          </span>
        );
      })}
    </>
  );
}
