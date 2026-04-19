// POST /api/recognize-load
// Riceve N foto multipart, le ridimensiona, le manda a Claude Opus 4.7 con
// il prompt di carico, valida il JSON di risposta e lo restituisce al client.
// Non scrive ancora su Firestore: la scrittura avviene dopo conferma utente.

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
import { buildLoadRecognitionPrompt } from "@/lib/prompts/loadRecognition";
import {
  loadRecognitionRawSchema,
  toLoadRecognitionResult,
} from "@/lib/validators/loadRecognition";
import type { TokenUsage } from "@/types/photoSession";

// sharp e firebase-admin richiedono Node runtime (non Edge)
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PHOTOS = 8;
const MAX_OUTPUT_TOKENS = 4096;
const RESIZE_MAX_DIM = 1500;
const JPEG_QUALITY = 85;

interface SuccessResponse {
  result: ReturnType<typeof toLoadRecognitionResult>;
  tokenUsage: TokenUsage;
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    await requireAuth(req);
    assertAnthropicConfigured();

    const formData = await req.formData();
    const photos = formData.getAll("photos").filter(isFile);

    if (photos.length === 0) {
      return jsonError("Nessuna foto allegata.", 400);
    }
    if (photos.length > MAX_PHOTOS) {
      return jsonError(`Massimo ${MAX_PHOTOS} foto per richiesta.`, 400);
    }

    // Resize parallelo: 1500px lato lungo, JPEG qualità 85
    const base64Images = await Promise.all(
      photos.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const resized = await sharp(buffer)
          .rotate() // rispetta l'orientamento EXIF
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

    const prompt = buildLoadRecognitionPrompt(base64Images.length);

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
    if (!textBlock || textBlock.type !== "text") {
      return jsonError("Risposta AI senza contenuto testuale.", 502);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFences(textBlock.text));
    } catch {
      return jsonError(
        "L'AI ha risposto con un formato non valido. Riprova.",
        502,
      );
    }

    const validated = loadRecognitionRawSchema.safeParse(parsed);
    if (!validated.success) {
      return jsonError(
        "L'AI ha risposto con uno schema non aderente. Riprova.",
        502,
      );
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

    const payload: SuccessResponse = {
      result: toLoadRecognitionResult(validated.data),
      tokenUsage,
    };

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.userMessage, 401);
    }
    if (error instanceof AppError) {
      return jsonError(error.userMessage, 500);
    }
    console.error("[/api/recognize-load] errore non gestito:", error);
    return jsonError(getErrorMessage(error), 500);
  }
}

function isFile(value: FormDataEntryValue): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value;
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// Difensivo: se Claude ignora "no markdown", rimuoviamo eventuali fence
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}
