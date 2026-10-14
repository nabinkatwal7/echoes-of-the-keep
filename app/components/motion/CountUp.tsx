"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

/** A number that counts up from zero when it scrolls into view. */
export function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, to, {
      duration: 1.8,
      ease: "easeOut",
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.round(v).toLocaleString();
      },
    });
    return () => controls.stop();
  }, [inView, reduce, to]);
  return <span ref={ref}>{to.toLocaleString()}</span>;
}
