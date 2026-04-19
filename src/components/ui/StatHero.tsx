"use client";

// StatHero: card hero con numero grosso + label + breakdown opzionale.
// Animazione: numero che cresce all'entrata.

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatHeroProps {
  kicker?: string;
  value: number | string;
  label: ReactNode;
  hint?: ReactNode;
  accent?: ReactNode; // chip o icona a destra
  variant?: "forest" | "ember";
}

export function StatHero({
  kicker,
  value,
  label,
  hint,
  accent,
  variant = "forest",
}: StatHeroProps) {
  const isForest = variant === "forest";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden rounded-3xl p-6 shadow-soft-md",
        isForest
          ? "bg-gradient-to-br from-forest-800 via-forest-800 to-forest-700 text-cream-50"
          : "bg-gradient-to-br from-ember-50 via-ember-100 to-ember-50 text-ember-900 border border-ember-200",
      )}
    >
      {/* Decorazione angolo: cerchio sfumato */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-40 blur-2xl",
          isForest ? "bg-forest-500" : "bg-ember-300",
        )}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1">
          {kicker && (
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                isForest ? "text-forest-200" : "text-ember-700",
              )}
            >
              {kicker}
            </p>
          )}
          <motion.p
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 22,
              delay: 0.05,
            }}
            className="text-5xl font-bold leading-none tracking-tight"
          >
            {value}
          </motion.p>
          <p className="pt-1 text-sm font-medium opacity-90">{label}</p>
          {hint && <p className="text-xs opacity-70">{hint}</p>}
        </div>
        {accent && <div className="shrink-0">{accent}</div>}
      </div>
    </motion.div>
  );
}
