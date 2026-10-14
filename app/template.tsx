"use client";

import { motion } from "framer-motion";

/** Every page change fades and lifts the new page in (a template remounts on each navigation, unlike a layout). */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
