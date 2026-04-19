// Schema Zod per l'output del prompt di generazione ricette (Sonnet 4.6).

import { z } from "zod";

const ingredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: z.string().min(1),
  fromPantry: z.boolean(),
  toBuy: z.boolean(),
});

const recipeProposalSchema = z.object({
  title: z.string().min(1),
  servings: z.number().int().positive(),
  totalTimeMinutes: z.number().int().positive(),
  difficulty: z.enum(["facile", "media", "impegnativa"]),
  usesExpiring: z.array(z.string()),
  ingredients: z.array(ingredientSchema),
  steps: z.array(z.string()),
  whyThisRecipe: z.string(),
});

const shoppingAdditionSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  forRecipe: z.string(),
});

export const recipeGenerationSchema = z.object({
  recipes: z.array(recipeProposalSchema),
  shoppingListAdditions: z.array(shoppingAdditionSchema),
});

export type RecipeProposal = z.infer<typeof recipeProposalSchema>;
export type RecipeGenerationResult = z.infer<typeof recipeGenerationSchema>;
