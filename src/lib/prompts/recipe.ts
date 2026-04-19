// Prompt di generazione ricette focus-scadenze.
// Modello target: Sonnet 4.6. Vedi Progetto.md §7.3.

// Rappresentazione minima della dispensa da passare a Claude
export interface PantrySnapshotItem {
  name: string;
  quantity: number;
  unit: string;
  expiryDays: number | null; // giorni alla scadenza (null = nessuna)
}

export interface RecipePromptParams {
  pantry: PantrySnapshotItem[];
  expiringSoon: PantrySnapshotItem[];
  servings: number;
  preferences: {
    cuisines: string[];
    dislikes: string[];
    allergies: string[];
  };
  constraints: {
    maxTimeMinutes: number;
    purityLevel: "strict" | "few_additions" | "flexible";
    mealType?: "pranzo" | "cena" | "pranzo_e_cena";
  };
}

const PURITY_EXPLANATION = {
  strict: '"strict" = SOLO ingredienti che ho',
  few_additions:
    '"few_additions" = max 3 aggiunte economiche (olio, uova, aglio, cipolla già presenti)',
  flexible: '"flexible" = libera, ma ottimizza per non sprecare',
} as const;

function formatPantryLine(p: PantrySnapshotItem): string {
  const expiry =
    p.expiryDays != null ? `, scade in ~${p.expiryDays}gg` : "";
  return `- ${p.name} (${p.quantity} ${p.unit}${expiry})`;
}

function formatExpiringLine(p: PantrySnapshotItem): string {
  const expiry =
    p.expiryDays != null ? `scade in ~${p.expiryDays} giorni` : "prossimo";
  return `- ${p.name} (${expiry})`;
}

export const buildRecipePrompt = (params: RecipePromptParams) =>
  `
Sei un assistente di cucina domestica italiana. Ho bisogno di 3 proposte di ricette per ${params.servings} persone.

COSA HO IN CASA (dispensa attuale):
${params.pantry.map(formatPantryLine).join("\n")}

COSA SCADE PRIMA (usa prioritariamente questi):
${params.expiringSoon.map(formatExpiringLine).join("\n") || "- (nessun item in scadenza imminente)"}

PREFERENZE:
- Cucine preferite: ${params.preferences.cuisines.join(", ") || "qualunque"}
- Non mi piace: ${params.preferences.dislikes.join(", ") || "nulla in particolare"}
- Allergie/intolleranze: ${params.preferences.allergies.join(", ") || "nessuna"}

VINCOLI:
- Livello aggiunte: ${params.constraints.purityLevel}
  - ${PURITY_EXPLANATION[params.constraints.purityLevel]}
- Tempo massimo: ${params.constraints.maxTimeMinutes} minuti
${params.constraints.mealType ? `- Tipologia: ${params.constraints.mealType}` : ""}

Rispondi ESCLUSIVAMENTE con questo JSON, senza markdown né testo prima/dopo:

{
  "recipes": [
    {
      "title": "string",
      "servings": ${params.servings},
      "totalTimeMinutes": number,
      "difficulty": "facile | media | impegnativa",
      "usesExpiring": ["nomi degli item in scadenza che usa"],
      "ingredients": [
        {
          "name": "string",
          "quantity": number,
          "unit": "g | kg | ml | l | pz | cucchiai | q.b.",
          "fromPantry": boolean,
          "toBuy": boolean
        }
      ],
      "steps": ["step 1", "step 2", "..."],
      "whyThisRecipe": "breve motivazione in italiano"
    }
  ],
  "shoppingListAdditions": [
    { "name": "string", "quantity": number, "unit": "string", "forRecipe": "titolo ricetta" }
  ]
}
`.trim();
