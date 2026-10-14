"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

/** A row that scrolls sideways forever (GSAP). It slows when hovered and stands still for reduced motion. Content is decorative. */
export function Marquee({ children, seconds = 50 }: { children: React.ReactNode; seconds?: number }) {
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tween = gsap.to(el, { xPercent: -50, duration: seconds, ease: "none", repeat: -1 });
      const slow = () => gsap.to(tween, { timeScale: 0.15, duration: 0.5 });
      const fast = () => gsap.to(tween, { timeScale: 1, duration: 0.5 });
      el.addEventListener("pointerenter", slow);
      el.addEventListener("pointerleave", fast);
      return () => {
        el.removeEventListener("pointerenter", slow);
        el.removeEventListener("pointerleave", fast);
      };
    });
    return () => mm.revert();
  }, [seconds]);
  return (
    <div aria-hidden className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <div ref={track} className="flex w-max items-end gap-8">
        {children}
        {children}
      </div>
    </div>
  );
}
