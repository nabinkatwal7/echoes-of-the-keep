"use client";

import { MotionConfig, motion, useScroll, useSpring } from "framer-motion";

/** Respects the visitor's reduced-motion setting for every Framer animation, and draws a thin reading-progress bar. */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  return (
    <MotionConfig reducedMotion="user">
      <motion.div aria-hidden className="no-print fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-gradient-to-r from-gold via-goldBright to-ember" style={{ scaleX }} />
      {children}
    </MotionConfig>
  );
}
