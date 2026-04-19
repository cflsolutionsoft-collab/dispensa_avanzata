# Contesto Progetto — Pantry AI (dispensa_avanzata)

> Riferimento esteso con visione, schemi dati completi, prompt AI e roadmap: vedi [Progetto.md](Progetto.md).
> Questo file è il riassunto operativo per orientarsi rapidamente.

## Obiettivo

App personale (web → PWA) per gestire la dispensa di casa:

1. **Carico spesa** via foto multi-prodotto, riconosciute da Claude Vision
2. **Lista spesa** generata automaticamente da beni di prima necessità ("staples") sotto soglia
3. **Ricette anti-spreco** che danno priorità agli ingredienti in scadenza
4. **Riconciliazione** periodica via foto come rete di sicurezza contro la negligenza

## Utenti target

- Utente principale: il proprietario della dispensa (single user MVP)
- Utente secondario (Sprint 5+): partner con accesso condiviso

## Funzionalità principali (MVP — Sprint 1-4)

- Auth Google
- Upload multi-foto + riconoscimento prodotti con Opus 4.7
- Vista dispensa con filtri per categoria
- CRUD staples
- Generazione lista spesa "sotto soglia"
- Decremento manuale items (recent use tray + bottone −1)
- Dashboard scadenze
- Generazione ricette con Sonnet 4.6
- Riconciliazione foto (auto/verifica/unknown)
- PWA con notifica serale interattiva

## Priorità (MVP — Sprint 1)

1. Auth Google + protezione route
2. Schema Firestore + security rules per-utente
3. Upload multi-foto + API `/api/recognize-load` (Opus 4.7)
4. Review UI conferma items + merge su `pantry`
5. Vista dispensa con filtro categoria

Tutto il resto è "nice to have" — non proporre spontaneamente.

## Stile e design

- **Tono**: informale, diretto, italiano
- **Stile visivo**: minimal, mobile-first (PWA), focus su un-tap-actions
- **Colori principali**: da definire — partire con palette neutra Tailwind (zinc/emerald per accenti)
- **Riferimenti**: pulizia tipo Linear / Things, niente fronzoli

## Decisioni architetturali

- **Frontend**: Next.js 15+ (App Router) + TypeScript + Tailwind 4
- **Backend/DB**: Firebase (Firestore + Auth + Storage), tutto sotto `users/{uid}/`
- **Auth**: solo Google login
- **AI**:
  - Opus 4.7 → riconoscimento foto (carico + riconciliazione)
  - Sonnet 4.6 → ricette + meal planning
  - Haiku 4.5 → voice parsing
- **Image processing**: resize client-side (`browser-image-compression`) + server-side (`sharp`) prima di Claude
- **API key Claude**: sempre server-side in env vars, mai esposta al client
- **PWA**: manifest + service worker + web push (Sprint 4)

## Struttura dati (Firestore)

Tutto isolato sotto `users/{uid}/`. Schemi dettagliati in [Progetto.md §5](Progetto.md).

- `users/{uid}/pantry/{itemId}` — stato attuale dispensa
- `users/{uid}/staples/{stapleId}` — beni "voglio sempre averli"
- `users/{uid}/shoppingList/{itemId}` — lista spesa attiva
- `users/{uid}/photoSessions/{sessionId}` — sessioni foto + output Claude
- `users/{uid}/recipes/{recipeId}` — ricettario personale
- `users/{uid}/activity/{eventId}` — log eventi (opzionale)

## Pagine/Route principali

- `/` — Home (recent use tray, scadenze, scorciatoie)
- `/login` — Login Google
- `/dispensa` — Vista dispensa filtrabile
- `/carico` — Upload foto + review riconoscimento
- `/spesa` — Lista spesa
- `/staples` — CRUD beni abituali
- `/ricette` — Generazione + ricettario
- `/riconcilia` — Riconciliazione foto

## Endpoint API

- `POST /api/recognize-load` — riconoscimento multi-foto post-spesa (Opus 4.7)
- `POST /api/reconcile` — riconciliazione frigo/dispensa (Opus 4.7) — Sprint 4
- `POST /api/generate-recipes` — proposte ricette (Sonnet 4.6) — Sprint 3
- `POST /api/voice-consume` — voice scarico (Haiku 4.5) — Sprint 6+

## Note

- I prompt AI sono asset versionati in `src/lib/prompts/*.ts` — modificare con cautela
- Budget AI atteso: $1.40-$2.60/mese (vedi [Progetto.md §9](Progetto.md))
- Filosofia "AI propone, utente conferma": mai scrivere su Firestore output AI con confidenza media/bassa senza review
- Roadmap a 6 sprint dettagliata in [Progetto.md §11](Progetto.md)
