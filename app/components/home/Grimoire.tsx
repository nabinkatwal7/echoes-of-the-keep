"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SPELL_SLOTS_BY_CASTER_LEVEL } from "@/engine/progression";
import { schoolStyle } from "../icons";
import { Label } from "./Section";

export type SpellRow = { index: string; name: string; level: number; school: string; castingTime: string; components: string; ritual: boolean; concentration: boolean };

const SCHOOLS = ["abjuration", "conjuration", "divination", "enchantment", "evocation", "illusion", "necromancy", "transmutation"];
const TIMES = ["Action", "Bonus action", "Reaction", "1 minute or more"] as const;
const ordinal = (n: number) => (n === 0 ? "Cantrip" : n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

const timeOf = (t: string): (typeof TIMES)[number] => {
  const s = t.toLowerCase();
  return s.includes("bonus") ? "Bonus action" : s.includes("reaction") ? "Reaction" : /^1 action/.test(s) ? "Action" : "1 minute or more";
};

function Chip({ on, onClick, children, color }: { on: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <motion.button type="button" aria-pressed={on} onClick={onClick} whileHover={{ y: -2 }} whileTap={{ scale: 0.9 }} className={`rounded-full border px-3 py-1 text-sm capitalize ${on ? "border-goldBright bg-gold/20 text-goldBright" : "border-border text-muted"} ${color ?? ""}`}>
      {children}
    </motion.button>
  );
}

/** With no filters on, show a spread across every level rather than only the first cantrips. */
function pick<T>(list: T[], n: number, filtering: boolean): T[] {
  if (filtering || list.length <= n) return list.slice(0, n);
  const step = list.length / n;
  return Array.from({ length: n }, (_, i) => list[Math.floor(i * step)]);
}

const toggle = <T,>(set: Set<T>, v: T) => {
  const n = new Set(set);
  if (n.has(v)) n.delete(v);
  else n.add(v);
  return n;
};

/** A filterable grid of the real spell list with a slot tracker. */
export function Grimoire({ spells }: { spells: SpellRow[] }) {
  const [schools, setSchools] = useState<Set<string>>(new Set());
  const [levels, setLevels] = useState<Set<number>>(new Set());
  const [times, setTimes] = useState<Set<string>>(new Set());
  const [comps, setComps] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<SpellRow | null>(null);
  const [casterLevel, setCasterLevel] = useState(5);
  const [used, setUsed] = useState<number[]>([]);
  const [flash, setFlash] = useState("");

  const shown = useMemo(
    () =>
      spells.filter(
        (s) =>
          (!schools.size || schools.has(s.school.toLowerCase())) &&
          (!levels.size || levels.has(s.level)) &&
          (!times.size || times.has(timeOf(s.castingTime))) &&
          [...comps].every((c) => s.components.toUpperCase().includes(c)),
      ),
    [spells, schools, levels, times, comps],
  );

  const filtering = !!(schools.size || levels.size || times.size || comps.size);
  const slots = SPELL_SLOTS_BY_CASTER_LEVEL[casterLevel - 1];
  const left = (lvl: number) => (slots[lvl - 1] ?? 0) - (used[lvl - 1] ?? 0);
  const spend = (lvl: number) => {
    if (left(lvl) <= 0) return false;
    setUsed((u) => {
      const n = [...u];
      n[lvl - 1] = (n[lvl - 1] ?? 0) + 1;
      return n;
    });
    return true;
  };
  const cast = () => {
    if (!picked) return;
    if (picked.level === 0) return setFlash(`${picked.name} is a cantrip: cast it all day.`);
    let lvl = picked.level;
    while (lvl <= slots.length && left(lvl) <= 0) lvl++;
    if (lvl > slots.length) return setFlash("No slots left. Take a long rest.");
    spend(lvl);
    setFlash(`Cast ${picked.name} with a level ${lvl} slot.`);
  };
  const clear = () => {
    setSchools(new Set());
    setLevels(new Set());
    setTimes(new Set());
    setComps(new Set());
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="flex flex-col gap-4">
        <div className="panel flex flex-col gap-4 p-5">
          <div>
            <Label>School of magic</Label>
            <div className="flex flex-wrap gap-2">
              {SCHOOLS.map((s) => (
                <Chip key={s} on={schools.has(s)} onClick={() => setSchools(toggle(schools, s))} color={schools.has(s) ? "" : schoolStyle(s).text}>{s}</Chip>
              ))}
            </div>
          </div>
          <div>
            <Label>Level</Label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 10 }, (_, n) => (
                <Chip key={n} on={levels.has(n)} onClick={() => setLevels(toggle(levels, n))}>{ordinal(n)}</Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div>
              <Label>Casting time</Label>
              <div className="flex flex-wrap gap-2">
                {TIMES.map((t) => (
                  <Chip key={t} on={times.has(t)} onClick={() => setTimes(toggle(times, t))}>{t}</Chip>
                ))}
              </div>
            </div>
            <div>
              <Label>Components</Label>
              <div className="flex gap-2">
                {["V", "S", "M"].map((c) => (
                  <Chip key={c} on={comps.has(c)} onClick={() => setComps(toggle(comps, c))}>{c}</Chip>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-muted" role="status">
            <span><motion.strong key={shown.length} initial={{ scale: 1.5, color: "var(--gold-bright)" }} animate={{ scale: 1, color: "var(--foreground)" }} className="inline-block">{shown.length}</motion.strong> of {spells.length} spells</span>
            <button type="button" onClick={clear} className="underline hover:text-goldBright">Clear filters</button>
          </div>
        </div>

        <LayoutGroup>
          <motion.ul layout className="grid max-h-[26rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2" aria-label="Matching spells">
            <AnimatePresence initial={false}>
              {pick(shown, 40, filtering).map((s) => {
                const st = schoolStyle(s.school);
                return (
                  <motion.li key={s.index} layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ type: "spring", stiffness: 260, damping: 24 }}>
                    <button type="button" onClick={() => { setPicked(s); setFlash(""); }} aria-pressed={picked?.index === s.index} className={`w-full rounded border bg-surface px-3 py-2 text-left transition hover:border-gold ${picked?.index === s.index ? "border-goldBright" : st.border}`}>
                      <span className={`block font-display text-sm uppercase tracking-[0.08em] ${st.text}`}>{s.name}</span>
                      <span className="text-xs text-muted">{ordinal(s.level)} · {s.school}{s.concentration ? " · C" : ""}{s.ritual ? " · R" : ""}</span>
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
        </LayoutGroup>
        {shown.length > 40 && <p className="text-sm text-muted">Showing 40 of them. Narrow the filters, or <Link href="/wiki/spells" className="underline hover:text-goldBright">open the full spell list</Link>.</p>}
      </div>

      <div className="flex flex-col gap-4">
        <div className="panel min-h-[9rem] p-5" aria-live="polite">
          <AnimatePresence mode="wait">
            {picked ? (
              <motion.div key={picked.index} initial={{ opacity: 0, rotateX: -40 }} animate={{ opacity: 1, rotateX: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
                <p className="eyebrow">{ordinal(picked.level)} · {picked.school}</p>
                <h3 className={`font-display text-2xl uppercase tracking-[0.08em] ${schoolStyle(picked.school).text}`}>{picked.name}</h3>
                <p className="text-sm text-muted">{picked.castingTime} · {picked.components}</p>
                <div className="mt-1 flex gap-2">
                  <motion.button type="button" whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.04 }} onClick={cast} className="min-h-10 rounded border border-goldBright/70 bg-gold/15 px-4 font-display text-xs uppercase tracking-[0.14em] text-goldBright">Cast</motion.button>
                  <Link href={`/wiki/spells/${picked.index}`} className="inline-flex min-h-10 items-center px-2 text-sm underline hover:text-goldBright">Read it</Link>
                </div>
                {flash && <p className="text-sm text-foreground/90" role="status">{flash}</p>}
              </motion.div>
            ) : (
              <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-muted">Pick a spell to see its details and cast it against the slot tracker.</motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Spell slots</p>
            <button type="button" onClick={() => { setUsed([]); setFlash("A long rest restores every slot."); }} className="text-sm text-muted underline hover:text-goldBright">Long rest</button>
          </div>
          <label className="mt-2 block">
            <span className="rune-label">Caster level {casterLevel}</span>
            <input type="range" min={1} max={20} value={casterLevel} onChange={(e) => { setCasterLevel(Number(e.target.value)); setUsed([]); }} className="mt-1 w-full accent-[var(--gold)]" aria-label="Caster level" />
          </label>
          <ul className="mt-3 flex flex-col gap-2">
            {slots.map((total, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="w-10 font-display text-sm text-muted">{ordinal(i + 1)}</span>
                <span className="flex gap-1.5">
                  {Array.from({ length: total }, (_, k) => {
                    const spent = k >= total - (used[i] ?? 0);
                    return (
                      <motion.button key={k} type="button" aria-label={`${ordinal(i + 1)} level slot ${k + 1}, ${spent ? "spent" : "available"}`} onClick={() => setUsed((u) => { const n = [...u]; n[i] = Math.max(0, Math.min(total, (n[i] ?? 0) + (spent ? -1 : 1))); return n; })} animate={{ scale: spent ? 0.8 : 1, opacity: spent ? 0.35 : 1, backgroundColor: spent ? "transparent" : "var(--arcane)" }} whileHover={{ scale: 1.2 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} className="h-5 w-5 rounded-sm border-2 border-arcane" />
                    );
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
