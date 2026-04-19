// POST /api/reconcile
// Riceve foto del frigo/dispensa e la dispensa attuale (via form field "pantry"
// serializzato in JSON). Chiama Opus 4.7 con il prompt di verifica guidata
// e ritorna il JSON validato.

import { NextResponse } from "next/server";
import sharp from "sharp";

import {
  anthropic,
  assertAnthropicConfigured,
  calculateCostUSD,
  MODELS,
} from "@/lib/anthropic";
import { requireAuth, AuthError } from "@/lib/api/auth";
import { AppError, getErrorMessage } from "@/lib/errors";
import {
  buildReconciliationPrompt,
  type ReconciliationPantrySnapshot,
} from "@/lib/prompts/reconciliation";
import { reconciliationRawSchema } from "@/lib/validators/reconciliation";
import type { TokenUsage } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PHOTOS = 6;
const MAX_OUTPUT_TOKENS = 4096;
const RESIZE_MAX_DIM = 1500;
const JPEG_QUALITY = 85;

export async function POST(req: Request): Promise<NextResponse> {
  try {
    await requireAuth(req);
    assertAnthropicConfigured();

    const formData = await req.formData();
    const photos = formData.getAll("photos").filter(isFile);
    const pantryJson = formData.get("pantry");

    if (photos.length === 0)
      return jsonError("Nessuna foto allegata.", 400);
    if (photos.length > MAX_PHOTOS)
      return jsonError(`Massimo ${MAX_PHOTOS} foto.`, 400);
    if (typeof pantryJson !== "string")
      return jsonError("Dispensa mancante.", 400);

    let pantry: ReconciliationPantrySnapshot[];
    try {
      pantry = JSON.parse(pantryJson);
    } catch {
      return jsonError("Dispensa non parsabile.", 400);
    }

    if (!Array.isArray(pantry) || pantry.length === 0) {
      return jsonError(
        "Dispensa vuota: niente da riconciliare.",
        400,
      );
    }

    const base64Images = await Promise.all(
      photos.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const resized = await sharp(buffer)
          .rotate()
          .resize({
            width: RESIZE_MAX_DIM,
            height: RESIZE_MAX_DIM,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: JPEG_QUALITY })
          .toBuffer();
        return resized.toString("base64");
      }),
    );

    const prompt = buildReconciliationPrompt(pantry);

    const response = await anthropic.messages.create({
      model: MODELS.vision,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [
        {
          role: "user",
          content: [
            ...base64Images.map((data) => ({
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: "image/jpeg" as const,
                data,
              },
            })),
            { type: "text" as const, text: prompt },
          ],
        },
      ],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text")
      return jsonError("Risposta AI senza testo.", 502);

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFences(textBlock.text));
    } catch {
      return jsonError("JSON dell'AI non valido.", 502);
    }

    const validated = reconciliationRawSchema.safeParse(parsed);
    if (!validated.success) {
      return jsonError("Schema AI non aderente.", 502);
    }

    const tokenUsage: TokenUsage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      costUSD: calculateCostUSD(
        MODELS.vision,
        response.usage.input_tokens,
        response.usage.output_tokens,
      ),
    };

    return NextResponse.json({ result: validated.data, tokenUsage });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.userMessage, 401);
    if (error instanceof AppError) return jsonError(error.userMessage, 500);
    console.error("[/api/reconcile] errore non gestito:", error);
    return jsonError(getErrorMessage(error), 500);
  }
}

function isFile(value: FormDataEntryValue): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value;
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1] : trimmed;
}
