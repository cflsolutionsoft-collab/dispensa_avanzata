// Operazioni Firestore per users/{uid}/staples.
// Include la logica di auto-link con pantry (bidirezionale).

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
import { normalizeName } from "@/lib/normalize";
import type { NewStaple, Staple } from "@/types";

function staplesCollection(uid: string) {
  return collection(db, `users/${uid}/staples`);
}

function pantryCollection(uid: string) {
  return collection(db, `users/${uid}/pantry`);
}

/**
 * Crea uno Staple e collega automaticamente tutti i PantryItem con stesso
 * (category, normalizedName) impostando il loro stapleId.
 */
export async function createStaple(
  uid: string,
  input: Omit<NewStaple, "normalizedName"> & { name: string },
): Promise<string> {
  const now = Timestamp.now();
  const normalized = normalizeName(input.name);

  const docRef = await addDoc(staplesCollection(uid), {
    ...input,
    normalizedName: normalized,
    createdAt: now,
    updatedAt: now,
  });

  await linkStapleToPantry(uid, docRef.id, input.category, normalized);
  return docRef.id;
}

/**
 * Aggiorna uno Staple. Se cambia name o category, ri-sincronizza il link
 * con i PantryItem (rimuove link vecchi, crea nuovi).
 */
export async function updateStaple(
  uid: string,
  stapleId: string,
  patch: Partial<Omit<Staple, "id" | "createdAt" | "updatedAt" | "normalizedName">>,
): Promise<void> {
  const updates: Record<string, unknown> = {
    ...patch,
    updatedAt: Timestamp.now(),
  };

  if (patch.name !== undefined) {
    updates.normalizedName = normalizeName(patch.name);
  }

  await updateDoc(doc(staplesCollection(uid), stapleId), updates);

  // Se cambia l'identità (name o category), ri-collega
  if (patch.name !== undefined || patch.category !== undefined) {
    await unlinkStapleFromPantry(uid, stapleId);
    const newNormalized =
      patch.name !== undefined ? normalizeName(patch.name) : undefined;
    if (newNormalized !== undefined && patch.category !== undefined) {
      await linkStapleToPantry(uid, stapleId, patch.category, newNormalized);
    }
  }
}

/**
 * Elimina uno Staple e rimuove i link dai PantryItem che lo referenziavano.
 */
export async function deleteStaple(
  uid: string,
  stapleId: string,
): Promise<void> {
  await unlinkStapleFromPantry(uid, stapleId);
  await deleteDoc(doc(staplesCollection(uid), stapleId));
}

/**
 * Cerca Staple con stesso (category, normalizedName). Usata al momento del
 * carico per collegare un nuovo PantryItem al suo Staple, se esiste.
 */
export async function findStapleMatch(
  uid: string,
  category: string,
  normalizedName: string,
): Promise<string | null> {
  const q = query(
    staplesCollection(uid),
    where("category", "==", category),
    where("normalizedName", "==", normalizedName),
  );
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].id;
}

// Imposta stapleId sui PantryItem che matchano (category, normalizedName)
async function linkStapleToPantry(
  uid: string,
  stapleId: string,
  category: string,
  normalizedName: string,
): Promise<void> {
  const q = query(
    pantryCollection(uid),
    where("category", "==", category),
    where("normalizedName", "==", normalizedName),
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { stapleId }));
  await batch.commit();
}

// Rimuove stapleId dai PantryItem che puntavano a questo Staple
async function unlinkStapleFromPantry(
  uid: string,
  stapleId: string,
): Promise<void> {
  const q = query(pantryCollection(uid), where("stapleId", "==", stapleId));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { stapleId: null }));
  await batch.commit();
}
