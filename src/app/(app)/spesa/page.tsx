"use client";

// Pagina Lista Spesa: voci raggruppate per reason, generazione automatica da
// staples sotto soglia, aggiunta manuale, check/uncheck, pulizia completate.

import Link from "next/link";
import { useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { usePantry } from "@/hooks/usePantry";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useStaples } from "@/hooks/useStaples";
import {
  addShoppingItem,
  clearChecked,
  generateShoppingList,
  removeShoppingItem,
  toggleChecked,
} from "@/lib/firestore/shoppingList";
import type { ShoppingListItem, ShoppingListReason } from "@/types";

// Ordine di priorità visiva dei motivi
const REASON_ORDER: ShoppingListReason[] = [
  "out_of_stock",
  "below_threshold",
  "predicted",
  "recipe",
  "manual",
];

const REASON_LABELS: Record<ShoppingListReason, string> = {
  out_of_stock: "Finiti",
  below_threshold: "Sotto soglia",
  predicted: "Stanno per finire",
  recipe: "Per le ricette",
  manual: "Aggiunti a mano",
};

export default function SpesaPage() {
  const { user } = useAuth();
  const { items, loading } = useShoppingList(user?.uid);
  const { staples } = useStaples(user?.uid);
  const { items: pantry } = usePantry(user?.uid);

  const [manualName, setManualName] = useState("");
  const [manualQty, setManualQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const openItems = useMemo(
    () => items.filter((i) => !i.checked),
    [items],
  );
  const checkedItems = useMemo(
    () => items.filter((i) => i.checked),
    [items],
  );

  // Raggruppa le voci aperte per reason, nell'ordine definito
  const grouped = useMemo(() => {
    const map = new Map<ShoppingListReason, ShoppingListItem[]>();
    for (const item of openItems) {
      const list = map.get(item.reason) ?? [];
      list.push(item);
      map.set(item.reason, list);
    }
    return REASON_ORDER.filter((r) => map.has(r)).map((r) => ({
      reason: r,
      items: map.get(r)!,
    }));
  }, [openItems]);

  const handleGenerate = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const created = await generateShoppingList(user.uid, staples, pantry);
      setInfo(
        created === 0
          ? "Nessun nuovo staple da aggiungere."
          : `${created} ${created === 1 ? "voce aggiunta" : "voci aggiunte"}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore generazione");
    } finally {
      setBusy(false);
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !manualName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addShoppingItem(user.uid, {
        stapleId: null,
        name: manualName.trim(),
        suggestedQuantity: manualQty,
        reason: "manual",
        priority: "media",
        checked: false,
        note: null,
      });
      setManualName("");
      setManualQty(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore aggiunta");
    } finally {
      setBusy(false);
    }
  };

  const handleClearChecked = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const removed = await clearChecked(user.uid);
      setInfo(`${removed} ${removed === 1 ? "voce rimossa" : "voci rimosse"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore pulizia");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Spesa
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {openItems.length}{" "}
            {openItems.length === 1 ? "cosa" : "cose"} da prendere
          </h1>
        </div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Home
        </Link>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {info}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy || staples.length === 0}
          className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          Genera da staples
        </button>
        {checkedItems.length > 0 && (
          <button
            type="button"
            onClick={handleClearChecked}
            disabled={busy}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Pulisci ({checkedItems.length})
          </button>
        )}
      </div>

      <form
        onSubmit={handleAddManual}
        className="flex gap-2 rounded-xl border border-zinc-200 bg-white p-3"
      >
        <input
          type="text"
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          placeholder="Aggiungi un prodotto..."
          className="flex-1 rounded-md border border-zinc-200 px-2 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
        />
        <input
          type="number"
          min="1"
          value={manualQty}
          onChange={(e) => setManualQty(Number(e.target.value))}
          className="w-16 rounded-md border border-zinc-200 px-2 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !manualName.trim()}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          +
        </button>
      </form>

      {loading && <p className="text-sm text-zinc-500">Caricamento...</p>}

      {!loading && items.length === 0 && (
        <p className="text-sm text-zinc-500">
          Lista vuota. Genera dai tuoi staples o aggiungi a mano.
        </p>
      )}

      {grouped.map((group) => (
        <section key={group.reason} className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {REASON_LABELS[group.reason]}
          </h2>
          <ul className="space-y-1.5">
            {group.items.map((item) => (
              <ShoppingRow
                key={item.id}
                item={item}
                onToggle={(checked) =>
                  user && toggleChecked(user.uid, item.id, checked)
                }
                onRemove={() => user && removeShoppingItem(user.uid, item.id)}
              />
            ))}
          </ul>
        </section>
      ))}

      {checkedItems.length > 0 && (
        <section className="space-y-2 pt-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Già presi
          </h2>
          <ul className="space-y-1.5">
            {checkedItems.map((item) => (
              <ShoppingRow
                key={item.id}
                item={item}
                onToggle={(checked) =>
                  user && toggleChecked(user.uid, item.id, checked)
                }
                onRemove={() => user && removeShoppingItem(user.uid, item.id)}
              />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function ShoppingRow({
  item,
  onToggle,
  onRemove,
}: {
  item: ShoppingListItem;
  onToggle: (checked: boolean) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <input
        type="checkbox"
        checked={item.checked}
        onChange={(e) => onToggle(e.target.checked)}
        className="h-4 w-4 accent-zinc-900"
      />
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${item.checked ? "text-zinc-400 line-through" : "text-zinc-900"}`}
        >
          {item.name}
          {item.suggestedQuantity > 1 && (
            <span className="ml-1 text-zinc-500">×{item.suggestedQuantity}</span>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 text-xs text-zinc-400 hover:text-red-600"
      >
        ✕
      </button>
    </li>
  );
}
