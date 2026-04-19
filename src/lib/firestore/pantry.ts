// Operazioni Firestore per la collezione users/{uid}/pantry.
// Funzioni eseguite client-side: le rules garantiscono che l'utente possa
// scrivere solo nei propri documenti.

import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { normalizeName } from "@/lib/normalize";
import { findStapleMatch } from "@/lib/firestore/staples";
import type { DetectedItem, PantryItem } from "@/types";

const MS_PER_DAY = 86_400_000;

function pantryCollection(uid: string) {
  return collection(db, `users/${uid}/pantry`);
}

// Ritorna l'id del match per (category, normalizedName), se esiste
async function findMatchingItem(
  uid: string,
  category: string,
  normalized: string,
): Promise<string | null> {
  const q = query(
    pantryCollection(uid),
    where("category", "==", category),
    where("normalizedName", "==", normalized),
  );
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].id;
}

/**
 * Inserisce o aggiorna un PantryItem a partire da un DetectedItem riconosciuto.
 * - Match esistente → incrementa quantity, aggiorna lastSeenAt
 * - Nuovo → crea doc e collega a Staple se ne trova uno matchante
 */
export async function mergeDetectedItem(
  uid: string,
  detected: DetectedItem,
  sessionId: string,
): Promise<string> {
  const normalized = normalizeName(detected.name);
  const now = Timestamp.now();
  const existingId = await findMatchingItem(uid, detected.category, normalized);

  if (existingId) {
    await updateDoc(doc(pantryCollection(uid), existingId), {
      quantity: increment(detected.quantity),
      lastSeenAt: now,
      lastPhotoSessionId: sessionId,
    });
    return existingId;
  }

  // Auto-link a Staple esistente, se c'è
  const stapleId = await findStapleMatch(uid, detected.category, normalized);

  const expiresAt =
    detected.estimatedExpiryDays != null
      ? Timestamp.fromMillis(
          now.toMillis() + detected.estimatedExpiryDays * MS_PER_DAY,
        )
      : null;

  const newItem: Omit<PantryItem, "id"> = {
    name: detected.name,
    normalizedName: normalized,
    brand: detected.brand,
    category: detected.category,
    quantity: detected.quantity,
    unit: detected.unit,
    size: detected.size,
    stapleId,
    trackingWorthy: detected.trackingWorthy,
    estimatedExpiryDays: detected.estimatedExpiryDays,
    expiresAt,
    addedAt: now,
    firstAddedAt: now,
    lastSeenAt: now,
    lastConsumedAt: null,
    lastPhotoSessionId: sessionId,
  };

  const docRef = await addDoc(pantryCollection(uid), newItem);
  return docRef.id;
}

/**
 * Modifica la quantity di un PantryItem di delta (può essere negativo).
 * Non scende sotto 0. Se la quantità finale è 0, imposta lastConsumedAt = now.
 * Il documento non viene eliminato: la storia resta utile per la predizione.
 */
export async function adjustQuantity(
  uid: string,
  itemId: string,
  delta: number,
  currentQuantity: number,
): Promise<void> {
  const ref = doc(pantryCollection(uid), itemId);
  const nextQty = Math.max(0, currentQuantity + delta);
  const now = Timestamp.now();

  const updates: Record<string, unknown> = { quantity: nextQty };
  if (nextQty === 0) {
    updates.lastConsumedAt = now;
  }

  await updateDoc(ref, updates);
}

/**
 * Marca un PantryItem come completamente consumato: quantity=0 e
 * lastConsumedAt=now.
 */
export async function markConsumed(
  uid: string,
  itemId: string,
): Promise<void> {
  await updateDoc(doc(pantryCollection(uid), itemId), {
    quantity: 0,
    lastConsumedAt: Timestamp.now(),
  });
}

/**
 * Applica una serie di modifiche di quantità alla pantry in batch unico
 * (usato dalla riconciliazione). Se la nuova quantità è 0 imposta lastConsumedAt.
 * Aggiorna anche lastSeenAt per tutti gli item toccati.
 */
export async function applyQuantityUpdates(
  uid: string,
  updates: Array<{ itemId: string; newQuantity: number }>,
): Promise<void> {
  if (updates.length === 0) return;
  const batch = writeBatch(db);
  const now = Timestamp.now();

  for (const u of updates) {
    const ref = doc(pantryCollection(uid), u.itemId);
    const nextQty = Math.max(0, u.newQuantity);
    const data: Record<string, unknown> = {
      quantity: nextQty,
      lastSeenAt: now,
    };
    if (nextQty === 0) data.lastConsumedAt = now;
    batch.update(ref, data);
  }

  await batch.commit();
}

/**
 * Aggiorna lastSeenAt per tutti gli item passati (usato dopo la
 * riconciliazione per gli item confermati come "visibili" senza modifica qty).
 */
export async function touchLastSeen(
  uid: string,
  itemIds: string[],
): Promise<void> {
  if (itemIds.length === 0) return;
  const batch = writeBatch(db);
  const now = Timestamp.now();
  for (const id of itemIds) {
    batch.update(doc(pantryCollection(uid), id), { lastSeenAt: now });
  }
  await batch.commit();
}
