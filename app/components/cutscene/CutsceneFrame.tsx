"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SCENE_THEMES, type SceneTheme } from "@/engine/pixel/scenes";
import { hashString } from "@/engine/pixel/canvas";
import { SceneBanner } from "../pixel/Avatars";

/** Which night scene a name or id always gets, so a fight or a chapter keeps its backdrop. */
export const sceneFor = (key: string): SceneTheme => SCENE_THEMES[hashString(key) % SCENE_THEMES.length];

/**
 * A full-screen pixel cutscene: a darkened scene, letterbox bars that slide in, a caption, and whatever the scene draws.
 * It ends by itself after `durationMs`, or when the viewer clicks, presses Escape or uses the Skip button. Pass
 * `holdUntilClick` for scenes (like victory) that should wait to be dismissed.
 */
export function CutsceneFrame({
  label, caption, theme, seed, durationMs = 2000, holdUntilClick = false, onDone, children,
}: {
  label: string;
  caption?: string;
  theme: SceneTheme;
  seed: number | string;
  durationMs?: number;
  holdUntilClick?: boolean;
  onDone: () => void;
  children: React.ReactNode;
}) {
  // the parent re-renders while the scene plays; keep the latest callback without restarting the timer
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = holdUntilClick ? undefined : setTimeout(() => done.current(), durationMs);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") done.current();
    };
    window.addEventListener("keydown", key);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener("keydown", key);
    };
  }, [durationMs, holdUntilClick]);

  // drawn on the body: a page-level transform would otherwise trap a fixed overlay beneath the header
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  if (!host) return null;

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="no-print fixed inset-0 z-[70] cursor-pointer overflow-hidden bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onDone}
    >
      <SceneBanner theme={theme} seed={seed} className="absolute inset-0 h-full rounded-none border-0 opacity-45" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.75))]" />
      <motion.div aria-hidden className="absolute inset-x-0 top-0 bg-black" initial={{ height: 0 }} animate={{ height: "12vh" }} transition={{ duration: 0.3 }} />
      <motion.div aria-hidden className="absolute inset-x-0 bottom-0 bg-black" initial={{ height: 0 }} animate={{ height: "16vh" }} transition={{ duration: 0.3 }} />
      <div className="absolute inset-x-0 bottom-0 flex h-[16vh] items-center justify-center px-6">
        {caption && (
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="max-w-3xl text-center !font-pixel text-lg text-[#fff3c4] sm:text-2xl">
            {caption}
          </motion.p>
        )}
      </div>
      <button type="button" onClick={(e) => { e.stopPropagation(); onDone(); }} className="absolute right-4 top-4 z-10 rounded border border-white/40 bg-black/60 px-3 py-1.5 text-sm text-white hover:border-[#ffd48a]">
        Skip <span className="text-white/60">(Esc)</span>
      </button>
      <div className="absolute inset-x-0 top-[12vh] bottom-[16vh]">{children}</div>
      <p className="sr-only" role="status">{caption ?? label}</p>
    </motion.div>,
    host,
  );
}
