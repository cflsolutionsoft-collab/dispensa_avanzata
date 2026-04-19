// Operazioni Firestore per users/{uid}/shoppingList + generazione da staples.

import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type {
  NewShoppingListItem,
  PantryItem,
  ShoppingListItem,
  Staple,
} from "@/types";

function shoppingListCollection(uid: string) {
  return collection(db, `users/${uid}/shoppingList`);
}

/**
 * Aggiunge una voce alla lista spesa.
 */
export async function addShoppingItem(
  uid: string,
  input: NewShoppingListItem,
): Promise<string> {
  const docRef = await addDoc(shoppingListCollection(uid), {
    ...input,
    addedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function toggleChecked(
  uid: string,
  itemId: string,
  checked: boolean,
): Promise<void> {
  await updateDoc(doc(shoppingListCollection(uid), itemId), { checked });
}

export async function removeShoppingItem(
  uid: string,
  itemId: string,
): Promise<void> {
  await deleteDoc(doc(shoppingListCollection(uid), itemId));
}

/**
 * Rimuove tutte le voci già spuntate (checked: true).
 * Ritorna il numero di voci rimosse.
 */
export async function clearChecked(uid: string): Promise<number> {
  const q = query(shoppingListCollection(uid), where("checked", "==", true));
  const snap = await getDocs(q);
  if (snap.empty) return 0;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

/**
 * Calcola la quantità totale di uno Staple presente in dispensa,
 * sommando tutti i PantryItem con stapleId == staple.id.
 */
function pantryQuantityForStaple(
  staple: Staple,
  pantry: PantryItem[],
): number {
  return pantry
    .filter((p) => p.stapleId === staple.id)
    .reduce((sum, p) => sum + p.quantity, 0);
}

/**
 * Genera/aggiorna la shopping list confrontando staples e pantry.
 * Per ogni Staple sotto la soglia minima, aggiunge una voce in lista se non
 * è già presente (considerando solo voci non ancora spuntate).
 *
 * Ritorna il numero di voci create.
 */
export async function generateShoppingList(
  uid: string,
  staples: Staple[],
  pantry: PantryItem[],
): Promise<number> {
  // Leggo voci aperte per evitare duplicati
  const openQuery = query(
    shoppingListCollection(uid),
    where("checked", "==", false),
  );
  const openSnap = await getDocs(openQuery);
  const openStapleIds = new Set(
    openSnap.docs
      .map((d) => (d.data() as ShoppingListItem).stapleId)
      .filter((id): id is string => id !== null && id !== undefined),
  );

  const batch = writeBatch(db);
  let created = 0;
  const now = Timestamp.now();

  for (const staple of staples) {
    if (openStapleIds.has(staple.id)) continue;

    const currentQty = pantryQuantityForStaple(staple, pantry);
    if (currentQty >= staple.minQuantity) continue;

    const missing = staple.minQuantity - currentQty;
    const newDoc = doc(shoppingListCollection(uid));
    batch.set(newDoc, {
      stapleId: staple.id,
      name: staple.name,
      suggestedQuantity: missing,
      reason: currentQty === 0 ? "out_of_stock" : "below_threshold",
      priority: staple.priority,
      addedAt: now,
      checked: false,
      note: null,
    });
    created++;
  }

  if (created > 0) {
    await batch.commit();
  }
  return created;
}
