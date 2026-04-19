// Tipo Recipe: ricetta generata dall'AI o salvata dall'utente.
// Schema documento: users/{uid}/recipes/{recipeId}

import type { Timestamp } from "firebase/firestore";

export type RecipeDifficulty = "facile" | "media" | "impegnativa";
export type RecipeRating = 1 | 2 | 3 | 4 | 5;

export interface RecipeIngredient {
  name: string;
  quantity: number;
  // Più libero di Unit perché l'AI può proporre "cucchiai", "q.b.", ecc.
  unit: string;
  pantryMatchId: string | null; // link al PantryItem se matchato
  toBuy: boolean;
}

export interface RecipeGenerationContext {
  focusedOnExpiring: string[]; // normalizedName degli item prioritari
  pantrySnapshot: string[]; // cosa c'era in dispensa al momento della generazione
}

export interface Recipe {
  id: string;
  title: string;
  servings: number; // default 4
  totalTimeMinutes: number;
  difficulty: RecipeDifficulty;

  ingredients: RecipeIngredient[];
  steps: string[];

  // Metadata generazione
  generatedAt: Timestamp;
  generationContext: RecipeGenerationContext;

  // Uso da parte dell'utente
  cooked: boolean;
  cookedAt: Timestamp | null;
  userRating: RecipeRating | null;
  saved: boolean; // pinnata nel ricettario personale
  notes: string | null;
}

export type NewRecipe = Omit<Recipe, "id" | "generatedAt">;
