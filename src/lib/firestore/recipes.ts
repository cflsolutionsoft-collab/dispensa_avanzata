// Operazioni Firestore per users/{uid}/recipes.
// Include la logica di "ho cucinato" che decrementa gli ingredienti dalla
// pantry con conferma dell'utente sugli item da scalare.

import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type {
  NewRecipe,
  Recipe,
  RecipeIngredient,
  RecipeRating,
} from "@/types";

function recipesCollection(uid: string) {
  return collection(db, `users/${uid}/recipes`);
}

/**
 * Salva una ricetta (di solito al momento del "Ho cucinato").
 */
export async function createRecipe(
  uid: string,
  recipe: Omit<NewRecipe, "cookedAt" | "userRating">,
): Promise<string> {
  const docRef = await addDoc(recipesCollection(uid), {
    ...recipe,
    generatedAt: Timestamp.now(),
    cookedAt: null,
    userRating: null,
  });
  return docRef.id;
}

/**
 * Marca una ricetta come cucinata, aggiorna cookedAt e decrementa le
 * quantità dei PantryItem indicati in un'unica batch.
 *
 * decrements: mappa pantryItemId → quantità da sottrarre (>0).
 */
export async function markRecipeCooked(
  uid: string,
  recipeId: string,
  decrements: Map<string, number>,
  currentQuantities: Map<string, number>,
): Promise<void> {
  const batch = writeBatch(db);
  const now = Timestamp.now();

  batch.update(doc(recipesCollection(uid), recipeId), {
    cooked: true,
    cookedAt: now,
  });

  for (const [pantryItemId, delta] of decrements) {
    const currentQty = currentQuantities.get(pantryItemId) ?? 0;
    const next = Math.max(0, currentQty - delta);
    const updates: Record<string, unknown> = { quantity: next };
    if (next === 0) updates.lastConsumedAt = now;
    batch.update(doc(db, `users/${uid}/pantry/${pantryItemId}`), updates);
  }

  await batch.commit();
}

export async function setRecipeSaved(
  uid: string,
  recipeId: string,
  saved: boolean,
): Promise<void> {
  await updateDoc(doc(recipesCollection(uid), recipeId), { saved });
}

export async function rateRecipe(
  uid: string,
  recipeId: string,
  rating: RecipeRating,
): Promise<void> {
  await updateDoc(doc(recipesCollection(uid), recipeId), { userRating: rating });
}

export async function deleteRecipe(
  uid: string,
  recipeId: string,
): Promise<void> {
  await deleteDoc(doc(recipesCollection(uid), recipeId));
}

// Utility: converte ingredienti da RecipeProposal (Sonnet) al tipo del dominio
export function proposalIngredientsToDomain(
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    fromPantry: boolean;
    toBuy: boolean;
  }>,
): RecipeIngredient[] {
  return ingredients.map((i) => ({
    name: i.name,
    quantity: i.quantity,
    unit: i.unit,
    pantryMatchId: null, // valorizzato quando l'utente conferma il match
    toBuy: i.toBuy,
  }));
}

export type { Recipe };
