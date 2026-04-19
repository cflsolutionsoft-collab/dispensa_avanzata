// Operazioni Firestore per la collezione users/{uid}/photoSessions.

import { Timestamp, addDoc, collection, doc, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type {
  LoadRecognitionResult,
  PhotoSessionType,
  TokenUsage,
} from "@/types";

interface CreatePhotoSessionInput {
  uid: string;
  type: PhotoSessionType;
  photoCount: number;
  rawDetection: LoadRecognitionResult;
  confirmedItemIds: string[];
  tokenUsage: TokenUsage;
}

/**
 * Crea una PhotoSession con status "confirmed".
 * Le foto NON vengono salvate su Storage in Sprint 1: storagePaths è vuoto.
 */
export async function createConfirmedPhotoSession(
  input: CreatePhotoSessionInput,
): Promise<string> {
  const sessionsCol = collection(db, `users/${input.uid}/photoSessions`);
  const docRef = await addDoc(sessionsCol, {
    type: input.type,
    takenAt: Timestamp.now(),
    photoCount: input.photoCount,
    storagePaths: [],
    rawDetection: input.rawDetection,
    confirmedItemIds: input.confirmedItemIds,
    status: "confirmed",
    tokenUsage: input.tokenUsage,
  });
  return docRef.id;
}

/**
 * Aggiorna la lista degli id pantry confermati su una session esistente.
 * Chiamata dopo aver fatto il merge degli item su pantry.
 */
export async function attachConfirmedItemIds(
  uid: string,
  sessionId: string,
  itemIds: string[],
): Promise<void> {
  const ref = doc(db, `users/${uid}/photoSessions/${sessionId}`);
  await updateDoc(ref, { confirmedItemIds: itemIds });
}
