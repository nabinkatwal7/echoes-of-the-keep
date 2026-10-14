"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ABILITIES, abilityModifier, proficiencyBonus, savingThrowBonus, skillBonus, type Ability, type AbilityScores, type Skill } from "@/engine/abilities";
import { HeroAvatar } from "../pixel/Avatars";
import { Label } from "./Section";

const SCORES: AbilityScores = { str: 8, dex: 14, con: 13, int: 16, wis: 12, cha: 10 };
const SAVE_PROF: Ability[] = ["int", "wis"];
const SKILL_PROF = ["arcana", "history", "investigation", "insight"];
const ASI_LEVELS = [4, 8, 12, 16, 19];
const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** A miniature of the real character sheet, using the same rules code: modifiers, proficiency by level, saves, skills and hit points. */
export function SheetPreview() {
  const [level, setLevel] = useState(3);
  const [damage, setDamage] = useState(0);
  const [pulse, setPulse] = useState(0);

  const d = useMemo(() => {
    const prof = proficiencyBonus(level);
    const con = abilityModifier(SCORES.con);
    const maxHp = 6 + con + (level - 1) * (4 + con); // d6 hit die: full at level 1, average (4) after
    const saves = ABILITIES.map((a) => ({ a, v: savingThrowBonus(a, SCORES, prof, SAVE_PROF.includes(a)) }));
    const skills = SKILL_PROF.map((s) => ({ s, v: skillBonus(s as Skill, SCORES, prof, "proficient") }));
    return { prof, maxHp, saves, skills, ac: 10 + abilityModifier(SCORES.dex) };
  }, [level]);

  const hp = Math.max(0, d.maxHp - damage);
  const pct = (hp / d.maxHp) * 100;
  const bar = pct > 60 ? "var(--emerald)" : pct > 30 ? "var(--ember)" : "var(--danger)";
  const hit = (n: number) => setDamage((x) => Math.min(d.maxHp, Math.max(0, x + n)));
  const levelUp = () => {
    if (level < 20) {
      setLevel(level + 1);
      setPulse((p) => p + 1);
    }
  };
  const gains = [
    `Hit points +${4 + abilityModifier(SCORES.con)} (average d6 roll plus Constitution)`,
    `Proficiency bonus ${fmt(proficiencyBonus(Math.min(20, level + 1)))}`,
    ASI_LEVELS.includes(level + 1) ? "Ability Score Improvement or a feat" : "New class features and spell preparation",
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="panel p-6">
        <div className="flex flex-wrap items-center gap-4">
          <HeroAvatar classIndex="wizard" name="Mirela" size={80} />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">High elf wizard</p>
            <h3 className="gilded text-3xl font-bold">Mirela Vance</h3>
            <p className="text-muted">Level <motion.span key={level} initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-block font-semibold text-foreground">{level}</motion.span> · Proficiency <motion.span key={d.prof} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="inline-block font-semibold text-goldBright">{fmt(d.prof)}</motion.span> · AC {d.ac}</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <Label>Hit points</Label>
            <p className="font-display text-lg"><motion.span key={hp} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="inline-block">{hp}</motion.span> / {d.maxHp}</p>
          </div>
          <div className="h-4 overflow-hidden rounded border border-border bg-shade/30" role="progressbar" aria-valuenow={hp} aria-valuemin={0} aria-valuemax={d.maxHp} aria-label="Hit points">
            <motion.div className="h-full" animate={{ width: `${pct}%`, backgroundColor: bar }} transition={{ type: "spring", stiffness: 120, damping: 16 }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {[[-5, "−5"], [-1, "−1"], [1, "+1"], [5, "+5"]].map(([n, l]) => (
              <motion.button key={l as string} type="button" whileTap={{ scale: 0.88 }} whileHover={{ y: -2 }} onClick={() => hit(-(n as number))} aria-label={`${(n as number) < 0 ? "Take" : "Heal"} ${Math.abs(n as number)} hit points`} className={`min-h-9 rounded border px-3 text-sm ${(n as number) < 0 ? "border-crimson/60 text-danger" : "border-emerald/60 text-emerald"}`}>
                {(n as number) < 0 ? `Damage ${l}` : `Heal ${l}`}
              </motion.button>
            ))}
            <button type="button" onClick={() => setDamage(0)} className="min-h-9 rounded border border-border px-3 text-sm text-muted hover:text-goldBright">Long rest</button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {ABILITIES.map((a, i) => (
            <motion.div key={a} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} whileHover={{ y: -4, rotate: -2 }} className="panel-flat py-2 text-center">
              <p className="rune-label">{a}</p>
              <p className="font-display text-2xl text-goldBright">{fmt(abilityModifier(SCORES[a]))}</p>
              <p className="text-sm text-muted">{SCORES[a]}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Saving throws</Label>
            <ul className="space-y-1 text-sm">
              {d.saves.map(({ a, v }) => (
                <li key={a} className="flex items-center gap-2">
                  <span aria-hidden className={`h-2.5 w-2.5 rounded-full border ${SAVE_PROF.includes(a) ? "border-goldBright bg-goldBright" : "border-border"}`} />
                  <motion.span key={`${a}${v}`} initial={{ scale: 1.4, color: "var(--gold-bright)" }} animate={{ scale: 1, color: "var(--foreground)" }} className="w-8 font-semibold">{fmt(v)}</motion.span>
                  <span className="uppercase text-muted">{a}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Label>Proficient skills</Label>
            <ul className="space-y-1 text-sm">
              {d.skills.map(({ s, v }) => (
                <li key={s} className="flex items-center gap-2">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full border border-goldBright bg-goldBright" />
                  <motion.span key={`${s}${v}`} initial={{ scale: 1.4, color: "var(--gold-bright)" }} animate={{ scale: 1, color: "var(--foreground)" }} className="w-8 font-semibold">{fmt(v)}</motion.span>
                  <span className="capitalize text-muted">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="panel flex flex-col gap-4 p-6">
        <p className="eyebrow">Level-up wizard</p>
        <label className="block">
          <span className="rune-label">Level {level}</span>
          <input type="range" min={1} max={20} value={level} onChange={(e) => setLevel(Number(e.target.value))} className="mt-2 w-full accent-[var(--gold)]" aria-label="Character level" />
        </label>
        <ol className="flex flex-col gap-3" aria-label={`Level ${level + 1} gains`}>
          {level < 20 ? (
            gains.map((g, i) => (
              <motion.li key={`${level}-${i}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12, type: "spring", stiffness: 160, damping: 16 }} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold bg-surface2 font-display text-sm text-goldBright">{i + 1}</span>
                <span className="text-foreground/90">{g}</span>
              </motion.li>
            ))
          ) : (
            <li className="text-foreground/90">Level 20: the summit of the climb.</li>
          )}
        </ol>
        <div className="relative mt-auto">
          <AnimatePresence>
            {pulse > 0 && <motion.span key={pulse} aria-hidden initial={{ opacity: 0.8, scale: 0.6 }} animate={{ opacity: 0, scale: 2.4 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="pointer-events-none absolute inset-0 rounded border-2 border-goldBright" />}
          </AnimatePresence>
          <motion.button type="button" onClick={levelUp} disabled={level >= 20} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} className="relative min-h-12 w-full rounded border border-goldBright/70 bg-gradient-to-b from-[var(--btn-1)] via-[var(--btn-2)] to-[var(--btn-3)] font-display text-sm uppercase tracking-[0.16em] text-onGold shadow-[0_3px_0_var(--btn-edge)] disabled:opacity-50">
            {level < 20 ? `Level up to ${level + 1}` : "Max level"}
          </motion.button>
        </div>
        <Link href="/characters/new" className="text-center font-display text-xs uppercase tracking-[0.18em] text-gold hover:text-goldBright">Forge your own hero →</Link>
      </div>
    </div>
  );
}
