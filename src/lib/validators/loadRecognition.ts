// Schema Zod per validare l'output del prompt di carico (Opus 4.7).
// Lo schema valida la forma snake_case che Claude produce; toDetectedItem()
// converte in camelCase per allinearsi ai tipi del dominio.

import { z } from "zod";

import {
  CATEGORIES,
  CONFIDENCES,
  UNITS,
  type Category,
  type Confidence,
  type Unit,
} from "@/lib/enums";
import type {
  DetectedItem,
  LoadRecognitionResult,
} from "@/types/photoSession";

// Z enum richiede una tupla "as const"; CATEGORIES ecc. lo sono già
const detectedItemRawSchema = z.object({
  name: z.string().min(1),
  brand: z.string().nullable(),
  category: z.enum(CATEGORIES as unknown as [Category, ...Category[]]),
  quantity: z.number().nonnegative(),
  unit: z.enum(UNITS as unknown as [Unit, ...Unit[]]),
  size: z.string().nullable(),
  estimatedExpiryDays: z.number().int().positive().nullable(),
  trackingWorthy: z.boolean(),
  confidence: z.enum(CONFIDENCES as unknown as [Confidence, ...Confidence[]]),
  photo_index: z.number().int().nonnegative(),
});

export const loadRecognitionRawSchema = z.object({
  session_items: z.array(detectedItemRawSchema),
  unclear: z.array(z.string()),
  photo_notes: z.record(z.string(), z.string()),
});

export type LoadRecognitionRaw = z.infer<typeof loadRecognitionRawSchema>;

// Conversione snake_case → camelCase per il resto dell'app
export function toDetectedItem(
  raw: LoadRecognitionRaw["session_items"][number],
): DetectedItem {
  return {
    name: raw.name,
    brand: raw.brand,
    category: raw.category,
    quantity: raw.quantity,
    unit: raw.unit,
    size: raw.size,
    estimatedExpiryDays: raw.estimatedExpiryDays,
    trackingWorthy: raw.trackingWorthy,
    confidence: raw.confidence,
    photoIndex: raw.photo_index,
  };
}

export function toLoadRecognitionResult(
  raw: LoadRecognitionRaw,
): LoadRecognitionResult {
  return {
    session_items: raw.session_items.map(toDetectedItem),
    unclear: raw.unclear,
    photo_notes: raw.photo_notes,
  };
}
