// Schema Zod per l'output del prompt di riconciliazione (Opus 4.7).

import { z } from "zod";

import { CONFIDENCES, type Confidence } from "@/lib/enums";

const verificationItemSchema = z.object({
  pantry_item_name: z.string().min(1),
  visible: z.boolean(),
  estimated_state: z.enum(["full", "partial", "empty", "not_visible"]),
  estimated_quantity: z.number().nonnegative(),
  confidence: z.enum(CONFIDENCES as unknown as [Confidence, ...Confidence[]]),
  reasoning: z.string(),
});

const unknownItemSchema = z.object({
  description: z.string(),
  photo_index: z.number().int().nonnegative(),
  suggested_category: z.string(),
});

export const reconciliationRawSchema = z.object({
  pantry_verification: z.array(verificationItemSchema),
  unknown_items: z.array(unknownItemSchema),
});

export type ReconciliationVerificationItem = z.infer<
  typeof verificationItemSchema
>;
export type ReconciliationUnknownItem = z.infer<typeof unknownItemSchema>;
export type ReconciliationResult = z.infer<typeof reconciliationRawSchema>;
