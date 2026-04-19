"use client";

// Vista dispensa: lista item filtrabile per categoria, ordinata per scadenza,
// raggruppata per categoria quando "Tutte" è selezionato.

import Link from "next/link";
import { useMemo, useState } from "react";
import { Camera, Minus, Package, Plus } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePantry } from "@/hooks/usePantry";
import { adjustQuantity } from "@/lib/firestore/pantry";
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  PageHeader,
  Pill,
} from "@/components/ui";
import { EXPIRY_BADGE_TONE, getExpiryStatus } from "@/lib/expiry";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
} from "@/lib/enums";
import type { PantryItem } from "@/types";

type CategoryFilter = Category | "all";

export default function DispensaPage() {
  const { user } = useAuth();
  const { items, loading, error } = usePantry(user?.uid);
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const presentCategories = useMemo(() => {
    const set = new Set<Category>();
    for (const item of items) set.add(item.category);
    return CATEGORIES.filter((c) => set.has(c));
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.category === filter);
  }, [items, filter]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (a.expiresAt && !b.expiresAt) return -1;
        if (!a.expiresAt && b.expiresAt) return 1;
        if (a.expiresAt && b.expiresAt) {
          return a.expiresAt.toMillis() - b.expiresAt.toMillis();
        }
        return a.name.localeCompare(b.name);
      }),
    [filtered],
  );

  const grouped = useMemo(() => {
    if (filter !== "all") return null;
    const map = new Map<Category, PantryItem[]>();
    for (const item of sorted) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return CATEGORIES.filter((c) => map.has(c)).map((c) => ({
      category: c,
      items: map.get(c)!,
    }));
  }, [sorted, filter]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-5 pb-8 pt-8">
      <PageHeader
        kicker="Dispensa"
        title={
          items.length === 0
            ? "Niente in casa"
            : `${items.length} ${items.length === 1 ? "prodotto" : "prodotti"}`
        }
      />

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {loading && (
        <p className="text-sm text-forest-500">Caricamento dispensa...</p>
      )}

      {!loading && items.length === 0 && (
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title="Dispensa vuota"
          description="Carica le foto della tua spesa per iniziare a tracciare quello che hai in casa."
          action={
            <Link href="/carico">
              <Button iconLeft={<Camera className="h-4 w-4" />}>
                Scarica la spesa
              </Button>
            </Link>
          }
        />
      )}

      {items.length > 0 && (
        <>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            <Pill active={filter === "all"} onClick={() => setFilter("all")}>
              Tutte · {items.length}
            </Pill>
            {presentCategories.map((c) => {
              const count = items.filter((i) => i.category === c).length;
              return (
                <Pill
                  key={c}
                  active={filter === c}
                  onClick={() => setFilter(c)}
                >
                  {CATEGORY_LABELS[c]} · {count}
                </Pill>
              );
            })}
          </div>

          {grouped ? (
            <div className="space-y-6">
              {grouped.map((group) => (
                <section key={group.category} className="space-y-2.5">
                  <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-forest-500">
                    {CATEGORY_LABELS[group.category]}
                  </h2>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <PantryItemRow
                        key={item.id}
                        item={item}
                        uid={user!.uid}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {sorted.map((item) => (
                <PantryItemRow
                  key={item.id}
                  item={item}
                  uid={user!.uid}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function PantryItemRow({ item, uid }: { item: PantryItem; uid: string }) {
  const expiry = getExpiryStatus(item.expiresAt);
  const meta = [item.size, item.brand].filter(Boolean).join(" · ");
  const isEmpty = item.quantity === 0;

  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border bg-white px-3 py-2.5 shadow-soft-sm transition-opacity ${
        isEmpty ? "border-forest-100 opacity-50" : "border-forest-100"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-forest-900">
          {item.name}
        </p>
        {meta && (
          <p className="truncate text-xs text-forest-500">{meta}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          icon={<Minus className="h-4 w-4" />}
          label="Diminuisci"
          variant="secondary"
          disabled={isEmpty}
          onClick={() => adjustQuantity(uid, item.id, -1, item.quantity)}
          className="h-9 w-9"
        />
        <span className="min-w-[3rem] text-center text-xs font-medium text-forest-700">
          {item.quantity} {item.unit}
        </span>
        <IconButton
          icon={<Plus className="h-4 w-4" />}
          label="Aumenta"
          variant="secondary"
          onClick={() => adjustQuantity(uid, item.id, 1, item.quantity)}
          className="h-9 w-9"
        />
      </div>

      <Badge tone={EXPIRY_BADGE_TONE[expiry.tone]}>{expiry.label}</Badge>
    </li>
  );
}
