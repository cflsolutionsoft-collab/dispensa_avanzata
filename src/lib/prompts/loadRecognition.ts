// Prompt di riconoscimento multi-foto post-spesa.
// Modello target: Opus 4.7. Vedi Progetto.md §7.1 per il razionale.

export const buildLoadRecognitionPrompt = (photoCount: number) =>
  `
Sto organizzando la mia spesa in gruppi e ho scattato ${photoCount} foto, ognuna di un gruppo diverso di prodotti (es. frigo, dispensa secca, detersivi, bevande).

Analizza TUTTE le foto insieme e restituisci un unico JSON consolidato con l'inventario completo di questa spesa.

REGOLE CRITICHE:
1. Ogni foto mostra prodotti DIVERSI dagli altri gruppi. Non duplicare tra foto.
2. Se nella stessa foto vedi N confezioni identiche dello stesso prodotto, è 1 item con quantity: N.
3. Identifica il brand SOLO se è chiaramente leggibile. Non inventare.
4. Per frutta/verdura sfusa stima il numero a occhio.
5. Per ogni item aggiungi una stima dei giorni prima che scada (estimatedExpiryDays) basata sulla categoria:
   - Frutta/verdura fresca: 5-10
   - Carne fresca: 2-4
   - Pesce fresco: 1-2
   - Latticini aperti: 5-10
   - Latticini chiusi: 15-30
   - Pane: 3-5
   - Surgelati: 90
   - Conserve/scatolame/pasta secca: null (non tracciare)
6. Flagga trackingWorthy: false per sale, farina, pasta secca, riso, olio, aceto, zucchero, spezie.

Rispondi ESCLUSIVAMENTE con questo JSON, senza markdown né testo prima/dopo:

{
  "session_items": [
    {
      "name": "string",
      "brand": "string | null",
      "category": "frutta_verdura | carne_pesce | latticini_uova | pasta_riso_cereali | pane_prodotti_da_forno | bevande | conserve_scatolame | surgelati | condimenti_spezie | dolci_snack | cura_casa | cura_persona | altro",
      "quantity": number,
      "unit": "pz | conf | g | kg | ml | l",
      "size": "string | null",
      "estimatedExpiryDays": number | null,
      "trackingWorthy": boolean,
      "confidence": "alta | media | bassa",
      "photo_index": number
    }
  ],
  "unclear": ["descrizioni di oggetti non identificati"],
  "photo_notes": { "0": "foto scura", "2": "etichetta tagliata" }
}
`.trim();
