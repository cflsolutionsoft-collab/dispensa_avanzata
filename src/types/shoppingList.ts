// Tipo ShoppingListItem: voce della lista della spesa.
// Schema documento: users/{uid}/shoppingList/{itemId}

import type { Timestamp } from "firebase/firestore";
import type { Priority } from "@/lib/enums";

// Motivo per cui l'item è stato aggiunto alla lista
export type ShoppingListReason =
  | "below_threshold" // staple sotto soglia minima
  | "out_of_stock" // staple a quantità zero
  | "predicted" // predizione consumo da avgDaysPerUnit
  | "manual" // aggiunto a mano dall'utente
  | "recipe"; // serve per una ricetta selezionata

export interface ShoppingListItem {
  id: string;
  stapleId: string | null; // se viene da uno Staple
  name: string;
  suggestedQuantity: number;
  reason: ShoppingListReason;
  priority: Priority;
  addedAt: Timestamp;
  checked: boolean;
  note: string | null; // es. "scegli Barilla se c'è l'offerta"
}

export type NewShoppingListItem = Omit<ShoppingListItem, "id" | "addedAt">;
