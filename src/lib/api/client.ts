// Helper client per chiamare le API route includendo l'idToken Firebase.

import type { User } from "firebase/auth";

import type {
  PantrySnapshotItem,
} from "@/lib/prompts/recipe";
import type {
  ReconciliationPantrySnapshot,
} from "@/lib/prompts/reconciliation";
import type {
  RecipeGenerationResult,
} from "@/lib/validators/recipe";
import type {
  ReconciliationResult,
} from "@/lib/validators/reconciliation";
import type { LoadRecognitionResult, TokenUsage } from "@/types";

interface RecognizeLoadResponse {
  result: LoadRecognitionResult;
  tokenUsage: TokenUsage;
}

interface GenerateRecipesResponse {
  result: RecipeGenerationResult;
  tokenUsage: TokenUsage;
}

interface ReconcileResponse {
  result: ReconciliationResult;
  tokenUsage: TokenUsage;
}

export interface GenerateRecipesInput {
  pantry: PantrySnapshotItem[];
  expiringSoon: PantrySnapshotItem[];
  servings?: number;
  preferences?: {
    cuisines?: string[];
    dislikes?: string[];
    allergies?: string[];
  };
  constraints?: {
    maxTimeMinutes?: number;
    purityLevel?: "strict" | "few_additions" | "flexible";
    mealType?: "pranzo" | "cena" | "pranzo_e_cena";
  };
}

interface ApiErrorBody {
  error?: string;
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return body.error ?? `Errore ${res.status}`;
  } catch {
    return `Errore ${res.status}`;
  }
}

/**
 * Invia una serie di foto alla API di riconoscimento carico.
 * Throws Error con messaggio user-friendly in caso di fallimento.
 */
export async function recognizeLoad(
  user: User,
  photos: File[],
): Promise<RecognizeLoadResponse> {
  const idToken = await user.getIdToken();
  const formData = new FormData();
  for (const photo of photos) {
    formData.append("photos", photo);
  }

  const res = await fetch("/api/recognize-load", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return (await res.json()) as RecognizeLoadResponse;
}

/**
 * Chiede a Claude 3 proposte di ricette basate sulla dispensa corrente.
 */
export async function generateRecipes(
  user: User,
  input: GenerateRecipesInput,
): Promise<GenerateRecipesResponse> {
  const idToken = await user.getIdToken();
  const res = await fetch("/api/generate-recipes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return (await res.json()) as GenerateRecipesResponse;
}

/**
 * Invia foto + snapshot dispensa per riconciliazione guidata (Opus 4.7).
 */
export async function reconcile(
  user: User,
  photos: File[],
  pantry: ReconciliationPantrySnapshot[],
): Promise<ReconcileResponse> {
  const idToken = await user.getIdToken();
  const formData = new FormData();
  for (const photo of photos) formData.append("photos", photo);
  formData.append("pantry", JSON.stringify(pantry));

  const res = await fetch("/api/reconcile", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return (await res.json()) as ReconcileResponse;
}
