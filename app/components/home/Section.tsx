"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, type Variants } from "framer-motion";
import { useEffect, useRef } from "react";
import { ICONS, type IconName } from "@/engine/pixel/icons";
import { PixelSprite } from "../pixel/PixelSprite";

const heading: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const line: Variants = { hidden: { opacity: 0, y: 34 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 14 } } };

/**
 * The frame every home-page section shares: a pixel icon that floats and drifts with the scroll (GSAP ScrollTrigger),
 * a heading that springs in (Framer Motion), drifting motes behind it, and a slot for the section's own content.
 */
export function Section({ id, icon, eyebrow, title, blurb, children, tint = "gold", className = "" }: { id?: string; icon: IconName; eyebrow: string; title: string; blurb: string; children: React.ReactNode; tint?: "gold" | "arcane" | "ember" | "emerald"; className?: string }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(el);
      gsap.fromTo(q("[data-icon]"), { y: 60, rotate: -10 }, { y: -60, rotate: 10, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 } });
      gsap.to(q("[data-icon-bob]"), { y: -8, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
      q("[data-mote]").forEach((m, i) => {
        gsap.set(m, { left: `${gsap.utils.random(2, 98)}%`, top: `${gsap.utils.random(5, 95)}%` });
        gsap.to(m, { y: -gsap.utils.random(40, 120), x: gsap.utils.random(-30, 30), opacity: gsap.utils.random(0.25, 0.7), duration: gsap.utils.random(4, 8), ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.3 });
      });
      gsap.fromTo(q("[data-rule]"), { scaleX: 0 }, { scaleX: 1, duration: 1, ease: "power3.out", transformOrigin: "left center", scrollTrigger: { trigger: el, start: "top 80%", once: true } });
    });
    return () => mm.revert();
  }, []);

  const glow = { gold: "bg-gold", arcane: "bg-arcane", ember: "bg-ember", emerald: "bg-emerald" }[tint];

  return (
    <section ref={root} id={id} className={`relative overflow-hidden border-t border-border/50 py-20 ${className}`}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} data-mote className={`absolute block h-1.5 w-1.5 opacity-0 ${glow}`} />
        ))}
      </div>
      <div className="relative mx-auto max-w-6xl px-4">
        <div className="mb-10 flex items-start gap-5">
          <div aria-hidden data-icon className="hidden shrink-0 sm:block">
            <div data-icon-bob className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-gold/60 bg-surface2 shadow-[0_0_30px_var(--glow-1)]">
              <PixelSprite sprite={ICONS[icon]} scale={5} />
            </div>
          </div>
          <motion.div variants={heading} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="min-w-0">
            <motion.p variants={line} className="eyebrow">{eyebrow}</motion.p>
            <motion.h2 variants={line} className="gilded text-3xl font-bold sm:text-4xl">{title}</motion.h2>
            <div data-rule className="my-3 h-0.5 w-40 origin-left bg-gradient-to-r from-gold to-transparent" />
            <motion.p variants={line} className="max-w-2xl text-lg text-foreground/80">{blurb}</motion.p>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          {children}
        </motion.div>
      </div>
    </section>
  );
}

/** A small label above a control group. */
export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="rune-label mb-1 block">
      {children}
    </label>
  );
}
