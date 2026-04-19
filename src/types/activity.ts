// Tipo ActivityEvent: log delle azioni rilevanti (per partner sync e analytics).
// Schema documento: users/{uid}/activity/{eventId}

import type { Timestamp } from "firebase/firestore";

export type ActivityType =
  | "item_added"
  | "item_consumed"
  | "item_expired"
  | "recipe_cooked"
  | "reconciliation"
  | "shopping_done";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  timestamp: Timestamp;
  actor: string; // uid di chi ha fatto l'azione
  payload: Record<string, unknown>;
}

export type NewActivityEvent = Omit<ActivityEvent, "id" | "timestamp">;
