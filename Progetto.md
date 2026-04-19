# Pantry AI — Contesto del progetto

Documento di riferimento per riprendere lo sviluppo del progetto con Claude Code. Contiene visione, decisioni architetturali, schemi dati, prompt AI già ottimizzati, flussi operativi e roadmap a sprint.

---

## 1. Obiettivo

App personale (web, poi PWA) per:

1. **Tracciare la dispensa di casa** tramite foto della spesa appena fatta, con riconoscimento AI multi-prodotto.
2. **Generare automaticamente la lista della spesa** basandosi su beni di prima necessità configurati e sul consumo effettivo.
3. **Non sprecare cibo** tramite ricette per 4 persone che danno priorità agli ingredienti in scadenza.
4. **Ridurre al minimo l'attrito quotidiano** per evitare l'abbandono — il pain point principale è lo scarico (decremento degli item consumati), che deve essere distribuito e quasi invisibile.

Utente principale: io. Utente secondario: la mia partner (dispensa condivisa).

---

## 2. Stack tecnologico

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind
- **Hosting**: Vercel
- **Backend/DB**: Firebase (Firestore + Auth + Storage)
- **AI**: Claude API
  - **Opus 4.7** per riconoscimento prodotti (vision multi-foto, alta accuratezza su etichette)
  - **Sonnet 4.6** per generazione ricette e meal planning (testo, qualità alta)
  - **Haiku 4.5** per voice parsing e task secondari
- **PWA**: manifest + service worker + web push (per notifiche serali interattive)
- **Image processing server-side**: `sharp` per resize pre-invio a Claude

---

## 3. Principi di design (non negoziabili)

1. **Un tap, da qualsiasi contesto**. Ogni azione frequente (scalare un item, aggiungere alla lista spesa) deve costare ≤3 secondi e non richiedere navigazione profonda.
2. **L'app deve tollerare la negligenza dell'utente**. Se l'utente dimentica di scalare item per 5 giorni, il sistema si auto-corregge con la riconciliazione da foto. Nessuna colpa, nessuna pressione.
3. **Tracciare solo quello che conta**. Circa 30-40 item "attivi" (frutta, verdura, carne, pesce, latticini, pane, avanzi). Il resto (sale, farina, pasta secca) vive in una "credenza statica" aggiornata manualmente raramente.
4. **L'AI propone, l'utente conferma**. Mai scrivere automaticamente su Firestore cose riconosciute con confidenza media o bassa senza review.
5. **Costo AI trascurabile**. Budget tranquillamente sotto i 4€/mese anche con uso intensivo.

---

## 4. Architettura a blocchi

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│ Scatta foto │ --> │ Next.js API  │ --> │ Claude Vision │ --> │ Review UI    │
│ (PWA/cam)   │     │ resize+auth  │     │ (Opus 4.7)    │     │ (conferma)   │
└─────────────┘     └──────────────┘     └───────────────┘     └──────┬───────┘
                                                                      │
                                                                      v
                                                               ┌──────────────┐
                                                               │  Firestore   │
                                                               │  (pantry,    │
                                                               │   staples,   │
                                                               │   list)      │
                                                               └──────┬───────┘
                                                                      │
                                           ┌──────────────────────────┤
                                           v                          v
                                  ┌────────────────┐        ┌──────────────────┐
                                  │ Shopping list  │        │ Recipe generator │
                                  │ (staples-pantry│        │  (Sonnet 4.6)    │
                                  │  diff + predict)│        │                  │
                                  └────────────────┘        └──────────────────┘
```

---

## 5. Data model (Firestore)

Tutte le collezioni sono sotto `users/{uid}/` per isolamento per utente.

### 5.1 Pantry (stato attuale della dispensa)

```typescript
// users/{uid}/pantry/{itemId}
interface PantryItem {
  name: string;                    // "Yogurt greco Fage 170g"
  normalizedName: string;          // "yogurt greco fage" (per matching)
  brand: string | null;
  category: Category;
  quantity: number;
  unit: "pz" | "conf" | "g" | "kg" | "ml" | "l";
  size: string | null;             // "170g"
  
  // Tracking lifecycle
  stapleId: string | null;         // link al suo staple, se lo è
  trackingWorthy: boolean;         // false per sale, farina, olio, ecc.
  
  // Scadenze "soft"
  estimatedExpiryDays: number | null;  // stimato da Claude alla creazione
  addedAt: Timestamp;
  expiresAt: Timestamp | null;         // addedAt + estimatedExpiryDays
  
  // Attività
  firstAddedAt: Timestamp;
  lastSeenAt: Timestamp;            // ultima volta confermato (foto o manuale)
  lastConsumedAt: Timestamp | null;
  lastPhotoSessionId: string | null;
}
```

### 5.2 Staples (beni abituali — "voglio sempre averli")

```typescript
// users/{uid}/staples/{stapleId}
interface Staple {
  name: string;                    // "Latte parzialmente scremato"
  normalizedName: string;
  category: Category;
  minQuantity: number;             // sotto questa soglia → shopping list
  unit: string;
  typicalBrand: string | null;
  avgDaysPerUnit: number | null;   // per predizione consumo (popolato dopo 4 settimane)
  priority: "alta" | "media" | "bassa";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 5.3 Shopping list (lista attiva)

```typescript
// users/{uid}/shoppingList/{itemId}
interface ShoppingListItem {
  stapleId: string | null;
  name: string;
  suggestedQuantity: number;
  reason: "below_threshold" | "out_of_stock" | "predicted" | "manual" | "recipe";
  priority: "alta" | "media" | "bassa";
  addedAt: Timestamp;
  checked: boolean;
  note: string | null;             // es. "scegli Barilla se c'è l'offerta"
}
```

### 5.4 Photo sessions (raggruppamento per operazione)

```typescript
// users/{uid}/photoSessions/{sessionId}
interface PhotoSession {
  type: "load" | "reconcile";      // spesa o riconciliazione frigo
  takenAt: Timestamp;
  photoCount: number;
  storagePaths: string[];          // Firebase Storage — auto-delete dopo 7gg
  
  rawDetection: any;               // output grezzo JSON di Claude
  confirmedItems: PantryItem[];    // dopo review dell'utente
  
  status: "pending" | "confirmed" | "discarded";
  
  tokenUsage: {
    input: number;
    output: number;
    costUSD: number;
  };
}
```

### 5.5 Recipes (ricettario personale)

```typescript
// users/{uid}/recipes/{recipeId}
interface Recipe {
  title: string;
  servings: number;                // default 4
  totalTimeMinutes: number;
  difficulty: "facile" | "media" | "impegnativa";
  
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    pantryMatchId: string | null;  // link all'item della dispensa se matchato
    toBuy: boolean;
  }>;
  
  steps: string[];
  
  // Metadata
  generatedAt: Timestamp;
  generationContext: {
    focusedOnExpiring: string[];   // normalizedName degli item prioritari
    pantrySnapshot: string[];      // cosa c'era in dispensa quel giorno
  };
  
  // Uso
  cooked: boolean;
  cookedAt: Timestamp | null;
  userRating: 1 | 2 | 3 | 4 | 5 | null;
  saved: boolean;                  // pinnata nel ricettario personale
  notes: string | null;
}
```

### 5.6 Activity log (opzionale — per partner sync e analytics)

```typescript
// users/{uid}/activity/{eventId}
interface ActivityEvent {
  type: "item_added" | "item_consumed" | "item_expired" | "recipe_cooked" | "reconciliation" | "shopping_done";
  timestamp: Timestamp;
  actor: string;                   // uid di chi ha fatto l'azione
  payload: Record<string, any>;
}
```

---

## 6. Enum condivisi

```typescript
// lib/enums.ts
export const CATEGORIES = [
  "frutta_verdura",
  "carne_pesce",
  "latticini_uova",
  "pasta_riso_cereali",
  "pane_prodotti_da_forno",
  "bevande",
  "conserve_scatolame",
  "surgelati",
  "condimenti_spezie",
  "dolci_snack",
  "cura_casa",
  "cura_persona",
  "altro",
] as const;

export type Category = typeof CATEGORIES[number];

export const UNITS = ["pz", "conf", "g", "kg", "ml", "l"] as const;
export type Unit = typeof UNITS[number];
```

---

## 7. Prompt AI (asset riutilizzabili)

Questi prompt sono già calibrati per contesto italiano. Vanno versionati insieme al codice (es. `lib/prompts/*.ts`).

### 7.1 Riconoscimento multi-foto post-spesa

Modello: **Opus 4.7**. Chiamata singola con 3-5 foto di gruppi di prodotti divisi per destinazione (frigo / dispensa secca / congelatore / casa).

```typescript
export const buildLoadRecognitionPrompt = (photoCount: number) => `
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
```

### 7.2 Riconciliazione frigo/dispensa

Modello: **Opus 4.7**. Usa il trucco chiave: passa la dispensa come contesto e chiedi verifica guidata, non riconoscimento aperto.

```typescript
export const buildReconciliationPrompt = (pantry: PantryItem[]) => {
  const pantryList = pantry
    .filter(p => p.trackingWorthy)
    .map(p => `- ${p.name} (${p.quantity} ${p.unit})${p.brand ? ` [brand: ${p.brand}]` : ""}`)
    .join("\n");

  return `
DISPENSA ATTUALE (aggiornata al ${new Date().toLocaleDateString("it-IT")}):
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

Rispondi ESCLUSIVAMENTE con questo JSON:

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
```

Logica di merge post-riconciliazione:

- **Alta confidence** → applica automaticamente la modifica senza chiedere
- **Media confidence** → lista "Confermi questi cambi?" con checkbox
- **Bassa confidence / not_visible** → ignora (nessuna modifica), mostra solo nel log
- **Unknown items** → lista separata "Vuoi aggiungere questi?"

### 7.3 Generazione ricette focus-scadenze

Modello: **Sonnet 4.6**.

```typescript
export const buildRecipePrompt = (params: {
  pantry: PantryItem[];
  expiringSoon: PantryItem[];
  servings: number;
  preferences: {
    cuisines: string[];
    dislikes: string[];
    allergies: string[];
  };
  constraints?: {
    maxTimeMinutes?: number;
    purityLevel: "strict" | "few_additions" | "flexible";
    mealType?: "pranzo" | "cena" | "pranzo_e_cena";
  };
}) => `
Sei un assistente di cucina domestica italiana. Ho bisogno di 3 proposte di ricette per ${params.servings} persone.

COSA HO IN CASA (dispensa attuale):
${params.pantry.map(p => `- ${p.name} (${p.quantity} ${p.unit})`).join("\n")}

COSA SCADE PRIMA (usa prioritariamente questi):
${params.expiringSoon.map(p => `- ${p.name} (scade in ~${daysUntil(p.expiresAt)} giorni)`).join("\n")}

PREFERENZE:
- Cucine preferite: ${params.preferences.cuisines.join(", ")}
- Non mi piace: ${params.preferences.dislikes.join(", ")}
- Allergie/intolleranze: ${params.preferences.allergies.join(", ") || "nessuna"}

VINCOLI:
- Livello aggiunte: ${params.constraints?.purityLevel ?? "few_additions"}
  - "strict" = SOLO ingredienti che ho
  - "few_additions" = max 3 aggiunte economiche (olio, uova, aglio, cipolla già presenti)
  - "flexible" = libera, ma ottimizza per non sprecare
- Tempo massimo: ${params.constraints?.maxTimeMinutes ?? 60} minuti
${params.constraints?.mealType ? `- Tipologia: ${params.constraints.mealType}` : ""}

Rispondi ESCLUSIVAMENTE con questo JSON:

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
      "whyThisRecipe": "breve motivazione: perché te la sto proponendo"
    }
  ],
  "shoppingListAdditions": [
    {
      "name": "string",
      "quantity": number,
      "unit": "string",
      "forRecipe": "titolo ricetta"
    }
  ]
}
`.trim();
```

### 7.4 Meal planning settimanale

Modello: **Sonnet 4.6**. Chiamata più pesante, genera il piano da lunedì a domenica.

```typescript
export const buildWeeklyPlanPrompt = (params: {
  pantry: PantryItem[];
  staples: Staple[];
  preferences: UserPreferences;
  weekStart: Date;
  constraints: {
    diningOutDays?: string[];         // es. ["venerdì sera"]
    heavyCookingDays?: string[];      // giorni in cui ok spendere tempo
  };
}) => `
Genera un piano pasti per 4 persone dal ${formatDate(params.weekStart)} al ${formatDate(addDays(params.weekStart, 6))}.

COSA HO IN CASA:
${params.pantry.map(p => `- ${p.name} (${p.quantity} ${p.unit}, scade in ~${daysUntil(p.expiresAt)}gg)`).join("\n")}

REGOLE:
1. Usa PRIORITARIAMENTE gli item che scadono prima della fine settimana.
2. Bilancia: 2 volte carne, 1-2 volte pesce, 1 vegetariano, resto libero.
3. Nei giorni "caotici" (default lun/gio) proponi piatti <30 min.
4. Nei giorni "slow" (default sab/dom) ok piatti più elaborati.
5. Evita ripetizioni troppo vicine (se faccio pasta al pomodoro lunedì, non rifarla mercoledì).
6. NON pianificare pasti per: ${(params.constraints.diningOutDays ?? []).join(", ") || "nessun giorno"}.

Rispondi ESCLUSIVAMENTE con questo JSON:

{
  "weekPlan": [
    {
      "date": "YYYY-MM-DD",
      "dayName": "lunedì",
      "lunch": { /* oggetto ricetta sintetico o null */ },
      "dinner": { /* oggetto ricetta sintetico o null */ }
    }
  ],
  "shoppingListAdditions": [
    { "name": "...", "quantity": 1, "unit": "...", "forDay": "mercoledì" }
  ],
  "wasteAvoided": ["item che sarebbero stati sprecati e ora sono pianificati"]
}
`.trim();
```

### 7.5 Voice input per scarico

Modello: **Haiku 4.5**. L'utente dice "ho usato due zucchine e mezza cipolla", la Web Speech API trascrive, Claude fa il match sulla dispensa.

```typescript
export const buildVoiceConsumptionPrompt = (transcript: string, pantry: PantryItem[]) => `
L'utente ha detto: "${transcript}"

La sua dispensa attuale contiene:
${pantry.map(p => `- [${p.id}] ${p.name} (${p.quantity} ${p.unit})`).join("\n")}

Identifica quali item della dispensa stava dichiarando di aver consumato e in che quantità. 
Se l'utente dice "mezza cipolla" e in dispensa c'è "1 cipolla", consumo è 0.5.
Se dice una cosa non in dispensa, mettila in "unmatched".

Rispondi ESCLUSIVAMENTE con:

{
  "consumed": [
    { "pantryItemId": "string", "name": "string", "quantity": number }
  ],
  "unmatched": ["cose dette ma non trovate in dispensa"],
  "confidence": "alta | media | bassa"
}
`.trim();
```

---

## 8. Flussi operativi

### 8.1 Carico (post-spesa)

1. Utente scatta 3-5 foto di gruppi di prodotti (frigo, dispensa, congelatore, ecc.)
2. Upload via `/api/recognize-load` → resize con sharp → chiamata a Opus 4.7 con `buildLoadRecognitionPrompt`
3. Response salvato come `photoSession` con status `pending`
4. Review UI: utente conferma/edita ogni item
5. Merge su `pantry`:
   - Se esiste match su `(category, normalizedName)` → incrementa `quantity`, aggiorna `lastSeenAt`
   - Altrimenti → crea nuovo item
6. Status della session → `confirmed`

### 8.2 Scarico quotidiano (la parte fragile)

**Strategia a tre binari paralleli** (tutti opzionali, si complementano):

- **Recent use tray** in home app: 6-8 card con gli item più probabilmente in uso oggi, bottone −1 diretto
- **Notifica push serale** (21:30): 4 chip cliccabili per item — conferma consumi in 2 secondi senza aprire l'app
- **"Ho cucinato questa ricetta"** → decrementa automaticamente tutti gli ingredienti della ricetta

La rete di sicurezza che rende tutto perdonabile è la **riconciliazione** (vedi sotto).

### 8.3 Riconciliazione (rete di sicurezza)

Ogni 10-14 giorni (o quando fai la prossima spesa grande, o quando l'utente vuole):

1. Utente scatta 2-3 foto di frigo/dispensa
2. Chiamata a Opus con `buildReconciliationPrompt(currentPantry)`
3. Response in 3 bucket:
   - **Alta confidence** → applica automaticamente (es. "zucchine: vedevo 3, ora 1" → scrive `quantity: 1`)
   - **Media confidence** → review UI breve, utente conferma
   - **Unknown items** → lista "Vuoi aggiungere?"
4. Aggiorna `lastSeenAt` per tutti gli item confermati come visibili

**Filosofia**: accettiamo un 15-20% di errore. L'alternativa è il tracking manuale perfetto che nessuno mantiene.

### 8.4 Generazione shopping list

Trigger: manuale (bottone) o schedulato (Cloud Function domenica mattina).

```typescript
async function generateShoppingList(uid: string): Promise<ShoppingListItem[]> {
  const [staples, pantry] = await Promise.all([getStaples(uid), getPantry(uid)]);
  const pantryByStaple = new Map(pantry.filter(p => p.stapleId).map(p => [p.stapleId!, p]));
  
  const list: ShoppingListItem[] = [];
  const now = Date.now();
  
  for (const staple of staples) {
    const current = pantryByStaple.get(staple.id);
    const qty = current?.quantity ?? 0;
    
    if (qty < staple.minQuantity) {
      list.push({
        stapleId: staple.id,
        name: staple.name,
        suggestedQuantity: staple.minQuantity - qty,
        reason: qty === 0 ? "out_of_stock" : "below_threshold",
        priority: staple.priority,
        addedAt: Timestamp.now(),
        checked: false,
      });
      continue;
    }
    
    // Predizione basata su consumo storico
    if (staple.avgDaysPerUnit && current?.lastConsumedAt) {
      const daysSince = (now - current.lastConsumedAt.toMillis()) / 86400000;
      const expectedRemaining = qty - (daysSince / staple.avgDaysPerUnit);
      
      if (expectedRemaining < staple.minQuantity) {
        list.push({
          stapleId: staple.id,
          name: staple.name,
          suggestedQuantity: 1,
          reason: "predicted",
          priority: staple.priority,
          addedAt: Timestamp.now(),
          checked: false,
        });
      }
    }
  }
  
  // Aggiungi anche item dalle ricette del meal plan settimanale (se attivo)
  // ...
  
  return sortByReasonAndPriority(list);
}
```

### 8.5 Generazione ricette

Trigger: utente schiaccia "Cosa cucino?" dalla home o dalla dashboard scadenze.

1. Raccogli `pantry`, `expiringSoon` (item con `expiresAt` entro 3 giorni), `preferences`
2. Chiamata a Sonnet 4.6 con `buildRecipePrompt`
3. Mostra 3 proposte in UI carosello
4. Se l'utente sceglie una: salva come `Recipe` con `cooked: false`
5. Dopo cucinata: tap "Ho cucinato" → decrementa ingredienti dalla pantry → `cooked: true`, `cookedAt: now`

---

## 9. Modello costi AI

Tutti i valori in USD, basati sui prezzi di aprile 2026.

| Operazione | Modello | Input tok | Output tok | Costo/op | Freq/mese | Costo/mese |
|---|---|---|---|---|---|---|
| Carico spesa (4 foto) | Opus 4.7 | ~16.500 | ~2.000 | $0.133 | 4-8 | $0.50-$1.10 |
| Riconciliazione (3 foto) | Opus 4.7 | ~12.000 | ~1.500 | $0.098 | 2-3 | $0.20-$0.30 |
| Ricetta ad hoc | Sonnet 4.6 | ~2.000 | ~1.500 | $0.029 | 15-30 | $0.45-$0.90 |
| Meal plan settimanale | Sonnet 4.6 | ~2.500 | ~3.000 | $0.053 | 4 | $0.21 |
| Voice scarico | Haiku 4.5 | ~800 | ~300 | $0.002 | 30-60 | $0.06-$0.12 |

**Totale atteso: $1.40-$2.60/mese** → ampiamente sotto il budget di 3-4€.

Ottimizzazioni sempre attive:
- Resize foto a max 1800×1800 lato client prima dell'invio
- Prompt caching per la lista categorie e preferenze utente (contesto stabile)

---

## 10. Strategia anti-abbandono

Gerarchia di intervento (implementare in questo ordine):

1. **Riconciliazione da foto** — la rete di sicurezza. Rende l'app perdonabile verso la negligenza. Senza questa, tutto il resto è fragile.
2. **Notifica push serale interattiva** — 4 chip cliccabili con gli item più probabili del giorno. PWA + web push + notification actions.
3. **Sync implicito da ricette** — "ho cucinato" scala tutto in un tap.
4. **Recent use tray in home** — 6-8 item pronti al decremento.
5. **Voice input** — per sessioni multi-item dopo aver cucinato.

**Rimandate a Sprint 3+**:
- Widget nativo iOS/Android (richiede Capacitor + Swift/Kotlin)
- Gamification (contatore zero-spreco, risparmio stimato, weekly wrapped)
- Partner sync con activity timeline

---

## 11. Roadmap a sprint

### Sprint 1 — Core loop (1-2 settimane)
- [ ] Setup Next.js 15 + Tailwind + Firebase SDK
- [ ] Firebase Auth (Google login)
- [ ] Schema Firestore + security rules per-utente
- [ ] Upload multi-foto con resize client-side
- [ ] API route `/api/recognize-load` con Opus 4.7
- [ ] Review UI (conferma/edita items riconosciuti)
- [ ] Salvataggio su `pantry` con merge logic
- [ ] Vista dispensa base con filtro per categoria

### Sprint 2 — Staples + shopping list (1 settimana)
- [ ] CRUD staples (una pagina)
- [ ] Generazione shopping list (solo "sotto soglia", niente predizione)
- [ ] UI shopping list con checkbox + aggiunta manuale
- [ ] Decremento manuale items dalla dispensa (swipe o bottone −1)
- [ ] Recent use tray in home

### Sprint 3 — Anti-spreco + ricette (1-2 settimane)
- [ ] Calcolo `expiresAt` da `estimatedExpiryDays`
- [ ] Dashboard scadenze ("occhio qui" con top 5 in zona rossa)
- [ ] API route `/api/generate-recipes` con Sonnet 4.6
- [ ] UI carosello ricette + "ho cucinato" con decremento automatico
- [ ] Ricettario personale (lista ricette salvate)

### Sprint 4 — Robustezza (1 settimana)
- [ ] API route `/api/reconcile` con prompt di verifica
- [ ] UI riconciliazione (3 bucket: auto/verifica/unknown)
- [ ] PWA: manifest + service worker + install prompt
- [ ] Web push + notifica serale interattiva (4 chip)

### Sprint 5 — Intelligenza (1-2 settimane)
- [ ] Meal planning settimanale
- [ ] Calcolo `avgDaysPerUnit` dagli storici (Cloud Function schedulata)
- [ ] Predizione "sta per finire" nella shopping list
- [ ] Preferenze utente (cuisines, dislikes, allergies)

### Sprint 6+ — Nice to have
- Voice input per scarico
- Partner sync (seconda utenza sulla stessa dispensa)
- Rating ricette + apprendimento preferenze
- Analytics settimanali / mensili
- Widget nativo (Capacitor)

---

## 12. Note tecniche e decisioni

### Sicurezza e privacy
- **Firestore rules**: tutto sotto `users/{uid}/` accessibile solo da quell'utente
- **Firebase Storage**: foto auto-delete dopo 7 giorni via Cloud Function schedulata
- **API key Claude**: sempre server-side in env vars Vercel, mai esposta al client
- **Rate limiting** sulle API route (es. `@upstash/ratelimit` o semplice controllo Firestore) per evitare abusi

### PWA
- Manifest con icon set completo
- Service worker con strategia cache-first per UI, network-first per dati
- Capture della fotocamera: `<input type="file" accept="image/*" capture="environment">`
- Install prompt personalizzato dopo 2-3 sessioni attive

### Image handling
- Resize lato client a 1800×1800 max con `browser-image-compression` → meno banda
- Resize server-side a 1500×1500 con `sharp` per Claude → meno token
- Upload a Firebase Storage solo se utente flagga "conserva per ~1 settimana", altrimenti solo in memoria durante la sessione

### Testing del prompt
- Tenere una cartella `/fixtures/photos/` con 10-15 set di foto reali
- Script di regression: esegue i prompt sui fixture e confronta con expected JSON
- Versionare i prompt con un `VERSION` tag per poter confrontare performance tra revisioni

### Error handling Claude
- Retry con backoff esponenziale su `529 overloaded` (max 3 tentativi)
- Fallback a Sonnet 4.6 per il riconoscimento se Opus 4.7 è down (con disclaimer all'utente "qualità ridotta")
- Validazione JSON con `zod`: se il parse fallisce, mostra errore invece di rompere

### Costi sotto controllo
- Logga `tokenUsage` in ogni `photoSession` e `recipe` per audit
- Dashboard admin (solo per me) con costo cumulativo mensile

---

## 13. Decisioni aperte

Cose che **non** ho ancora deciso e che andranno affrontate a tempo debito:

1. **Congelatore**: le foto di sacchetti opachi non funzionano con la vision. Probabile soluzione: form manuale semplificato con categoria + data + "porzioni per 4". Valutare in Sprint 4.
2. **Credenza statica**: dove mettere sale/pasta/olio/riso/farina. Ipotesi: tab separato con CRUD manuale, aggiornamento mensile. Non prioritario.
3. **Multi-utente reale**: al momento dispensa è single-user. Per condivisione con la partner: seconda utenza che legge/scrive sugli stessi documenti di famiglia. Richiede refactor delle rules. Sprint 5+.
4. **Offline-first**: Firestore ha offline persistence built-in. Da verificare se basta o se serve sync più sofisticato.
5. **Barcode scanner come shortcut**: per quando l'utente ha un singolo prodotto standard in mano, scansiona il codice e aggiunge senza foto. Libreria candidata: `@zxing/browser`. Utile ma non critico.
