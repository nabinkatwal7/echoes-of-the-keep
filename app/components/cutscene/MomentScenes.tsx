"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { hashString, seeded } from "@/engine/pixel/canvas";
import type { SceneTheme } from "@/engine/pixel/scenes";
import { Fighter } from "./BattleCutscene";
import { CutsceneFrame, sceneFor } from "./CutsceneFrame";

/** Text that types itself out, one character at a time. */
function useTypewriter(text: string, perSecond = 45) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const t = setInterval(() => setN((c) => (c >= text.length ? c : c + 1)), 1000 / perSecond);
    return () => clearInterval(t);
  }, [text, perSecond]);
  return text.slice(0, n);
}

/** Cutscenes are skipped for reduced motion and when the viewer has turned them off (the switch on the Combat page). */
export function cutscenesOff() {
  if (typeof window === "undefined") return true;
  try {
    if (localStorage.getItem("echoes-cutscenes") === "off") return true;
  } catch {
    /* storage unavailable: leave them on */
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Sparkles({ colors, n = 26 }: { colors: string[]; n?: number }) {
  const bits = useMemo(() => {
    const r = seeded(hashString(colors.join("")));
    return Array.from({ length: n }, () => ({ x: 20 + r() * 60, d: r() * 1.6, s: 4 + Math.floor(r() * 3) * 3, t: 1.4 + r() * 1.4, c: colors[Math.floor(r() * colors.length)] }));
  }, [colors, n]);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b, i) => (
        <motion.span key={i} className="absolute bottom-0 block" style={{ left: `${b.x}%`, width: b.s, height: b.s, background: b.c, boxShadow: `0 0 8px ${b.c}` }} initial={{ y: 0, opacity: 0 }} animate={{ y: "-70vh", opacity: [0, 1, 0] }} transition={{ duration: b.t, delay: b.d, repeat: Infinity, ease: "easeOut" }} />
      ))}
    </div>
  );
}

/** Plays once per chapter scene, with the narrator's words typed over the scene and the party waiting by the fire. */
export function SceneIntro({ storageKey, theme, title, text, party }: { storageKey: string; theme: SceneTheme; title: string; text: string; party: { name: string; classIndex: string }[] }) {
  const [open, setOpen] = useState(false);
  const typed = useTypewriter(open ? text : "", 55);
  useEffect(() => {
    if (cutscenesOff()) return;
    try {
      const seen = JSON.parse(localStorage.getItem("echoes-seen-scenes") ?? "[]") as string[];
      if (!seen.includes(storageKey)) setOpen(true);
    } catch {
      /* storage unavailable: skip the scene */
    }
  }, [storageKey]);
  const done = useCallback(() => {
    setOpen(false);
    try {
      const seen = JSON.parse(localStorage.getItem("echoes-seen-scenes") ?? "[]") as string[];
      localStorage.setItem("echoes-seen-scenes", JSON.stringify([...seen, storageKey].slice(-60)));
    } catch {
      /* ignore */
    }
  }, [storageKey]);
  return (
    <AnimatePresence>
      {open && (
        <CutsceneFrame label={title} caption={typed} theme={theme} seed={hashString(storageKey)} holdUntilClick onDone={done}>
          <Sparkles colors={["#f6c445", "#e0702f", "#fff3c4"]} n={18} />
          <div className="relative mx-auto flex h-full max-w-4xl flex-col items-center justify-between pb-4 pt-6">
            <motion.h2 initial={{ opacity: 0, y: -30, letterSpacing: "0.5em" }} animate={{ opacity: 1, y: 0, letterSpacing: "0.12em" }} transition={{ duration: 1 }} className="text-center !font-pixel text-3xl font-bold uppercase text-[#ffd48a] drop-shadow-[3px_3px_0_#000] sm:text-6xl">{title}</motion.h2>
            <div className="flex items-end gap-2">
              {party.slice(0, 5).map((p, i) => (
                <motion.div key={p.name} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 + i * 0.15, type: "spring", stiffness: 120, damping: 14 }}>
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}>
                    <Fighter actor={{ name: p.name, party: true, look: { k: "hero", type: p.classIndex } }} className="w-14 sm:w-24" />
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </CutsceneFrame>
      )}
    </AnimatePresence>
  );
}

/** Shown after a hero is forged: the hero steps into a spotlight and is announced. */
export function HeroReveal({ name, classIndex, line }: { name: string; classIndex: string; line: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (cutscenesOff()) return;
    setOpen(true);
    const url = new URL(window.location.href);
    if (url.searchParams.has("new")) {
      url.searchParams.delete("new");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);
  const typed = useTypewriter(open ? `${name}, ${line}` : "", 40);
  return (
    <AnimatePresence>
      {open && (
        <CutsceneFrame label={`A new hero: ${name}`} caption={typed} theme={sceneFor(name)} seed={hashString(name)} holdUntilClick onDone={() => setOpen(false)}>
          <Sparkles colors={["#fff3c4", "#f6c445", "#9db0ff"]} />
          <div className="relative flex h-full flex-col items-center justify-center">
            <motion.div aria-hidden className="absolute h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,243,196,0.55),transparent_70%)]" initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 1 }} />
            <motion.div initial={{ y: 120, opacity: 0, scale: 0.6 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 90, damping: 12 }}>
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
                <Fighter actor={{ name, party: true, look: { k: "hero", type: classIndex } }} className="w-40 sm:w-64" />
              </motion.div>
            </motion.div>
            <motion.p initial={{ opacity: 0, scale: 2 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9 }} className="mt-2 !font-pixel text-3xl font-bold uppercase tracking-widest text-[#ffd48a] drop-shadow-[3px_3px_0_#000] sm:text-5xl">A hero is forged</motion.p>
          </div>
        </CutsceneFrame>
      )}
    </AnimatePresence>
  );
}

/** Shown when a hero gains a level. */
export function LevelUpScene({ name, classIndex, level, gained, onDone }: { name: string; classIndex: string; level: number; gained: string[]; onDone: () => void }) {
  return (
    <CutsceneFrame label={`${name} reaches level ${level}`} caption={gained[0] ?? `${name} grows stronger.`} theme={sceneFor(name)} seed={hashString(name) + level} durationMs={3600} onDone={onDone}>
      <Sparkles colors={["#f6c445", "#fff3c4", "#52ad82"]} n={34} />
      <div className="relative flex h-full flex-col items-center justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} aria-hidden className="absolute bottom-[18%] h-24 w-24 rounded-full border-4 border-[#f6c445]" initial={{ scale: 0.2, opacity: 0.9 }} animate={{ scale: 6, opacity: 0 }} transition={{ delay: 0.2 + i * 0.35, duration: 1.4, repeat: 1 }} />
        ))}
        <motion.div initial={{ y: 40, scale: 0.8 }} animate={{ y: [40, -50, 0], scale: [0.8, 1.15, 1] }} transition={{ duration: 0.9, delay: 0.2 }}>
          <Fighter actor={{ name, party: true, look: { k: "hero", type: classIndex } }} className="w-32 sm:w-52" />
        </motion.div>
        <motion.p initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 10 }} className="!font-pixel text-4xl font-bold uppercase text-[#ffd48a] drop-shadow-[3px_3px_0_#000] sm:text-7xl">Level up!</motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="!font-pixel text-2xl text-[#fff3c4]">Level {level}</motion.p>
      </div>
    </CutsceneFrame>
  );
}
