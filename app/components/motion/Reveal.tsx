"use client";

import { motion, type Variants } from "framer-motion";
import { cn } from "@/utils/cn";

/** Fades and lifts its content into place the first time it scrolls into view. */
export function Reveal({ children, delay = 0, y = 28, className }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const item: Variants = { hidden: { opacity: 0, y: 30, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } };

/** Children wrapped in <StaggerItem> arrive one after another. */
export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={cn(className)} variants={item}>
      {children}
    </motion.div>
  );
}
