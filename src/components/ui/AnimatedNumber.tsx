"use client";

// AnimatedNumber: testo numerico che fa una piccola animazione spring quando
// il valore cambia. Usato sui contatori di quantity per dare feedback visivo.

import { motion, AnimatePresence } from "framer-motion";

interface AnimatedNumberProps {
  value: number | string;
  className?: string;
}

export function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  return (
    <span className={`relative inline-block ${className ?? ""}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={String(value)}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="inline-block tabular-nums"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
