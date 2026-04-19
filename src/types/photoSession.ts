// Tipo PhotoSession: raggruppa una serie di foto e l'output AI relativo.
// Schema documento: users/{uid}/photoSessions/{sessionId}

import type { Timestamp } from "firebase/firestore";
import type { Category, Confidence, Unit } from "@/lib/enums";

// Tipo di sessione: spesa appena fatta o riconciliazione frigo/dispensa
export type PhotoSessionType = "load" | "reconcile";

// Stato del flusso di review
export type PhotoSessionStatus = "pending" | "confirmed" | "discarded";

// Tracking del costo della chiamata Claude
export interface TokenUsage {
  input: number;
  output: number;
  costUSD: number;
}

// Item riconosciuto da Claude in una foto, prima della conferma utente
export interface DetectedItem {
  name: string;
  brand: string | null;
  category: Category;
  quantity: number;
  unit: Unit;
  size: string | null;
  estimatedExpiryDays: number | null;
  trackingWorthy: boolean;
  confidence: Confidence;
  photoIndex: number;
}

// Output grezzo del prompt di carico (buildLoadRecognitionPrompt)
export interface LoadRecognitionResult {
  session_items: DetectedItem[];
  unclear: string[];
  photo_notes: Record<string, string>;
}

export interface PhotoSession {
  id: string;
  type: PhotoSessionType;
  takenAt: Timestamp;
  photoCount: number;
  storagePaths: string[]; // path su Firebase Storage, auto-delete dopo 7gg

  rawDetection: LoadRecognitionResult | null; // output JSON di Claude
  // Item confermati dall'utente (referenze a pantry o snapshot post-merge)
  confirmedItemIds: string[];

  status: PhotoSessionStatus;
  tokenUsage: TokenUsage | null;
}

export type NewPhotoSession = Omit<PhotoSession, "id" | "takenAt">;
