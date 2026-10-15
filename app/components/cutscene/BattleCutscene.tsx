"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { hashString, seeded } from "@/engine/pixel/canvas";
import { heroSprite } from "@/engine/pixel/heroes";
import { monsterSprite } from "@/engine/pixel/monsters";
import type { Actor, CutsceneEvent, Fx } from "@/lib/combat/cutscene";
import { PixelSprite } from "../pixel/PixelSprite";
import { CutsceneFrame, sceneFor } from "./CutsceneFrame";

const FX_COLORS: Record<Fx, string[]> = {
  slash: ["#ffffff", "#fff3c4", "#f6c445"],
  magic: ["#9db0ff", "#dfe4ff", "#8a5ccf"],
  fire: ["#f6c445", "#e0702f", "#a3283a"],
  dark: ["#8a5ccf", "#3a1f56", "#c7c1ff"],
  arrow: ["#d8c9a0", "#7a5a36", "#ffffff"],
  lightning: ["#fff9a8", "#7fd8ff", "#ffffff"],
  frost: ["#bfe9ff", "#6fb8ff", "#ffffff"],
  radiant: ["#fff3c4", "#ffd84a", "#ffffff"],
  poison: ["#8de04f", "#3f9a2f", "#d8ff8a"],
};

const CONDITION_STYLE: Record<string, { icon: string; color: string; label: string }> = {
  stunned: { icon: "✦", color: "#ffd84a", label: "Stunned" },
  paralyzed: { icon: "❄", color: "#6fb8ff", label: "Paralyzed" },
  poisoned: { icon: "●", color: "#8de04f", label: "Poisoned" },
  frightened: { icon: "!", color: "#c7c1ff", label: "Frightened" },
  charmed: { icon: "♥", color: "#ff7fb0", label: "Charmed" },
  blinded: { icon: "◌", color: "#9b93a8", label: "Blinded" },
  prone: { icon: "▼", color: "#d8c9a0", label: "Prone" },
  restrained: { icon: "#", color: "#d8c9a0", label: "Restrained" },
  grappled: { icon: "#", color: "#d8c9a0", label: "Grappled" },
  unconscious: { icon: "z", color: "#c7c1ff", label: "Unconscious" },
  incapacitated: { icon: "✦", color: "#ffd84a", label: "Incapacitated" },
};

/** A big sprite for a hero (by class) or a creature (by type). */
export function Fighter({ actor, className = "w-28 sm:w-44", flip = false }: { actor: Actor; className?: string; flip?: boolean }) {
  const sprite = actor.look.k === "hero" ? heroSprite(actor.look.type || "fighter", actor.name) : monsterSprite(actor.look.type || null, actor.name, actor.name);
  return <PixelSprite sprite={sprite} scale={10} flip={flip} className={`h-auto drop-shadow-[0_8px_0_rgba(0,0,0,0.5)] ${className}`} />;
}

/** Squares that fly outward from a point and fade, the pixel version of a splash. */
function Burst({ colors, delay, n = 14, spread = 110 }: { colors: string[]; delay: number; n?: number; spread?: number }) {
  const bits = useMemo(() => {
    const r = seeded(hashString(colors.join("") + delay));
    return Array.from({ length: n }, (_, i) => ({ a: (i / n) * Math.PI * 2 + r() * 0.5, d: spread * (0.5 + r() * 0.7), s: 6 + Math.floor(r() * 3) * 4, c: colors[i % colors.length] }));
  }, [colors, delay, n, spread]);
  return (
    <>
      {bits.map((b, i) => (
        <motion.span key={i} aria-hidden className="absolute left-1/2 top-1/2 block" style={{ width: b.s, height: b.s, background: b.c }} initial={{ x: 0, y: 0, opacity: 0, scale: 1 }} animate={{ x: Math.cos(b.a) * b.d, y: Math.sin(b.a) * b.d, opacity: [0, 1, 0], scale: [1, 1, 0.3] }} transition={{ delay, duration: 0.7, ease: "easeOut" }} />
      ))}
    </>
  );
}

/**
 * One blow, in about two seconds: the attacker steps in, the blow lands with an effect that matches it, the target recoils or
 * falls, and the damage floats up. Heroes and creatures draw from their own pixel sprites.
 */
export function BattleCutscene({ event, encounterName, onDone }: { event: CutsceneEvent; encounterName: string; onDone: () => void }) {
  const theme = sceneFor(encounterName);
  const seed = hashString(encounterName);

  if (event.kind === "start") {
    return (
      <CutsceneFrame label={`Battle begins: ${event.name}`} caption={`${event.name}: battle begins!`} theme={theme} seed={seed} durationMs={2800} onDone={onDone}>
        <motion.div aria-hidden className="absolute inset-0 bg-white" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} />
        <div className="relative mx-auto flex h-full max-w-5xl items-end justify-between px-6 pb-4">
          <div className="flex items-end gap-1">
            {event.party.slice(0, 4).map((a, i) => (
              <motion.div key={a.name} initial={{ x: -300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 + i * 0.12, type: "spring", stiffness: 120, damping: 14 }}>
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}><Fighter actor={a} className="w-16 sm:w-28" /></motion.div>
              </motion.div>
            ))}
          </div>
          <motion.p initial={{ scale: 4, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: -6 }} transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 12 }} className="mb-16 !font-pixel text-6xl font-bold text-[#ffd48a] drop-shadow-[4px_4px_0_#7a1b2a] sm:text-8xl">VS</motion.p>
          <div className="flex items-end gap-1">
            {event.foes.slice(0, 4).map((a, i) => (
              <motion.div key={a.name} initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 + i * 0.12, type: "spring", stiffness: 120, damping: 14 }}>
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}><Fighter actor={a} flip className="w-16 sm:w-28" /></motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </CutsceneFrame>
    );
  }

  if (event.kind === "end") {
    const win = event.result === "victory";
    return (
      <CutsceneFrame label={win ? "Victory" : "Defeat"} caption={win ? "The fight is won. Click to continue." : "The party has fallen. Click to continue."} theme={theme} seed={seed} holdUntilClick onDone={onDone}>
        <Confetti win={win} />
        <div className="relative mx-auto flex h-full max-w-4xl flex-col items-center justify-end gap-4 pb-6">
          <motion.p initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 10 }} className={`absolute top-6 !font-pixel text-6xl font-bold sm:text-8xl ${win ? "text-[#ffd48a] drop-shadow-[4px_4px_0_#7a5a1b]" : "text-[#e0687a] drop-shadow-[4px_4px_0_#3a0f19]"}`}>
            {win ? "VICTORY!" : "DEFEAT"}
          </motion.p>
          <div className="flex items-end gap-2">
            {event.party.slice(0, 5).map((a, i) => (
              <motion.div key={a.name} initial={{ y: 80, opacity: 0 }} animate={win ? { y: [0, -28, 0], opacity: 1 } : { y: 0, opacity: 1, rotate: 82, filter: "grayscale(1)" }} transition={win ? { y: { duration: 0.9, repeat: Infinity, delay: i * 0.15 }, opacity: { delay: i * 0.1 } } : { delay: 0.3 + i * 0.1, duration: 0.7 }}>
                <Fighter actor={a} className="w-16 sm:w-28" />
              </motion.div>
            ))}
          </div>
        </div>
      </CutsceneFrame>
    );
  }

  if (event.kind === "condition") {
    const st = CONDITION_STYLE[event.condition.toLowerCase()] ?? { icon: "✦", color: "#ffd84a", label: event.condition };
    const down = ["prone", "unconscious", "paralyzed", "stunned", "incapacitated"].includes(event.condition.toLowerCase());
    return (
      <CutsceneFrame label={`${event.target.name} is ${st.label.toLowerCase()}`} caption={`${event.target.name} is ${st.label.toLowerCase()}!`} theme={theme} seed={seed} durationMs={1700} onDone={onDone}>
        <div className="relative mx-auto flex h-full max-w-md items-end justify-center pb-6">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={down ? { opacity: 1, y: 0, rotate: [0, -8, 8, 0, 82], filter: ["brightness(1)", "brightness(2.5)", "brightness(1)"] } : { opacity: 1, y: 0, x: [0, -8, 8, -6, 6, 0] }} transition={{ duration: 1.1, delay: 0.2 }}>
            <Fighter actor={event.target} className="w-32 sm:w-48" />
          </motion.div>
          {[0, 1, 2, 3].map((i) => (
            <motion.span key={i} aria-hidden className="absolute !font-pixel text-4xl font-bold drop-shadow-[2px_2px_0_#000]" style={{ color: st.color, left: `${36 + i * 8}%`, top: "26%" }} animate={{ y: [0, -14, 0], rotate: [0, 20, -20, 0], opacity: [0, 1, 1] }} transition={{ duration: 1.2, delay: 0.4 + i * 0.12, repeat: 1 }}>
              {st.icon}
            </motion.span>
          ))}
          <motion.p initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: "spring", stiffness: 220, damping: 12 }} className="absolute top-[8%] !font-pixel text-4xl font-bold uppercase tracking-widest drop-shadow-[3px_3px_0_#000]" style={{ color: st.color }}>
            {st.label}
          </motion.p>
        </div>
      </CutsceneFrame>
    );
  }

  if (event.kind === "heal") {
    return (
      <CutsceneFrame label={`${event.target.name} is healed`} caption={`${event.target.name} recovers ${event.amount} hit points.`} theme={theme} seed={seed} durationMs={1500} onDone={onDone}>
        <div className="relative mx-auto flex h-full max-w-md items-end justify-center pb-6">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><Fighter actor={event.target} className="w-32 sm:w-48" /></motion.div>
          {Array.from({ length: 10 }, (_, i) => (
            <motion.span key={i} aria-hidden className="absolute bottom-10 block h-3 w-3 bg-[#52ad82] shadow-[0_0_10px_#52ad82]" style={{ left: `${30 + (i * 37) % 40}%` }} initial={{ y: 0, opacity: 0 }} animate={{ y: -200 - (i % 4) * 30, opacity: [0, 1, 0] }} transition={{ delay: 0.2 + i * 0.07, duration: 1 }} />
          ))}
          <motion.p initial={{ y: 0, opacity: 0 }} animate={{ y: -90, opacity: [0, 1, 1, 0] }} transition={{ delay: 0.3, duration: 1.1 }} className="absolute top-1/4 !font-pixel text-5xl font-bold text-[#52ad82] drop-shadow-[3px_3px_0_#000]">+{event.amount}</motion.p>
        </div>
      </CutsceneFrame>
    );
  }

  // a blow
  const e = event;
  const colors = FX_COLORS[e.fx];
  const T = e.killed ? 2.3 : 1.9;
  const reach = 320;
  const who = e.attacker?.name ?? "";
  const verb = e.spell ? `casts ${e.spell} on` : e.killed ? "strikes down" : e.fx === "arrow" ? "shoots" : e.fx === "slash" ? "strikes" : "blasts";
  const caption = e.attacker ? `${who} ${verb} ${e.target.name}${e.killed ? "!" : "."}${e.crit ? " Critical hit!" : ""}` : `${e.target.name} is hurt.`;
  const projectile = ["magic", "arrow", "fire", "dark", "frost", "poison"].includes(e.fx);
  const impact = 0.78;

  return (
    <CutsceneFrame label={caption} caption={caption} theme={theme} seed={seed} durationMs={T * 1000} onDone={onDone}>
      <motion.div className="relative mx-auto h-full max-w-4xl" animate={e.big ? { x: [0, 0, -10, 10, -8, 8, 0], y: [0, 0, 6, -6, 4, -4, 0] } : { x: 0 }} transition={{ duration: 0.5, delay: impact }}>
        {e.attacker && (
          <motion.div className="absolute bottom-[6%] left-[6%]" initial={{ x: -80, opacity: 0 }} animate={{ x: [-80, 0, 0, projectile ? 40 : reach, projectile ? 40 : reach, 0, 0], opacity: 1 }} transition={{ duration: T, times: [0, 0.14, 0.28, 0.4, 0.5, 0.7, 1], ease: "easeInOut" }}>
            <Fighter actor={e.attacker} />
          </motion.div>
        )}

        <motion.div className="absolute bottom-[6%] right-[6%]" initial={{ opacity: 0, x: 80 }} animate={e.killed ? { opacity: [0, 1, 1, 1, 0], x: [80, 0, 0, 0, 0], y: [0, 0, 0, 0, 40], scale: [1, 1, 1, 1, 0.7], filter: ["brightness(1)", "brightness(1)", "brightness(3)", "brightness(1)", "grayscale(1)"] } : { opacity: 1, x: [80, 0, 0, -16, 16, -10, 10, 0], filter: ["brightness(1)", "brightness(1)", "brightness(3) sepia(1) saturate(4)", "brightness(1)", "brightness(1)", "brightness(1)", "brightness(1)", "brightness(1)"] }} transition={{ duration: T, times: e.killed ? [0, 0.14, 0.4, 0.55, 0.9] : [0, 0.14, 0.4, 0.46, 0.52, 0.58, 0.64, 1] }}>
          <Fighter actor={e.target} flip />
        </motion.div>

        {/* the blow */}
        <div className="absolute bottom-[14%] right-[6%] h-40 w-40 sm:h-56 sm:w-56">
          {e.fx === "slash" && [0, 1, 2].map((i) => (
            <motion.span key={i} aria-hidden className="absolute left-0 top-1/2 block h-2 w-full origin-left bg-white shadow-[0_0_14px_#fff]" style={{ rotate: -38 + i * 14, y: -10 + i * 22 }} initial={{ scaleX: 0, opacity: 1 }} animate={{ scaleX: [0, 1, 1], opacity: [1, 1, 0] }} transition={{ delay: impact + i * 0.05, duration: 0.3 }} />
          ))}
          <Burst colors={colors} delay={impact} spread={e.big ? 150 : 100} n={e.big ? 22 : 14} />
        </div>
        {projectile && (
          <motion.span aria-hidden className={`absolute bottom-[30%] left-[22%] block ${e.fx === "arrow" ? "h-1.5 w-14" : "h-6 w-6"}`} style={{ background: colors[0], boxShadow: `0 0 18px 6px ${colors[2]}` }} initial={{ opacity: 0, x: 0 }} animate={{ opacity: [0, 1, 1, 0], x: [0, 0, 480, 480] }} transition={{ duration: 0.5, delay: impact - 0.42, times: [0, 0.1, 0.9, 1], ease: "easeIn" }} />
        )}

        {e.amount !== null && (
          <motion.p aria-hidden className={`absolute right-[10%] bottom-[48%] !font-pixel font-bold drop-shadow-[3px_3px_0_#000] ${e.big ? "text-7xl text-[#ffd48a]" : "text-5xl text-[#ff6b7a]"}`} initial={{ opacity: 0, y: 0, scale: 0.5 }} animate={{ opacity: [0, 1, 1, 0], y: -80, scale: e.big ? [0.5, 1.5, 1.2, 1.2] : [0.5, 1.2, 1, 1] }} transition={{ delay: impact + 0.05, duration: 1 }}>
            -{e.amount}
          </motion.p>
        )}
        {e.fx === "lightning" && (
          <motion.svg aria-hidden viewBox="0 0 40 100" className="absolute -top-[40%] right-[12%] h-[120%] w-24" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0, 1, 0] }} transition={{ delay: impact - 0.1, duration: 0.5 }}>
            <polyline points="24,0 12,34 24,38 8,72 20,76 14,100" fill="none" stroke="#fff9a8" strokeWidth="4" strokeLinejoin="miter" />
            <polyline points="24,0 12,34 24,38 8,72 20,76 14,100" fill="none" stroke="#7fd8ff" strokeWidth="9" opacity="0.5" />
          </motion.svg>
        )}
        {e.fx === "radiant" && (
          <motion.span aria-hidden className="absolute bottom-0 right-[10%] block h-full w-28 bg-gradient-to-b from-transparent via-[#fff3c4]/60 to-[#ffd84a]/80" initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: [0, 1, 1], opacity: [0, 1, 0] }} transition={{ delay: impact - 0.1, duration: 0.7 }} style={{ transformOrigin: "top" }} />
        )}
        {e.big && (
          <motion.p aria-hidden className="absolute left-1/2 top-[6%] -translate-x-1/2 !font-pixel text-2xl font-bold uppercase tracking-widest text-[#ffd48a] drop-shadow-[2px_2px_0_#000]" initial={{ opacity: 0, scale: 2 }} animate={{ opacity: [0, 1, 1, 0], scale: 1 }} transition={{ delay: impact, duration: 0.9 }}>
            {e.killed ? "Down!" : e.crit ? "Critical hit!" : "Heavy blow!"}
          </motion.p>
        )}
      </motion.div>
    </CutsceneFrame>
  );
}

/** Falling gold squares for a win, grey ash for a loss. */
function Confetti({ win }: { win: boolean }) {
  const bits = useMemo(() => {
    const r = seeded(win ? 7 : 9);
    return Array.from({ length: 46 }, () => ({ x: r() * 100, d: r() * 2, s: 5 + Math.floor(r() * 3) * 3, t: 2.5 + r() * 2, c: win ? ["#f6c445", "#e0702f", "#fff3c4", "#9db0ff", "#52ad82"][Math.floor(r() * 5)] : ["#6b6478", "#9b93a8", "#3a3548"][Math.floor(r() * 3)] }));
  }, [win]);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b, i) => (
        <motion.span key={i} className="absolute block" style={{ left: `${b.x}%`, top: -20, width: b.s, height: b.s, background: b.c }} animate={{ y: "110vh", rotate: win ? 360 : 0, x: win ? [0, 20, -20, 0] : 0 }} transition={{ duration: b.t, delay: b.d, repeat: Infinity, ease: "linear" }} />
      ))}
    </div>
  );
}
