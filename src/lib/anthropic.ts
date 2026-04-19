// Client Anthropic centralizzato + costanti modelli.
// Usato solo server-side (API routes). Mai importare in componenti client.

import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

// In produzione la chiave deve esserci, in dev/build accettiamo che manchi
// (il check viene fatto al primo uso effettivo nelle route)
export const anthropic = new Anthropic({ apiKey: apiKey ?? "" });

// ID modelli usati in app
export const MODELS = {
  vision: "claude-opus-4-7", // riconoscimento foto + riconciliazione
  text: "claude-sonnet-4-6", // ricette + meal planning
  fast: "claude-haiku-4-5-20251001", // voice parsing
} as const;

// Prezzi USD per milione di token, da aggiornare se Anthropic li cambia
export const PRICING = {
  "claude-opus-4-7": { input: 15, output: 75 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
} as const;

export function calculateCostUSD(
  model: keyof typeof PRICING,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = PRICING[model];
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export function assertAnthropicConfigured(): void {
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY non configurata. Aggiungila a .env.local",
    );
  }
}
