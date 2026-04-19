// Helper per calcolo e visualizzazione della scadenza di un PantryItem.

import type { Timestamp } from "firebase/firestore";

import type { BadgeTone } from "@/components/ui/Badge";

const MS_PER_DAY = 86_400_000;

export interface ExpiryStatus {
  daysLeft: number | null; // null quando l'item non ha expiresAt
  label: string; // testo per il badge
  tone: "expired" | "urgent" | "soon" | "ok" | "none";
}

export function getExpiryStatus(
  expiresAt: Timestamp | null | undefined,
): ExpiryStatus {
  if (!expiresAt) {
    return { daysLeft: null, label: "—", tone: "none" };
  }

  const days = Math.ceil((expiresAt.toMillis() - Date.now()) / MS_PER_DAY);

  if (days < 0) return { daysLeft: days, label: "Scaduto", tone: "expired" };
  if (days === 0) return { daysLeft: 0, label: "Oggi", tone: "urgent" };
  if (days <= 3) return { daysLeft: days, label: `${days}g`, tone: "urgent" };
  if (days <= 7) return { daysLeft: days, label: `${days}g`, tone: "soon" };
  return { daysLeft: days, label: `${days}g`, tone: "ok" };
}

// Mappa il tono "logico" della scadenza al tono visivo del Badge
export const EXPIRY_BADGE_TONE: Record<ExpiryStatus["tone"], BadgeTone> = {
  expired: "urgent",
  urgent: "danger",
  soon: "warning",
  ok: "muted",
  none: "muted",
};

// Classi Tailwind dirette (deprecated: preferire Badge con EXPIRY_BADGE_TONE)
export const EXPIRY_BADGE_CLASSES: Record<ExpiryStatus["tone"], string> = {
  expired: "bg-red-600 text-white",
  urgent: "bg-red-100 text-red-700",
  soon: "bg-ember-100 text-ember-800",
  ok: "bg-cream-100 text-forest-600",
  none: "bg-cream-100 text-forest-400",
};
