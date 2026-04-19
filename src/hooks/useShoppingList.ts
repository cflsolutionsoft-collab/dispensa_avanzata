"use client";

// Subscription live alla collezione users/{uid}/shoppingList.

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { handleError } from "@/lib/errors";
import type { ShoppingListItem } from "@/types";

interface UseShoppingListResult {
  items: ShoppingListItem[];
  loading: boolean;
  error: string | null;
}

export function useShoppingList(
  uid: string | null | undefined,
): UseShoppingListResult {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const col = collection(db, `users/${uid}/shoppingList`);
    const unsub = onSnapshot(
      col,
      (snap) => {
        setItems(
          snap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as ShoppingListItem,
          ),
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

  return { items, loading, error };
}
