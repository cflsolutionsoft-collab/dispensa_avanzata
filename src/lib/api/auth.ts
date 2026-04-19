// Helper di autenticazione per le API route.
// Verifica l'idToken Firebase passato dal client nell'header Authorization.

import type { DecodedIdToken } from "firebase-admin/auth";

import { adminAuth } from "@/lib/firebase-admin";
import { AppError } from "@/lib/errors";

export class AuthError extends AppError {
  constructor(message: string, userMessage: string) {
    super(message, "AUTH_ERROR", userMessage);
    this.name = "AuthError";
  }
}

/**
 * Estrae e verifica l'idToken Firebase da una richiesta.
 * Throws AuthError se manca o non è valido.
 */
export async function requireAuth(req: Request): Promise<DecodedIdToken> {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw new AuthError(
      "Authorization header mancante",
      "Devi essere autenticato per usare questa funzione.",
    );
  }

  const idToken = header.slice("Bearer ".length).trim();
  if (!idToken) {
    throw new AuthError(
      "Bearer token vuoto",
      "Devi essere autenticato per usare questa funzione.",
    );
  }

  try {
    return await adminAuth.verifyIdToken(idToken);
  } catch {
    throw new AuthError(
      "verifyIdToken fallito",
      "Sessione scaduta. Accedi di nuovo.",
    );
  }
}
