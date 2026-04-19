// POST /api/generate-recipes
// Riceve dal client una rappresentazione snella della dispensa + preferenze,
// chiama Sonnet 4.6, valida l'output e lo restituisce.

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  anthropic,
  assertAnthropicConfigured,
  calculateCostUSD,
  MODELS,
} from "@/lib/anthropic";
import { requireAuth, AuthError } from "@/lib/api/auth";
import { AppError, getErrorMessage } from "@/lib/errors";
import {
  buildRecipePrompt,
  type PantrySnapshotItem,
} from "@/lib/prompts/recipe";
import { recipeGenerationSchema } from "@/lib/validators/recipe";
import type { TokenUsage } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const pantryItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  expiryDays: z.number().nullable(),
});

const bodySchema = z.object({
  pantry: z.array(pantryItemSchema),
  expiringSoon: z.array(pantryItemSchema),
  servings: z.number().int().positive().default(4),
  preferences: z
    .object({
      cuisines: z.array(z.string()).default([]),
      dislikes: z.array(z.string()).default([]),
      allergies: z.array(z.string()).default([]),
    })
    .default({ cuisines: [], dislikes: [], allergies: [] }),
  constraints: z
    .object({
      maxTimeMinutes: z.number().int().positive().default(60),
      purityLevel: z
        .enum(["strict", "few_additions", "flexible"])
        .default("few_additions"),
      mealType: z.enum(["pranzo", "cena", "pranzo_e_cena"]).optional(),
    })
    .default({ maxTimeMinutes: 60, purityLevel: "few_additions" }),
});

export async function POST(req: Request): Promise<NextResponse> {
  try {
    await requireAuth(req);
    assertAnthropicConfigured();

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return jsonError("Dati richiesta non validi.", 400);
    }

    const { pantry, expiringSoon, servings, preferences, constraints } =
      parsed.data;

    if (pantry.length === 0) {
      return jsonError(
        "La dispensa è vuota: aggiungi qualcosa prima di generare ricette.",
        400,
      );
    }

    const prompt = buildRecipePrompt({
      pantry: pantry as PantrySnapshotItem[],
      expiringSoon: expiringSoon as PantrySnapshotItem[],
      servings,
      preferences,
      constraints,
    });

    const response = await anthropic.messages.create({
      model: MODELS.text,
      max_tokens: 3500,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return jsonError("Risposta AI senza contenuto testuale.", 502);
    }

    let rawJson: unknown;
    try {
      rawJson = JSON.parse(stripCodeFences(textBlock.text));
    } catch {
      return jsonError("L'AI ha risposto con JSON non valido.", 502);
    }

    const validated = recipeGenerationSchema.safeParse(rawJson);
    if (!validated.success) {
      return jsonError("L'AI ha risposto con schema non aderente.", 502);
    }

    const tokenUsage: TokenUsage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      costUSD: calculateCostUSD(
        MODELS.text,
        response.usage.input_tokens,
        response.usage.output_tokens,
      ),
    };

    return NextResponse.json({ result: validated.data, tokenUsage });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.userMessage, 401);
    if (error instanceof AppError) return jsonError(error.userMessage, 500);
    console.error("[/api/generate-recipes] errore non gestito:", error);
    return jsonError(getErrorMessage(error), 500);
  }
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1] : trimmed;
}
