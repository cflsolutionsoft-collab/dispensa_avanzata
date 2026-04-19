"use client";

// Recent use tray con scroll-snap, card colorate per categoria,
// AnimatedNumber sui contatori e feedback toast su scarico/aumento.

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";

import { usePantry } from "@/hooks/usePantry";
import { adjustQuantity } from "@/lib/firestore/pantry";
import {
  AnimatedNumber,
  Badge,
  IconButton,
  Skeleton,
} from "@/components/ui";
import { useToast } from "@/contexts/ToastContext";
import { CATEGORY_STYLE } from "@/lib/categoryStyle";
import { EXPIRY_BADGE_TONE, getExpiryStatus } from "@/lib/expiry";
import type { PantryItem } from "@/types";

const MAX_CARDS = 8;
const MS_PER_DAY = 86_400_000;

function scoreItem(item: PantryItem): number {
  if (!item.expiresAt) return Number.MAX_SAFE_INTEGER / 2;
  return Math.ceil((item.expiresAt.toMillis() - Date.now()) / MS_PER_DAY);
}

export default function RecentUseTray({ uid }: { uid: string }) {
  const { items, loading } = usePantry(uid);

  const displayed = useMemo(() => {
    return items
      .filter((i) => i.quantity > 0 && i.trackingWorthy)
      .sort((a, b) => scoreItem(a) - scoreItem(b))
      .slice(0, MAX_CARDS);
  }, [items]);

  if (loading) {
    return (
      <section className="space-y-2.5">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-forest-500">
          In uso oggi
        </h2>
        <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 min-w-[180px] shrink-0 rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  if (displayed.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="space-y-2.5"
    >
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-forest-500">
        In uso oggi
      </h2>
      <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3">
        {displayed.map((item, i) => (
          <RecentCard key={item.id} uid={uid} item={item} index={i} />
        ))}
      </div>
    </motion.section>
  );
}

function RecentCard({
  uid,
  item,
  index,
}: {
  uid: string;
  item: PantryItem;
  index: number;
}) {
  const expiry = getExpiryStatus(item.expiresAt);
  const style = CATEGORY_STYLE[item.category];
  const Icon = style.icon;
  const toast = useToast();

  const handleAdjust = async (delta: number) => {
    try {
      await adjustQuantity(uid, item.id, delta, item.quantity);
      if (delta < 0 && item.quantity + delta === 0) {
        toast.show(`${item.name} finito`, "info");
      }
    } catch {
      toast.show("Errore aggiornamento", "error");
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 * index }}
      whileHover={{ y: -2 }}
      className="relative flex min-w-[200px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl border border-forest-100 bg-white p-3 shadow-soft-sm"
    >
      {/* Bordo verticale colore categoria */}
      <div
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${style.rail}`}
      />

      <div className="space-y-2 pl-1.5">
        <div className="flex items-start justify-between gap-2">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.accent}`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <Badge tone={EXPIRY_BADGE_TONE[expiry.tone]}>{expiry.label}</Badge>
        </div>
        <p className="line-clamp-2 text-sm font-semibold text-forest-900">
          {item.name}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 pl-1.5">
        <span className="text-xs font-semibold text-forest-700">
          <AnimatedNumber value={item.quantity} /> {item.unit}
        </span>
        <div className="flex gap-1">
          <IconButton
            icon={<Minus className="h-4 w-4" />}
            label="Diminuisci"
            variant="secondary"
            onClick={() => handleAdjust(-1)}
            className="h-9 w-9"
          />
          <IconButton
            icon={<Plus className="h-4 w-4" />}
            label="Aumenta"
            variant="secondary"
            onClick={() => handleAdjust(1)}
            className="h-9 w-9"
          />
        </div>
      </div>
    </motion.article>
  );
}
