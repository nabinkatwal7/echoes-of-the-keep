"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

type Rule = { key: string; label: string; tag: string; summary: string; points: string[]; href?: string };

const EXHAUSTION = [
  "Disadvantage on ability checks",
  "Speed halved",
  "Disadvantage on attack rolls and saving throws",
  "Hit point maximum halved",
  "Speed reduced to 0",
  "Death",
];

const RULES: Rule[] = [
  { key: "concentration", label: "Concentration", tag: "Spells", summary: "One concentration spell at a time. Damage can break it.", points: ["Taking damage: Constitution save, DC 10 or half the damage, whichever is higher.", "Casting another concentration spell ends the first.", "Being incapacitated or killed ends it."], href: "/wiki/conditions" },
  { key: "exhaustion", label: "Exhaustion", tag: "Condition", summary: "Six levels, and the effects stack.", points: EXHAUSTION.map((t, i) => `Level ${i + 1}: ${t}`), href: "/wiki/conditions" },
  { key: "cover", label: "Cover", tag: "Combat", summary: "Obstacles that shield a target.", points: ["Half cover: +2 to AC and Dexterity saves.", "Three-quarters cover: +5 to AC and Dexterity saves.", "Total cover: cannot be targeted directly."] },
  { key: "economy", label: "Action economy", tag: "Combat", summary: "What you can do on your turn.", points: ["One action: attack, cast, dash, disengage, dodge, help, hide, ready, search, use an object.", "One bonus action, only if a feature gives you one.", "One reaction per round, such as an opportunity attack.", "Move up to your speed, split as you like, plus one free object interaction."] },
  { key: "advantage", label: "Advantage", tag: "Rolls", summary: "Roll two d20s, keep the higher. Disadvantage keeps the lower.", points: ["Any number of sources of each cancel out to a normal roll.", "They never stack: two advantages is still one extra die."] },
  { key: "death", label: "Death saves", tag: "Combat", summary: "At 0 hit points you fall unconscious and start dying.", points: ["Each turn roll a d20: 10 or higher is a success, 9 or lower a failure.", "Three successes stabilise you, three failures kill you.", "A natural 20 returns you to 1 hit point; a natural 1 counts as two failures."] },
  { key: "rest", label: "Rests", tag: "Downtime", summary: "How heroes recover.", points: ["Short rest, at least 1 hour: spend Hit Dice to heal.", "Long rest, at least 8 hours: regain all hit points and half your Hit Dice.", "Only one long rest in 24 hours."] },
];

/** A horizontal strip of rules cards for quick table lookups. Click a card to open its details. */
export function RulesBar() {
  const [open, setOpen] = useState<string | null>("cover");
  const current = RULES.find((r) => r.key === open);
  return (
    <div>
      <div role="tablist" aria-label="Core rules" className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3">
        {RULES.map((r, i) => (
          <motion.button
            key={r.key}
            role="tab"
            aria-selected={open === r.key}
            aria-controls="rule-detail"
            id={`rule-${r.key}`}
            type="button"
            onClick={() => setOpen(open === r.key ? null : r.key)}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07, type: "spring", stiffness: 140, damping: 16 }}
            whileHover={{ y: -5, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className={`relative shrink-0 rounded-lg border px-4 py-3 text-left ${open === r.key ? "border-goldBright bg-gold/15 shadow-[0_0_24px_var(--glow-1)]" : "border-border bg-surface"}`}
          >
            <span className="rune-label block">{r.tag}</span>
            <span className="font-display text-base uppercase tracking-[0.1em]">{r.label}</span>
            {open === r.key && <motion.span layoutId="rule-underline" className="absolute inset-x-3 bottom-1 h-0.5 bg-goldBright" />}
          </motion.button>
        ))}
      </div>
      <div id="rule-detail" role="tabpanel" aria-live="polite" className="min-h-[11rem]">
        <AnimatePresence mode="wait">
          {current && (
            <motion.div key={current.key} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="panel p-5">
              <h3 className="font-display text-xl uppercase tracking-[0.1em] text-goldBright">{current.label}</h3>
              <p className="mb-3 text-foreground/80">{current.summary}</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {current.points.map((p, i) => (
                  <motion.li key={p} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 * i }} className="flex gap-2 text-foreground/90">
                    <span aria-hidden className="mt-2 h-2 w-2 shrink-0 bg-gold" />
                    {p}
                  </motion.li>
                ))}
              </ul>
              {current.href && <Link href={current.href} className="mt-3 inline-block font-display text-xs uppercase tracking-[0.18em] text-gold hover:text-goldBright">Full rules in the Tome →</Link>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
