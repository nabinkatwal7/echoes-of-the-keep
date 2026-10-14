"use client";

import { useEffect, useRef } from "react";

type P = { x: number; y: number; vy: number; amp: number; freq: number; phase: number; life: number; max: number; size: number };

/**
 * A faint field of rising embers behind the whole site, drawn at low resolution so the pixels stay square. It stops for
 * reduced motion and high contrast, pauses when the tab is hidden, and keeps clear of the cursor.
 */
export function AmbientEmbers() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d")!;
    const SCALE = 4;
    let w = 0;
    let h = 0;
    const size = () => {
      w = canvas.width = Math.ceil(window.innerWidth / SCALE);
      h = canvas.height = Math.ceil(window.innerHeight / SCALE);
    };
    size();
    window.addEventListener("resize", size);
    const ps: P[] = [];
    const mouse = { x: -999, y: -999 };
    const move = (e: PointerEvent) => {
      mouse.x = e.clientX / SCALE;
      mouse.y = e.clientY / SCALE;
    };
    window.addEventListener("pointermove", move);

    let raf = 0;
    let last = performance.now();
    let t = 0;
    let acc = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden || document.documentElement.dataset.contrast === "high") {
        ctx.clearRect(0, 0, w, h);
        return;
      }
      t += dt;
      acc += dt * 3;
      while (acc >= 1 && ps.length < 36) {
        acc -= 1;
        ps.push({ x: Math.random() * w, y: h + 2, vy: 5 + Math.random() * 9, amp: 3 + Math.random() * 6, freq: 0.5 + Math.random(), phase: Math.random() * 6.28, life: 0, max: 8 + Math.random() * 8, size: Math.random() < 0.15 ? 2 : 1 });
      }
      acc = Math.min(acc, 2);
      const light = document.documentElement.dataset.theme === "light";
      ctx.clearRect(0, 0, w, h);
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life += dt;
        if (p.life >= p.max || p.y < -3) {
          ps.splice(i, 1);
          continue;
        }
        p.y -= p.vy * dt;
        p.x += Math.cos(t * p.freq + p.phase) * p.amp * dt;
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < 18 && d > 0.01) {
          p.x += (dx / d) * (1 - d / 18) * 40 * dt;
          p.y += (dy / d) * (1 - d / 18) * 40 * dt;
        }
        const k = p.life / p.max;
        ctx.globalAlpha = Math.min(1, (1 - k) * 1.4) * (light ? 0.55 : 0.45);
        ctx.fillStyle = light ? (k < 0.5 ? "#b8862a" : "#a2430a") : k < 0.3 ? "#f6c445" : k < 0.7 ? "#e0702f" : "#a3283a";
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="no-print pointer-events-none fixed inset-0 z-0 h-full w-full [image-rendering:pixelated]" />;
}
