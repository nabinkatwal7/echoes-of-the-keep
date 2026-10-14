"use client";

import gsap from "gsap";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HERO_CLASSES, heroSprite } from "@/engine/pixel/heroes";
import type { Sprite } from "@/engine/pixel/canvas";
import { campfireSprite, foliageSprite, ridgeSprite, skySprite } from "@/engine/pixel/vista";
import { PixelSprite, spriteRuns } from "./PixelSprite";

type Stats = { campaigns: number; heroes: number; spells: number };

/** An SVG that stretches to fill its box (`slice`) or sits inside it (`meet`), always with hard pixel edges. */
function Vista({ sprite, fit = "slice", className }: { sprite: Sprite; fit?: "slice" | "meet"; className?: string }) {
  const w = sprite.rows[0].length;
  const h = sprite.rows.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio={`xMidYMax ${fit}`} shapeRendering="crispEdges" className={className} style={{ imageRendering: "pixelated" }} aria-hidden focusable="false">
      {spriteRuns(sprite).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}

const RUNE: Sprite = {
  rows: ["...y...", "..yyy..", ".yywyy.", "yywwwyy", ".yywyy.", "..yyy..", "...y..."],
  palette: { y: "#f6c445", w: "#fff3c4" },
};

// how strongly each class leans on might, arcana and guile, for the showcase card
const PLAYSTYLE: Record<string, [number, number, number]> = {
  fighter: [9, 1, 4], barbarian: [10, 0, 3], paladin: [8, 5, 2], ranger: [6, 3, 7], rogue: [4, 1, 10], monk: [6, 3, 8],
  bard: [3, 7, 7], cleric: [5, 8, 2], druid: [3, 8, 4], sorcerer: [1, 10, 3], warlock: [2, 9, 4], wizard: [1, 10, 3],
};
const SHOWCASE = ["paladin", "wizard", "rogue", "barbarian", "bard", "druid"].filter((k) => HERO_CLASSES.includes(k));

const container: Variants = { hidden: {}, show: { transition: { delayChildren: 1.2, staggerChildren: 0.13 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 120, damping: 14 } },
};

type Particle = { x: number; y: number; vy: number; amp: number; freq: number; phase: number; life: number; max: number; size: number; ash: boolean };

/**
 * The landing hero, built from five depths: a stormy sky and eldritch moon, mountains with cathedral ruins and drifting mist,
 * a campfire that lights the scene, a canvas of rising embers that shy away from the cursor, and a framing foreground
 * with vines and a 16-bit border. GSAP runs the entrance, the idle loops and the parallax; Framer Motion runs the shockwave,
 * the spring-in text and the cards. All of it is decoration and stays still for visitors who ask for reduced motion.
 */
export function CinematicHero({ signedIn, stats }: { signedIn: boolean; stats: Stats }) {
  const root = useRef<HTMLElement>(null);
  const mist = useRef<HTMLCanvasElement>(null);
  const sparks = useRef<HTMLCanvasElement>(null);
  const fireRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<(n: number) => void>(() => {});

  useEffect(() => {
    const el = root.current;
    const mistCanvas = mist.current;
    const sparkCanvas = sparks.current;
    if (!el || !mistCanvas || !sparkCanvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const q = gsap.utils.selector(el);
    let raf = 0;
    let running = true;
    let visible = true;

    // ---- canvases: mist and embers, drawn at low resolution and scaled up so the pixels stay square ----
    const SCALE = 4;
    const mctx = mistCanvas.getContext("2d")!;
    const sctx = sparkCanvas.getContext("2d")!;
    let mw = 0;
    let mh = 0;
    let sw = 0;
    let sh = 0;
    const size = () => {
      const r = el.getBoundingClientRect();
      sw = sparkCanvas.width = Math.max(40, Math.ceil(r.width / SCALE));
      sh = sparkCanvas.height = Math.max(40, Math.ceil(r.height / SCALE));
      mw = mistCanvas.width = Math.max(40, Math.ceil(r.width / (SCALE * 2)));
      mh = mistCanvas.height = Math.max(30, Math.ceil((r.height * 0.55) / (SCALE * 2)));
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);

    const drawMist = (t: number, boost: number) => {
      const img = mctx.createImageData(mw, mh);
      const d = img.data;
      for (let y = 0; y < mh; y++) {
        const depth = (y / mh) ** 1.4; // thicker near the ground
        for (let x = 0; x < mw; x++) {
          const v = (Math.sin(x * 0.07 + t * 0.35) + Math.sin(y * 0.14 - t * 0.22 + x * 0.025) + Math.sin((x + y) * 0.05 + t * 0.15)) / 3;
          let a = (v - 0.02 + depth * 0.55) * boost;
          a = a < 0.12 ? 0 : a < 0.3 ? 0.1 : a < 0.5 ? 0.2 : 0.3; // four flat levels, like a limited palette
          const i = (y * mw + x) * 4;
          d[i] = 150;
          d[i + 1] = 135;
          d[i + 2] = 195;
          d[i + 3] = a * 255;
        }
      }
      mctx.putImageData(img, 0, 0);
    };

    const particles: Particle[] = [];
    const mouse = { x: -999, y: -999 };
    const fireSpot = () => {
      const f = fireRef.current?.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (!f) return { x: sw / 2, y: sh * 0.85 };
      return { x: (f.left + f.width / 2 - r.left) / SCALE, y: (f.top + f.height * 0.4 - r.top) / SCALE };
    };
    const spawn = (n: number, fromFire = true) => {
      const spot = fireSpot();
      for (let i = 0; i < n && particles.length < 260; i++) {
        const nearFire = fromFire && Math.random() < 0.75;
        particles.push({
          x: nearFire ? spot.x + (Math.random() - 0.5) * 10 : Math.random() * sw,
          y: nearFire ? spot.y + Math.random() * 4 : sh - Math.random() * 6,
          vy: 8 + Math.random() * 16,
          amp: 4 + Math.random() * 10,
          freq: 0.8 + Math.random() * 1.6,
          phase: Math.random() * 6.28,
          life: 0,
          max: 3 + Math.random() * 5,
          size: Math.random() < 0.18 ? 2 : 1,
          ash: Math.random() < 0.25,
        });
      }
    };
    burstRef.current = (n) => spawn(n);

    let last = performance.now();
    let clock = 0;
    let acc = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!running || !visible || document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      // embers
      acc += dt * 38;
      while (acc >= 1) {
        spawn(1);
        acc -= 1;
      }
      sctx.clearRect(0, 0, sw, sh);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.max || p.y < -4) {
          particles.splice(i, 1);
          continue;
        }
        p.y -= p.vy * dt;
        p.x += Math.cos(clock * p.freq + p.phase) * p.amp * dt;
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 26 && dist > 0.01) {
          const push = (1 - dist / 26) ** 2 * 140 * dt;
          p.x += (dx / dist) * push;
          p.y += (dy / dist) * push;
        }
        const k = p.life / p.max;
        sctx.globalAlpha = Math.min(1, (1 - k) * 1.6);
        sctx.fillStyle = p.ash ? (k > 0.5 ? "#6b6478" : "#9b93a8") : k < 0.2 ? "#fff3c4" : k < 0.5 ? "#f6c445" : k < 0.8 ? "#e0702f" : "#a3283a";
        sctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      sctx.globalAlpha = 1;
      // mist, at a gentler frame rate
      if (Math.floor(clock * 20) !== Math.floor((clock - dt) * 20)) drawMist(clock, 0.85 + Math.sin(clock * 2.3) * 0.12);
    };

    if (reduce) {
      drawMist(1, 1);
    } else {
      spawn(60, false);
      raf = requestAnimationFrame(frame);
    }
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    const onMouse = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / SCALE;
      mouse.y = (e.clientY - r.top) / SCALE;
    };
    const onLeave = () => {
      mouse.x = mouse.y = -999;
    };
    el.addEventListener("pointermove", onMouse);
    el.addEventListener("pointerleave", onLeave);

    // ---- GSAP: entrance, idle loops, parallax ----
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline();
      tl.set(q("[data-curtain]"), { opacity: 1 })
        .to(q("[data-curtain]"), { opacity: 0, duration: 1.1, ease: "power2.inOut" }, 0)
        .fromTo(q("[data-sky]"), { scale: 1.1, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.9, ease: "power2.out" }, 0)
        .from(q("[data-ridge]"), { y: 24, opacity: 0, duration: 0.9, ease: "power2.out" }, 0.1)
        .from(q("[data-moon]"), { opacity: 0, scale: 0.6, duration: 1, ease: "power2.out" }, 0.2)
        .fromTo(q("[data-fire]"), { scale: 0.1, opacity: 0, transformOrigin: "50% 100%" }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(4)" }, 0.65)
        .fromTo(q("[data-flash]"), { opacity: 1, scale: 0.2 }, { opacity: 0, scale: 2.4, duration: 0.55, ease: "power3.out" }, 0.65)
        .from(q("[data-glow]"), { opacity: 0, duration: 0.8 }, 0.7)
        .call(() => burstRef.current(70), [], 0.7)
        .from(q("[data-hud]"), { opacity: 0, scale: 1.04, duration: 0.9, ease: "power2.out" }, 0.5)
        .from(q("[data-leaf]"), { y: 60, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.1 }, 0.4);

      // moon pulse
      gsap.to(q("[data-moon]"), { scale: 1.06, opacity: 0.85, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1 });
      gsap.to(q("[data-moon-ring]"), { rotate: 360, duration: 60, ease: "none", repeat: -1 });
      gsap.to(q("[data-moon-ring]"), { opacity: 0.35, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
      // clouds drifting
      q("[data-cloud]").forEach((c, i) => gsap.fromTo(c, { xPercent: -30 }, { xPercent: 130, duration: 70 + i * 28, ease: "none", repeat: -1, delay: -i * 25 }));

      // firelight: random intensity between 0.75 and 1, plus a slight hue drift
      let alive = true;
      const flicker = () => {
        if (!alive) return;
        gsap.to(q("[data-glow]"), {
          opacity: gsap.utils.random(0.75, 1),
          scale: gsap.utils.random(0.94, 1.08),
          filter: `hue-rotate(${gsap.utils.random(-14, 14)}deg)`,
          duration: gsap.utils.random(0.07, 0.3),
          ease: "sine.inOut",
          onComplete: flicker,
        });
      };
      const frames = () => {
        if (!alive) return;
        gsap.to(q("[data-flame-b]"), { opacity: Math.random() < 0.5 ? 0 : 1, duration: 0.05, onComplete: () => void gsap.delayedCall(gsap.utils.random(0.07, 0.2), frames) });
      };
      gsap.delayedCall(1.2, flicker);
      gsap.delayedCall(1.2, frames);

      // idle float
      q("[data-float]").forEach((n, i) => gsap.fromTo(n, { y: -8 }, { y: 8, duration: 4, ease: "power1.inOut", yoyo: true, repeat: -1, delay: -i * 0.9 }));
      // wind in the vines, runes breathing
      q("[data-leaf]").forEach((n, i) => gsap.to(n, { skewX: i ? -4 : 4, duration: gsap.utils.random(2.6, 3.6), ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 100%" }));
      gsap.to(q("[data-rune]"), { opacity: 0.45, scale: 0.85, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.3 });

      // parallax: sky 0.02, mountains and fire 0.05, hero content and foreground 0.1
      const layers = (q("[data-par]") as HTMLElement[]).map((l) => ({ k: Number(l.dataset.par), x: gsap.quickTo(l, "x", { duration: 0.8, ease: "power3" }), y: gsap.quickTo(l, "y", { duration: 0.8, ease: "power3" }) }));
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        layers.forEach((l) => {
          l.x(dx * l.k);
          l.y(dy * l.k * 0.6);
        });
      };
      el.addEventListener("pointermove", move);
      return () => {
        alive = false;
        el.removeEventListener("pointermove", move);
      };
    });

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      el.removeEventListener("pointermove", onMouse);
      el.removeEventListener("pointerleave", onLeave);
      mm.revert();
    };
  }, []);

  const [a, b] = [campfireSprite(0), campfireSprite(1)];
  const sky = skySprite();

  return (
    <section ref={root} className="force-dark relative isolate min-h-[46rem] overflow-hidden bg-[#05040c] text-foreground lg:min-h-[52rem]" aria-label="Welcome">
      {/* layer 0: sky, clouds, eldritch moon */}
      <div data-par="0.02" className="absolute -inset-[3%]">
        <div data-sky className="absolute inset-0">
          <Vista sprite={sky} className="h-full w-full" />
        </div>
        {[8, 22, 36].map((top, i) => (
          <div key={top} data-cloud className="absolute left-0 h-6 rounded-full bg-[#3a2560]/40 blur-[3px]" style={{ top: `${top}%`, width: `${14 + i * 5}rem` }} />
        ))}
        <div data-moon className="absolute right-[12%] top-[8%] h-24 w-24 sm:h-32 sm:w-32">
          <div className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(157,176,255,0.38),transparent_68%)]" />
          <div data-moon-ring className="absolute -inset-3 rounded-full border-2 border-dashed border-[#9db0ff]/60" />
          <div className="absolute inset-0 rounded-full bg-[#dfe4ff] shadow-[inset_-12px_-8px_0_rgba(120,110,200,0.55)]" style={{ imageRendering: "pixelated" }} />
          <div className="absolute left-[22%] top-[28%] h-3 w-3 rounded-full bg-[#aab2e6]" />
          <div className="absolute left-[52%] top-[55%] h-4 w-4 rounded-full bg-[#aab2e6]" />
        </div>
      </div>

      {/* layer 1: mountains and ruins, with mist */}
      <div data-par="0.05" className="absolute inset-x-[-3%] bottom-0 h-[58%]">
        <div data-ridge className="absolute inset-0">
          <Vista sprite={ridgeSprite()} fit="slice" className="h-full w-full" />
        </div>
      </div>
      <canvas ref={mist} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] w-full [image-rendering:pixelated]" />

      {/* layer 2: the campfire and the light it throws */}
      <div data-glow className="pointer-events-none absolute inset-x-0 bottom-0 h-[85%] bg-[radial-gradient(ellipse_55%_65%_at_50%_92%,rgba(255,160,60,0.5),rgba(224,112,47,0.2)_40%,transparent_72%)] mix-blend-screen" />
      <div data-par="0.05" className="absolute bottom-[3%] left-1/2 z-10 -translate-x-1/2">
        <div ref={fireRef} data-fire className="relative w-28 sm:w-36 lg:w-44">
          <Vista sprite={a} fit="meet" className="block h-auto w-full" />
          <div data-flame-b className="absolute inset-0 opacity-0">
            <Vista sprite={b} fit="meet" className="block h-auto w-full" />
          </div>
        </div>
      </div>
      {/* ignition: a flash and a shockwave ring */}
      <div data-flash className="pointer-events-none absolute bottom-[8%] left-1/2 z-10 h-40 w-40 -translate-x-1/2 bg-white opacity-0 [clip-path:polygon(50%_0,62%_30%,100%_38%,70%_58%,80%_100%,50%_75%,20%_100%,30%_58%,0_38%,38%_30%)]" />
      <motion.div aria-hidden className="pointer-events-none absolute bottom-[10%] left-1/2 z-10 h-24 w-24 -translate-x-1/2 rounded-full border-4 border-[#ffd48a]" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1, 9], opacity: [0, 0.9, 0] }} transition={{ delay: 0.65, duration: 1.4, times: [0, 0.1, 1], ease: "easeOut" }} />
      <motion.div aria-hidden className="pointer-events-none absolute bottom-[10%] left-1/2 z-10 h-24 w-24 -translate-x-1/2 rounded-full border-2 border-[#e0702f]" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1, 13], opacity: [0, 0.7, 0] }} transition={{ delay: 0.8, duration: 1.7, times: [0, 0.1, 1], ease: "easeOut" }} />

      {/* layer 3: embers and ash */}
      <canvas ref={sparks} aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full [image-rendering:pixelated]" />

      {/* hero content */}
      <div data-par="0.1" className="relative z-30 mx-auto flex max-w-5xl flex-col items-center px-5 pb-60 pt-14 text-center sm:pt-20 lg:pb-64">
        <motion.div className="flex flex-col items-center gap-6" variants={container} initial="hidden" animate="show">
          <div data-float>
            <motion.p variants={rise} className="inline-flex items-center gap-2 rounded-full border border-[#f6c445]/70 bg-black/50 px-4 py-1.5 !font-pixel text-xs uppercase tracking-[0.14em] text-[#ffe9a8] shadow-[0_0_18px_rgba(246,196,69,0.35)] backdrop-blur">
              <span aria-hidden>⚡</span> Solo play: a computer Dungeon Master
            </motion.p>
          </div>
          <div data-float>
            <motion.h1 variants={rise} className="!font-pixel text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="bg-gradient-to-r from-amber-200 via-orange-400 to-red-600 bg-clip-text text-transparent [filter:drop-shadow(0_4px_0_rgba(0,0,0,0.6))]">Echoes of the Keep</span>
            </motion.h1>
          </div>
          <motion.p variants={rise} className="max-w-2xl rounded-xl border border-amber-900/40 bg-black/60 p-4 text-lg text-[#f1e6c8] backdrop-blur-md sm:text-xl">
            A 5th Edition table for heroes who follow the rules and campaigns without the bookkeeping. Gather your friends, or descend alone with a computer Dungeon Master and companions at your side.
          </motion.p>
          <motion.div variants={rise} className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <motion.div whileHover={{ scale: 1.07, y: -2 }} whileTap={{ scale: 0.96 }}>
              <Link href={signedIn ? "/characters" : "/register"} className="inline-flex min-h-12 items-center gap-2 border-2 border-[#ffd48a] bg-gradient-to-b from-[#f6c445] to-[#c9721f] px-7 py-3 font-pixel text-sm font-bold uppercase tracking-[0.14em] text-[#1a1208] shadow-[4px_4px_0_#000,0_0_28px_rgba(246,196,69,0.55)] transition-shadow hover:shadow-[6px_6px_0_#000,0_0_40px_rgba(246,196,69,0.8)]">
                Enter the Realm
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}>
              <Link href="/learn" className="inline-flex min-h-12 items-center gap-2 rounded border border-white/30 bg-white/10 px-6 py-3 font-pixel text-sm uppercase tracking-[0.12em] text-[#f1e6c8] shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-md transition hover:border-[#ffd48a] hover:bg-white/20">
                <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden shapeRendering="crispEdges">
                  <path d="M2 1h2v10H2zM4 2h2v8H4zM6 3h2v6H6zM8 4h2v4H8z" fill="currentColor" />
                </svg>
                See how it plays
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
        <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
          <KeepCard stats={stats} compact />
          <ShowcaseCard compact />
        </div>
      </div>

      {/* floating cards */}
      <div className="absolute inset-x-0 bottom-[7%] z-[34] mx-auto hidden max-w-6xl justify-between px-8 lg:flex">
        <div data-par="0.1">
          <div data-float>
            <KeepCard stats={stats} />
          </div>
        </div>
        <div data-par="0.1">
          <div data-float>
            <ShowcaseCard />
          </div>
        </div>
      </div>
      {/* layer 4: foliage and the 16-bit frame */}
      <div data-par="0.1" className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
        <div data-leaf className="absolute bottom-0 left-0 w-36 sm:w-56 lg:w-72">
          <Vista sprite={foliageSprite(4)} fit="meet" className="block h-auto w-full" />
        </div>
        <div data-leaf className="absolute bottom-0 right-0 w-36 -scale-x-100 sm:w-56 lg:w-72">
          <Vista sprite={foliageSprite(7)} fit="meet" className="block h-auto w-full" />
        </div>
      </div>
      <div data-hud aria-hidden className="pointer-events-none absolute inset-2 z-40 border-4 border-[#3a2a1a] shadow-[inset_0_0_0_2px_#c9a24b,inset_0_0_30px_rgba(246,196,69,0.15),0_0_0_2px_#000] sm:inset-3">
        {["left-1 top-1", "right-1 top-1", "left-1 bottom-1", "right-1 bottom-1"].map((pos) => (
          <span key={pos} data-rune className={`absolute ${pos} block drop-shadow-[0_0_6px_rgba(246,196,69,0.9)]`}>
            <PixelSprite sprite={RUNE} scale={3} />
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 z-[35] bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.6))]" />

      {/* the curtain the entrance lifts from */}
      <div data-curtain className="pointer-events-none absolute inset-0 z-50 bg-black opacity-0" />
    </section>
  );
}

function KeepCard({ stats, compact = false }: { stats: Stats; compact?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={`rounded-lg border border-amber-900/50 bg-black/60 p-4 text-left shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md ${compact ? "" : "w-64"}`}
    >
      <p className="flex items-center gap-2 font-pixel text-xs uppercase tracking-[0.14em] text-[#ffe9a8]">
        <span className="relative flex h-2.5 w-2.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        The Keep is open
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[[stats.campaigns, "tables"], [stats.heroes, "heroes"], [stats.spells, "spells"]].map(([n, l]) => (
          <div key={l as string}>
            <dd className="font-pixel text-xl text-[#fff3c4]">{(n as number).toLocaleString()}</dd>
            <dt className="text-xs uppercase tracking-wider text-[#d8c9a0]">{l}</dt>
          </div>
        ))}
      </dl>
    </motion.div>
  );
}

function ShowcaseCard({ compact = false }: { compact?: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % SHOWCASE.length), 3400);
    return () => clearInterval(t);
  }, []);
  const k = SHOWCASE[i];
  const [might, arcana, guile] = PLAYSTYLE[k] ?? [5, 5, 5];
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={`rounded-lg border border-amber-900/50 bg-black/60 p-4 text-left shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md ${compact ? "" : "w-72"}`}
    >
      <p className="!font-pixel text-xs uppercase tracking-[0.14em] text-[#ffe9a8]">Class showcase</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-[4.5rem] w-16 shrink-0 items-end justify-center overflow-hidden rounded border border-[#c9a24b]/60 bg-[#1b1034]">
          <AnimatePresence mode="wait">
            <motion.div key={k} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 18 }}>
              <PixelSprite sprite={heroSprite(k, `Showcase ${k}`)} scale={3.4} />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-base capitalize text-[#fff3c4]" aria-live="polite">{k}</p>
          {[["Might", might, "#e0702f"], ["Arcana", arcana, "#9db0ff"], ["Guile", guile, "#52ad82"]].map(([label, v, color]) => (
            <div key={label as string} className="mt-1 flex items-center gap-2 text-xs text-[#d8c9a0]">
              <span className="w-11">{label}</span>
              <span className="h-2 flex-1 overflow-hidden bg-white/10">
                <motion.span className="block h-full" style={{ background: color as string }} initial={false} animate={{ width: `${(v as number) * 10}%` }} transition={{ type: "spring", stiffness: 120, damping: 14 }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
