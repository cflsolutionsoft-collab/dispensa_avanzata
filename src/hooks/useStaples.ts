"use client";

// Subscription live alla collezione users/{uid}/staples.

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { handleError } from "@/lib/errors";
import type { Staple } from "@/types";

interface UseStaplesResult {
  staples: Staple[];
  loading: boolean;
  error: string | null;
}

export function useStaples(uid: string | null | undefined): UseStaplesResult {
  const [staples, setStaples] = useState<Staple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const col = collection(db, `users/${uid}/staples`);
    const unsub = onSnapshot(
      col,
      (snap) => {
        setStaples(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Staple),
        );
        setLoading(false);
      },
      (err) => {
        setError(handleError(err));
        setLoading(false);
      },
    );

    return unsub;
  }, [uid]);

  return { staples, loading, error };
}
