// Tipo PantryItem: rappresenta un prodotto nella dispensa.
// Schema documento: users/{uid}/pantry/{itemId}

import type { Timestamp } from "firebase/firestore";
import type { Category, Unit } from "@/lib/enums";

export interface PantryItem {
  id: string;
  name: string;
  normalizedName: string; // lowercase + senza accenti, per matching
  brand: string | null;
  category: Category;
  quantity: number;
  unit: Unit;
  size: string | null; // es. "170g", "1L"

  // Lifecycle e tracking
  stapleId: string | null; // link al suo Staple, se è uno
  trackingWorthy: boolean; // false per sale, farina, pasta secca, ecc.

  // Scadenze "soft", stimate dall'AI alla creazione
  estimatedExpiryDays: number | null;
  expiresAt: Timestamp | null; // addedAt + estimatedExpiryDays

  // Attività
  addedAt: Timestamp;
  firstAddedAt: Timestamp;
  lastSeenAt: Timestamp; // ultima volta confermato (foto o manuale)
  lastConsumedAt: Timestamp | null;
  lastPhotoSessionId: string | null;
}

// Payload per creazione di un nuovo PantryItem (id e timestamp generati a runtime)
export type NewPantryItem = Omit<
  PantryItem,
  "id" | "addedAt" | "firstAddedAt" | "lastSeenAt" | "expiresAt"
>;
