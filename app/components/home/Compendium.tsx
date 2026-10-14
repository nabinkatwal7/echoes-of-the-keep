"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { rollExpression } from "@/engine/dice/roll";
import type { Attack } from "@/lib/content/attacks";
import { MonsterAvatar } from "../pixel/Avatars";
import { Label } from "./Section";

export type CreatureRow = { index: string; name: string; type: string; size: string; cr: number; crText: string; ac: string; hp: string; attacks: Attack[] };

const BANDS = [
  { key: "low", label: "CR 0 to 1", test: (v: number) => v <= 1 },
  { key: "mid", label: "CR 2 to 5", test: (v: number) => v >= 2 && v <= 5 },
  { key: "high", label: "CR 6 to 12", test: (v: number) => v >= 6 && v <= 12 },
  { key: "epic", label: "CR 13+", test: (v: number) => v >= 13 },
];
/** With no filters on, show a spread across the whole list rather than only the weakest creatures. */
function sample<T>(list: T[], n: number, filtering: boolean): T[] {
  if (filtering || list.length <= n) return list.slice(0, n);
  const step = list.length / n;
  return Array.from({ length: n }, (_, i) => list[Math.floor(i * step)]);
}
const cleanType = (t: string) => (t.startsWith("swarm") ? "swarm" : t);

/** A searchable showcase of real stat blocks, filtered by challenge rating and type, with attack rolls you can try. */
export function Compendium({ creatures }: { creatures: CreatureRow[] }) {
  const [q, setQ] = useState("");
  const [band, setBand] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [sel, setSel] = useState<CreatureRow | null>(null);
  const [log, setLog] = useState<{ id: number; text: string; tone: string }[]>([]);

  const types = useMemo(() => [...new Set(creatures.map((c) => cleanType(c.type)))].sort(), [creatures]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const b = BANDS.find((x) => x.key === band);
    return creatures.filter((c) => (!needle || c.name.toLowerCase().includes(needle)) && (!b || b.test(c.cr)) && (!type || cleanType(c.type) === type));
  }, [creatures, q, band, type]);

  const filtering = !!(q.trim() || band || type);

  const attack = (a: Attack) => {
    const hit = rollExpression("1d20");
    const nat = hit.terms[0].kept[0];
    const total = hit.total + a.bonus;
    const dmg = rollExpression(nat === 20 ? a.damage.replace(/(\d+)d/, (_, n) => `${Number(n) * 2}d`) : a.damage);
    setLog((l) => [{ id: Date.now() + Math.random(), tone: nat === 20 ? "text-emerald" : nat === 1 ? "text-danger" : "text-foreground", text: `${sel?.name} ${a.name}: d20 ${nat}${a.bonus >= 0 ? "+" : ""}${a.bonus} = ${total}${nat === 20 ? " (critical!)" : nat === 1 ? " (miss)" : ""} → ${nat === 1 ? "no damage" : `${dmg.total} ${a.kind}`}` }, ...l].slice(0, 5));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col gap-4">
        <div className="panel flex flex-col gap-4 p-5">
          <div>
            <Label htmlFor="mon-q">Search creatures</Label>
            <input id="mon-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="goblin, dragon, wolf…" className="field" />
          </div>
          <div>
            <Label>Challenge rating</Label>
            <div className="flex flex-wrap gap-2">
              {BANDS.map((b) => (
                <motion.button key={b.key} type="button" aria-pressed={band === b.key} whileTap={{ scale: 0.92 }} whileHover={{ y: -2 }} onClick={() => setBand(band === b.key ? null : b.key)} className={`rounded-full border px-3 py-1 text-sm ${band === b.key ? "border-goldBright bg-gold/20 text-goldBright" : "border-border text-muted"}`}>{b.label}</motion.button>
              ))}
            </div>
          </div>
          <div>
            <Label>Type</Label>
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <motion.button key={t} type="button" aria-pressed={type === t} whileTap={{ scale: 0.92 }} whileHover={{ y: -2 }} onClick={() => setType(type === t ? null : t)} className={`rounded-full border px-3 py-1 text-sm capitalize ${type === t ? "border-goldBright bg-gold/20 text-goldBright" : "border-border text-muted"}`}>{t}</motion.button>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted" role="status"><strong className="text-foreground">{shown.length}</strong> of {creatures.length} creatures</p>
        </div>

        <LayoutGroup>
          <motion.ul layout className="grid max-h-[24rem] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3" aria-label="Matching creatures">
            <AnimatePresence initial={false}>
              {sample(shown, 36, filtering).map((c) => (
                <motion.li key={c.index} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 260, damping: 24 }}>
                  <motion.button type="button" whileHover={{ y: -6, rotate: [0, -2, 2, 0] }} whileTap={{ scale: 0.94 }} onClick={() => { setSel(c); setLog([]); }} aria-pressed={sel?.index === c.index} className={`flex w-full flex-col items-center gap-1 rounded border bg-surface p-3 ${sel?.index === c.index ? "border-goldBright shadow-[0_0_20px_var(--glow-1)]" : "border-border"}`}>
                    <MonsterAvatar type={c.type} name={c.name} size={56} />
                    <span className="text-center text-xs font-semibold leading-tight">{c.name}</span>
                    <span className="text-[0.7rem] text-muted">CR {c.crText}</span>
                  </motion.button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </LayoutGroup>
      </div>

      <div className="panel flex min-h-[24rem] flex-col gap-3 p-5" aria-live="polite">
        <AnimatePresence mode="wait">
          {sel ? (
            <motion.div key={sel.index} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ type: "spring", stiffness: 200, damping: 22 }} className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
                  <MonsterAvatar type={sel.type} name={sel.name} size={88} />
                </motion.div>
                <div>
                  <h3 className="font-display text-2xl uppercase tracking-[0.08em] text-goldBright">{sel.name}</h3>
                  <p className="text-sm capitalize text-muted">{sel.size} {sel.type} · CR {sel.crText}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-center">
                <div className="panel-flat py-2"><dt className="rune-label">Armor class</dt><dd className="font-display text-2xl">{sel.ac}</dd></div>
                <div className="panel-flat py-2"><dt className="rune-label">Hit points</dt><dd className="font-display text-xl">{sel.hp}</dd></div>
              </dl>
              <div>
                <p className="rune-label mb-2">Attacks: tap to roll</p>
                {sel.attacks.length ? (
                  <div className="flex flex-wrap gap-2">
                    {sel.attacks.map((a) => (
                      <motion.button key={a.name} type="button" whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.9, rotate: -3 }} onClick={() => attack(a)} className="rounded border border-crimson/70 bg-crimson/10 px-3 py-2 text-left text-sm">
                        <span className="block font-semibold">{a.name}</span>
                        <span className="text-xs text-muted">+{a.bonus} to hit · {a.damage} {a.kind}</span>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">This creature has no weapon attacks to roll; it relies on traits and special actions.</p>
                )}
              </div>
              <ul className="min-h-[6rem] space-y-1 text-sm" aria-label="Attack results">
                <AnimatePresence initial={false}>
                  {log.map((l) => (
                    <motion.li key={l.id} layout initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className={l.tone}>{l.text}</motion.li>
                  ))}
                </AnimatePresence>
              </ul>
              <Link href={`/wiki/creatures/${sel.index}`} className="font-display text-xs uppercase tracking-[0.18em] text-gold hover:text-goldBright">Full stat block →</Link>
            </motion.div>
          ) : (
            <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="m-auto text-center text-muted">Choose a creature to see its stat block and roll its attacks.</motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
