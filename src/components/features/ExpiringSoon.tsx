"use client";

// Dashboard "occhio qui" con animazioni di entrata staggered.

import Link from "next/link";
import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChefHat } from "lucide-react";

import { usePantry } from "@/hooks/usePantry";
import { Badge } from "@/components/ui";
import { CATEGORY_STYLE } from "@/lib/categoryStyle";
import { EXPIRY_BADGE_TONE, getExpiryStatus } from "@/lib/expiry";

const MAX_ITEMS = 5;

export default function ExpiringSoon({ uid }: { uid: string }) {
  const { items } = usePantry(uid);

  const expiring = useMemo(() => {
    return items
      .filter((i) => i.quantity > 0 && i.expiresAt)
      .map((i) => ({ item: i, status: getExpiryStatus(i.expiresAt) }))
      .filter(({ status }) => status.tone !== "ok" && status.tone !== "none")
      .sort((a, b) => (a.status.daysLeft ?? 0) - (b.status.daysLeft ?? 0))
      .slice(0, MAX_ITEMS);
  }, [items]);

  if (expiring.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="overflow-hidden rounded-3xl border border-ember-200 bg-gradient-to-br from-ember-50 to-ember-100/60 p-4 shadow-soft"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="animate-pulse-glow flex h-9 w-9 items-center justify-center rounded-xl bg-ember-600 text-white">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ember-700">
              Occhio qui
            </p>
            <p className="text-sm font-semibold text-ember-900">
              {expiring.length}{" "}
              {expiring.length === 1 ? "prodotto" : "prodotti"} in scadenza
            </p>
          </div>
        </div>
        <Link
          href="/ricette"
          className="inline-flex items-center gap-1 rounded-full bg-ember-600 px-3 py-1.5 text-xs font-semibold text-white shadow-soft transition-all hover:bg-ember-700 hover:shadow-soft-md active:scale-95"
        >
          <ChefHat className="h-3.5 w-3.5" />
          Cucino?
        </Link>
      </div>
      <ul className="space-y-1.5">
        <AnimatePresence>
          {expiring.map(({ item, status }, i) => {
            const style = CATEGORY_STYLE[item.category];
            const Icon = style.icon;
            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ delay: 0.05 * i, duration: 0.25 }}
                className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2 backdrop-blur-sm"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.accent}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-forest-900">
                  {item.name}
                </span>
                <Badge tone={EXPIRY_BADGE_TONE[status.tone]}>
                  {status.label}
                </Badge>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </motion.section>
  );
}
