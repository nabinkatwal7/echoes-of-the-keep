"use client";

import { motion } from "framer-motion";

/** A tile that springs up and wobbles when hovered or tapped. */
export function MonsterHover({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="panel-flat flex cursor-default flex-col items-center gap-2 px-2 py-4"
      whileHover={{ y: -10, rotate: [0, -3, 3, 0], scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 14 }}
    >
      {children}
    </motion.div>
  );
}
