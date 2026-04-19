// Prompt di riconciliazione frigo/dispensa.
// Modello target: Opus 4.7. Vedi Progetto.md §7.2.
// Chiave: passiamo la dispensa come contesto e chiediamo verifica guidata,
// non riconoscimento aperto.

export interface ReconciliationPantrySnapshot {
  name: string;
  quantity: number;
  unit: string;
  brand: string | null;
}

function formatLine(p: ReconciliationPantrySnapshot): string {
  return `- ${p.name} (${p.quantity} ${p.unit})${p.brand ? ` [brand: ${p.brand}]` : ""}`;
}

export const buildReconciliationPrompt = (
  pantry: ReconciliationPantrySnapshot[],
) => {
  const pantryList = pantry.map(formatLine).join("\n");
  const today = new Date().toLocaleDateString("it-IT");

  return `
DISPENSA ATTUALE (aggiornata al ${today}):
${pantryList}

Ti mando alcune foto del frigo/dispensa per verificare lo stato reale rispetto a quanto registrato.

Per OGNI item della dispensa sopra rispondimi con:
- visible: true/false
- estimated_state: "full" | "partial" | "empty" | "not_visible"
- estimated_quantity: numero stimato (0 se empty, il valore originale se full, stima se partial)
- confidence: "alta" | "media" | "bassa"
- reasoning: breve spiegazione in italiano

Poi, SEPARATAMENTE, segnala oggetti che vedi nelle foto e NON sono nella lista (avanzi, cose nuove, contenitori non identificati).

NOTE IMPORTANTI:
- "not_visible" quando c'è probabilità che l'item sia nella zona del frigo che non vedi — non significa "consumato"
- Usa confidence "bassa" quando l'item è parzialmente coperto, in un contenitore traslucido, o simile ad altri
- Se vedi un prodotto aperto parzialmente, prova a stimare la percentuale rimanente

Rispondi ESCLUSIVAMENTE con questo JSON, senza markdown né testo prima/dopo:

{
  "pantry_verification": [
    {
      "pantry_item_name": "string esatto dalla lista",
      "visible": boolean,
      "estimated_state": "full | partial | empty | not_visible",
      "estimated_quantity": number,
      "confidence": "alta | media | bassa",
      "reasoning": "string"
    }
  ],
  "unknown_items": [
    {
      "description": "string",
      "photo_index": number,
      "suggested_category": "string"
    }
  ]
}
`.trim();
};
