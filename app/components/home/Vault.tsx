"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

type Entry = { id: string; kind: "Subclass" | "Spell" | "Item" | "Monster"; name: string; by: string; text: string; votes: number };

const SAMPLE: Entry[] = [
  { id: "1", kind: "Subclass", name: "Oath of the Lantern", by: "sample", text: "A paladin who guards travellers on dark roads.", votes: 41 },
  { id: "2", kind: "Spell", name: "Echo Step", by: "sample", text: "Teleport 10 ft to where your last sound was heard.", votes: 37 },
  { id: "3", kind: "Item", name: "Bell of Small Mercies", by: "sample", text: "Rings once a day to end one condition on a creature.", votes: 29 },
  { id: "4", kind: "Monster", name: "Hollow Knight", by: "sample", text: "CR 5 armour that remembers its last battle.", votes: 24 },
  { id: "5", kind: "Item", name: "Ember Flask", by: "sample", text: "Thrown, it burns for three rounds.", votes: 18 },
  { id: "6", kind: "Spell", name: "Warm Hearth", by: "sample", text: "A ritual that gives a short rest's comfort in ten minutes.", votes: 12 },
];

const KIND_STYLE: Record<Entry["kind"], string> = { Subclass: "text-arcane", Spell: "text-ember", Item: "text-gold", Monster: "text-danger" };

/** A preview of the shared vault: entries you can vote on and add to a campaign. Votes and adds here live only in your browser. */
export function Vault() {
  const [entries, setEntries] = useState(SAMPLE);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<string[]>([]);
  const [filter, setFilter] = useState<Entry["kind"] | "All">("All");

  const vote = (id: string) => {
    const has = voted.has(id);
    setVoted((v) => {
      const n = new Set(v);
      if (has) n.delete(id);
      else n.add(id);
      return n;
    });
    setEntries((e) => [...e.map((x) => (x.id === id ? { ...x, votes: x.votes + (has ? -1 : 1) } : x))].sort((a, b) => b.votes - a.votes));
  };
  const max = Math.max(...entries.map((e) => e.votes));
  const list = entries.filter((e) => filter === "All" || e.kind === filter);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by kind">
          {(["All", "Subclass", "Spell", "Item", "Monster"] as const).map((k) => (
            <motion.button key={k} type="button" aria-pressed={filter === k} whileTap={{ scale: 0.92 }} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-sm ${filter === k ? "border-goldBright bg-gold/20 text-goldBright" : "border-border text-muted"}`}>{k}</motion.button>
          ))}
        </div>
        <p className="rounded-full border border-gold/50 px-3 py-1 text-xs uppercase tracking-widest text-gold">Preview with sample entries</p>
      </div>
      <LayoutGroup>
        <motion.ul layout className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {list.map((e) => (
              <motion.li key={e.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 240, damping: 24 }} whileHover={{ y: -6 }} className="panel-flat flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <span className={`font-display text-xs uppercase tracking-[0.16em] ${KIND_STYLE[e.kind]}`}>{e.kind}</span>
                  <span className="text-xs text-muted">by {e.by}</span>
                </div>
                <h3 className="font-display text-lg uppercase tracking-[0.06em]">{e.name}</h3>
                <p className="flex-1 text-sm text-foreground/85">{e.text}</p>
                <div className="h-2 overflow-hidden rounded bg-shade/30" role="meter" aria-valuenow={e.votes} aria-valuemin={0} aria-valuemax={max} aria-label={`${e.votes} votes`}>
                  <motion.div className="h-full bg-gradient-to-r from-gold to-ember" animate={{ width: `${(e.votes / max) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 16 }} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <motion.button type="button" aria-pressed={voted.has(e.id)} whileTap={{ scale: 0.8 }} whileHover={{ scale: 1.08 }} onClick={() => vote(e.id)} className={`min-h-9 rounded border px-3 text-sm ${voted.has(e.id) ? "border-goldBright bg-gold/20 text-goldBright" : "border-border"}`}>
                    <span aria-hidden>▲</span> <motion.span key={e.votes} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-block">{e.votes}</motion.span>
                  </motion.button>
                  <motion.button type="button" whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.05 }} onClick={() => setAdded((a) => (a.includes(e.id) ? a : [...a, e.id]))} disabled={added.includes(e.id)} className="min-h-9 rounded border border-emerald/60 px-3 text-sm text-emerald disabled:opacity-60">
                    {added.includes(e.id) ? "Added ✓" : "Add to campaign"}
                  </motion.button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </LayoutGroup>
      <p className="mt-5 text-sm text-muted">Sample entries, not real submissions. Your own homebrew races, backgrounds, feats and items live under <Link href="/homebrew" className="underline hover:text-goldBright">Homebrew</Link>, and campaigns can add their own spells and monsters.</p>
    </div>
  );
}
