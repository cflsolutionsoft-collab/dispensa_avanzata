// Firebase Admin SDK: usato server-side nelle API route per verificare i token
// id degli utenti e per scritture privilegiate. Mai importare nel client.

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function buildCredentials() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Le chiavi private nelle env vars sono spesso salvate con \n letterali:
  // ripristiniamo i newline reali
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin non configurato. Servono FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY in .env.local",
    );
  }

  return cert({ projectId, clientEmail, privateKey });
}

// Singleton: evita doppia inizializzazione tra hot reload e route diverse
const app =
  getApps().length === 0
    ? initializeApp({ credential: buildCredentials() })
    : getApps()[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
