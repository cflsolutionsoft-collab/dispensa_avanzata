"use client";

// Pagina CRUD Staples. Grafica spartana: UX verrà rifinita a fine struttura.

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useStaples } from "@/hooks/useStaples";
import {
  createStaple,
  deleteStaple,
  updateStaple,
} from "@/lib/firestore/staples";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  PRIORITIES,
  UNITS,
  type Category,
  type Priority,
  type Unit,
} from "@/lib/enums";
import type { Staple } from "@/types";

interface FormState {
  name: string;
  category: Category;
  unit: Unit;
  minQuantity: number;
  typicalBrand: string;
  priority: Priority;
}

const EMPTY_FORM: FormState = {
  name: "",
  category: "altro",
  unit: "pz",
  minQuantity: 1,
  typicalBrand: "",
  priority: "media",
};

export default function StaplesPage() {
  const { user } = useAuth();
  const { staples, loading } = useStaples(user?.uid);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleEdit = (staple: Staple) => {
    setEditingId(staple.id);
    setForm({
      name: staple.name,
      category: staple.category,
      unit: staple.unit,
      minQuantity: staple.minQuantity,
      typicalBrand: staple.typicalBrand ?? "",
      priority: staple.priority,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.name.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await updateStaple(user.uid, editingId, {
          name: form.name.trim(),
          category: form.category,
          unit: form.unit,
          minQuantity: form.minQuantity,
          typicalBrand: form.typicalBrand.trim() || null,
          priority: form.priority,
        });
      } else {
        await createStaple(user.uid, {
          name: form.name.trim(),
          category: form.category,
          unit: form.unit,
          minQuantity: form.minQuantity,
          typicalBrand: form.typicalBrand.trim() || null,
          avgDaysPerUnit: null,
          priority: form.priority,
        });
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore salvataggio");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (stapleId: string) => {
    if (!user) return;
    if (!confirm("Eliminare questo staple?")) return;
    try {
      await deleteStaple(user.uid, stapleId);
      if (editingId === stapleId) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore eliminazione");
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Staples
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Beni che voglio sempre avere
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

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <p className="text-sm font-medium text-zinc-700">
          {editingId ? "Modifica staple" : "Nuovo staple"}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Nome">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className={inputCls}
              placeholder="Latte parzialmente scremato"
            />
          </Field>
          <Field label="Brand abituale">
            <input
              type="text"
              value={form.typicalBrand}
              onChange={(e) =>
                setForm({ ...form, typicalBrand: e.target.value })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Categoria">
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as Category })
              }
              className={inputCls}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unità">
            <select
              value={form.unit}
              onChange={(e) =>
                setForm({ ...form, unit: e.target.value as Unit })
              }
              className={inputCls}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantità minima">
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.minQuantity}
              onChange={(e) =>
                setForm({ ...form, minQuantity: Number(e.target.value) })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Priorità">
            <select
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value as Priority })
              }
              className={inputCls}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {submitting
              ? "Salvataggio..."
              : editingId
                ? "Salva modifiche"
                : "Aggiungi"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Annulla
            </button>
          )}
        </div>
      </form>

      {loading && <p className="text-sm text-zinc-500">Caricamento...</p>}

      {!loading && staples.length === 0 && (
        <p className="text-sm text-zinc-500">
          Ancora nessuno staple. Aggiungine qui sopra.
        </p>
      )}

      {staples.length > 0 && (
        <ul className="space-y-2">
          {staples.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {s.name}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {CATEGORY_LABELS[s.category]} · min {s.minQuantity} {s.unit} ·
                  priorità {s.priority}
                  {s.typicalBrand ? ` · ${s.typicalBrand}` : ""}
                </p>
              </div>
              <div className="ml-3 flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => handleEdit(s)}
                  className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                >
                  Modifica
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  Elimina
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

const inputCls =
  "w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
