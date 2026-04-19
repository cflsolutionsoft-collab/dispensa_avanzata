"use client";

// Subscription live alla collezione users/{uid}/recipes.

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { handleError } from "@/lib/errors";
import type { Recipe } from "@/types";

interface UseRecipesResult {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
}

export function useRecipes(uid: string | null | undefined): UseRecipesResult {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const col = collection(db, `users/${uid}/recipes`);
    const unsub = onSnapshot(
      col,
      (snap) => {
        setRecipes(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Recipe),
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

  return { recipes, loading, error };
}
