"use client";

// Hook che si iscrive alla collezione pantry dell'utente e tiene lo stato
// sincronizzato in tempo reale. Ritorna items, loading, error.

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { handleError } from "@/lib/errors";
import type { PantryItem } from "@/types";

interface UsePantryResult {
  items: PantryItem[];
  loading: boolean;
  error: string | null;
}

export function usePantry(uid: string | null | undefined): UsePantryResult {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    setLoading(true);
    const col = collection(db, `users/${uid}/pantry`);

    const unsubscribe = onSnapshot(
      col,
      (snap) => {
        const next = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as PantryItem,
        );
        setItems(next);
        setLoading(false);
      },
      (err) => {
        setError(handleError(err));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [uid]);

  return { items, loading, error };
}
