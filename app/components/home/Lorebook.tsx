"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRef, useState } from "react";
import { FolkAvatar, SceneBanner } from "../pixel/Avatars";
import { ICONS } from "@/engine/pixel/icons";
import { PixelSprite } from "../pixel/PixelSprite";

const TABS = ["NPCs", "Factions", "Sessions", "Locations"] as const;
type Tab = (typeof TABS)[number];

const NPCS = [
  ["Garrick Holt", "Gatekeeper of Dunmere", "Friendly", "Knows who came through before the bells stopped."],
  ["Sister Ione", "Keeper of the drowned chapel", "Wary", "Will trade a blessing for a lost relic."],
  ["Old Bram", "Ferryman", "Greedy", "Asks 5 gp for the crossing and 50 for silence."],
  ["Veska the Pale", "Court wizard, long gone", "Hostile", "Her last letter is in the crypt."],
];
const FACTIONS = [
  ["The Lantern Watch", 3, "Hold the road and the bridge."],
  ["Order of the Ash", -2, "Burn what the dead leave behind."],
  ["Dunmere Guild", 1, "Coin first, questions later."],
] as const;
const SESSIONS = [
  ["Session 1", "Wolves on the road", "The party met Garrick and drove off a pack at the ford."],
  ["Session 2", "The drowned chapel", "Sister Ione asked for the Saint's ring. Tamsin stole a candlestick."],
  ["Session 3", "Down the steps", "A skeleton door, a hidden lever and a very old letter."],
];
const PINS = [
  { name: "Dunmere", x: 14, y: 62 },
  { name: "The ford", x: 38, y: 40 },
  { name: "Drowned chapel", x: 62, y: 66 },
  { name: "The Keep", x: 82, y: 24 },
];

/** Campaign world tools in four tabs: people, factions, a session log and a map you can pin. */
export function Lorebook() {
  const [tab, setTab] = useState<Tab>("NPCs");
  const [standing, setStanding] = useState<number[]>(FACTIONS.map((f) => f[1]));
  const board = useRef<HTMLDivElement>(null);

  return (
    <div className="panel p-5">
      <div role="tablist" aria-label="World tools" className="relative mb-5 flex flex-wrap gap-1 border-b border-border pb-2">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`relative px-4 py-2 font-display text-sm uppercase tracking-[0.14em] ${tab === t ? "text-goldBright" : "text-muted hover:text-foreground"}`}>
            {t}
            {tab === t && <motion.span layoutId="lore-tab" className="absolute inset-x-2 -bottom-[9px] h-0.5 bg-goldBright" />}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="min-h-[19rem]">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: 0.25 }}>
            {tab === "NPCs" && (
              <ul className="grid gap-4 sm:grid-cols-2">
                {NPCS.map(([name, role, mood, note], i) => (
                  <motion.li key={name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08, type: "spring", stiffness: 180, damping: 16 }} whileHover={{ y: -5 }} className="panel-flat flex gap-4 p-4">
                    <FolkAvatar name={name} size={64} />
                    <div className="min-w-0">
                      <p className="font-semibold">{name}</p>
                      <p className="text-sm text-muted">{role}</p>
                      <span className={`mt-1 inline-block rounded-full border px-2 text-xs ${mood === "Hostile" ? "border-crimson/60 text-danger" : mood === "Wary" ? "border-ember/60 text-ember" : mood === "Greedy" ? "border-gold/60 text-gold" : "border-emerald/60 text-emerald"}`}>{mood}</span>
                      <p className="mt-1 text-sm text-foreground/85">{note}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
            {tab === "Factions" && (
              <ul className="flex flex-col gap-4">
                {FACTIONS.map(([name, , note], i) => {
                  const v = standing[i];
                  return (
                    <li key={name} className="panel-flat p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-display uppercase tracking-[0.1em]">{name}</p>
                          <p className="text-sm text-muted">{note}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" aria-label={`Lower standing with ${name}`} onClick={() => setStanding((s) => s.map((x, j) => (j === i ? Math.max(-5, x - 1) : x)))} className="h-9 w-9 rounded border border-border">−</button>
                          <motion.span key={v} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="w-8 text-center font-display text-xl">{v > 0 ? `+${v}` : v}</motion.span>
                          <button type="button" aria-label={`Raise standing with ${name}`} onClick={() => setStanding((s) => s.map((x, j) => (j === i ? Math.min(5, x + 1) : x)))} className="h-9 w-9 rounded border border-border">+</button>
                        </div>
                      </div>
                      <div className="relative mt-3 h-3 rounded bg-shade/30" role="meter" aria-valuemin={-5} aria-valuemax={5} aria-valuenow={v} aria-label={`Standing with ${name}`}>
                        <span aria-hidden className="absolute left-1/2 top-0 h-3 w-px bg-border" />
                        <motion.div className="absolute top-0 h-3 rounded" animate={{ left: v >= 0 ? "50%" : `${50 + v * 10}%`, width: `${Math.abs(v) * 10}%`, backgroundColor: v >= 0 ? "var(--emerald)" : "var(--danger)" }} transition={{ type: "spring", stiffness: 140, damping: 16 }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {tab === "Sessions" && (
              <ol className="relative flex flex-col gap-5 border-l-2 border-gold/40 pl-6">
                {SESSIONS.map(([n, title, text], i) => (
                  <motion.li key={n} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12, type: "spring", stiffness: 140, damping: 16 }} className="relative">
                    <span aria-hidden className="absolute -left-[33px] top-1 h-3.5 w-3.5 rounded-full border-2 border-goldBright bg-background" />
                    <p className="eyebrow">{n}</p>
                    <p className="font-display text-lg uppercase tracking-[0.08em]">{title}</p>
                    <p className="text-foreground/85">{text}</p>
                  </motion.li>
                ))}
              </ol>
            )}
            {tab === "Locations" && (
              <div>
                <p className="mb-2 text-sm text-muted">Drag the pins to arrange your map.</p>
                <div ref={board} className="relative h-72 overflow-hidden rounded border border-border">
                  <SceneBanner theme="wilds" seed={21} className="absolute inset-0 h-full rounded-none border-0" />
                  {PINS.map((p, i) => (
                    <motion.div key={p.name} drag dragConstraints={board} dragElastic={0.1} dragMomentum={false} whileDrag={{ scale: 1.2, zIndex: 20 }} initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 * i, type: "spring", stiffness: 200, damping: 12 }} style={{ left: `${p.x}%`, top: `${p.y}%` }} className="absolute flex cursor-grab touch-none flex-col items-center active:cursor-grabbing">
                      <PixelSprite sprite={ICONS.pin} scale={3} />
                      <span className="rounded bg-black/70 px-1.5 text-xs text-[#fff3c4]">{p.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="mt-4 text-sm text-muted">A sample campaign. The real thing keeps NPCs, factions, locations and a session journal for each of your campaigns, under <Link href="/campaigns" className="underline hover:text-goldBright">Campaigns → World</Link>.</p>
    </div>
  );
}
