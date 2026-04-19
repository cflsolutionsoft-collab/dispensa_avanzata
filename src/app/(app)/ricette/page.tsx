"use client";

// Pagina Ricette: genera proposte volatili con Sonnet 4.6, salva/cucina su
// conferma utente con decremento guidato degli ingredienti dalla pantry.

import Link from "next/link";
import { useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { usePantry } from "@/hooks/usePantry";
import { useRecipes } from "@/hooks/useRecipes";
import { generateRecipes } from "@/lib/api/client";
import {
  createRecipe,
  deleteRecipe,
  markRecipeCooked,
  proposalIngredientsToDomain,
  setRecipeSaved,
} from "@/lib/firestore/recipes";
import { normalizeName } from "@/lib/normalize";
import type {
  PantrySnapshotItem,
} from "@/lib/prompts/recipe";
import type {
  RecipeProposal,
} from "@/lib/validators/recipe";
import type { PantryItem, Recipe } from "@/types";

const EXPIRY_SOON_DAYS = 3;
const MS_PER_DAY = 86_400_000;

// Converte un PantryItem nel payload snello che mandiamo al prompt
function toSnapshot(item: PantryItem): PantrySnapshotItem {
  const days = item.expiresAt
    ? Math.ceil((item.expiresAt.toMillis() - Date.now()) / MS_PER_DAY)
    : null;
  return {
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    expiryDays: days,
  };
}

// Match ingrediente → PantryItem: exact o substring su normalizedName
function findPantryMatch(
  ingredientName: string,
  pantry: PantryItem[],
): PantryItem | null {
  const n = normalizeName(ingredientName);
  if (!n) return null;
  return (
    pantry.find((p) => p.normalizedName === n) ??
    pantry.find((p) => p.normalizedName.includes(n) || n.includes(p.normalizedName)) ??
    null
  );
}

export default function RicettePage() {
  const { user } = useAuth();
  const { items: pantry } = usePantry(user?.uid);
  const { recipes } = useRecipes(user?.uid);

  const [proposals, setProposals] = useState<RecipeProposal[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const activePantry = useMemo(
    () => pantry.filter((p) => p.quantity > 0),
    [pantry],
  );
  const expiringSoon = useMemo(
    () =>
      activePantry.filter((p) => {
        if (!p.expiresAt) return false;
        const days = Math.ceil(
          (p.expiresAt.toMillis() - Date.now()) / MS_PER_DAY,
        );
        return days <= EXPIRY_SOON_DAYS;
      }),
    [activePantry],
  );

  const savedRecipes = useMemo(
    () => recipes.filter((r) => r.saved || r.cooked),
    [recipes],
  );

  const handleGenerate = async () => {
    if (!user) return;
    if (activePantry.length === 0) {
      setError("La dispensa è vuota: aggiungi qualcosa prima di generare ricette.");
      return;
    }
    setGenerating(true);
    setError(null);
    setInfo(null);
    try {
      const { result } = await generateRecipes(user, {
        pantry: activePantry.map(toSnapshot),
        expiringSoon: expiringSoon.map(toSnapshot),
      });
      setProposals(result.recipes);
      if (result.recipes.length === 0) {
        setError("Nessuna proposta generata. Riprova.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore generazione");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveForLater = async (proposal: RecipeProposal) => {
    if (!user) return;
    try {
      await createRecipe(user.uid, {
        title: proposal.title,
        servings: proposal.servings,
        totalTimeMinutes: proposal.totalTimeMinutes,
        difficulty: proposal.difficulty,
        ingredients: proposalIngredientsToDomain(proposal.ingredients),
        steps: proposal.steps,
        generationContext: {
          focusedOnExpiring: proposal.usesExpiring,
          pantrySnapshot: activePantry.map((p) => p.normalizedName),
        },
        cooked: false,
        saved: true,
        notes: null,
      });
      setInfo(`"${proposal.title}" salvata.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore salvataggio");
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Ricette
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Cosa cucino?
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

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating || activePantry.length === 0}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {generating
          ? "Claude sta cucinando..."
          : expiringSoon.length > 0
            ? `Genera 3 proposte (${expiringSoon.length} in scadenza)`
            : "Genera 3 proposte"}
      </button>

      {proposals && proposals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Proposte
          </h2>
          {proposals.map((proposal, i) => (
            <ProposalCard
              key={`${i}-${proposal.title}`}
              proposal={proposal}
              pantry={pantry}
              onSaveForLater={() => handleSaveForLater(proposal)}
              onCooked={() => {
                setInfo(`"${proposal.title}" cucinata! Ingredienti scalati.`);
                // Rimuove la proposta cucinata dalla lista volatile
                setProposals((p) =>
                  p ? p.filter((_, idx) => idx !== i) : null,
                );
              }}
              onError={(msg) => setError(msg)}
            />
          ))}
        </section>
      )}

      {savedRecipes.length > 0 && (
        <section className="space-y-3 pt-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Ricettario
          </h2>
          {savedRecipes.map((r) => (
            <SavedRecipeCard key={r.id} recipe={r} />
          ))}
        </section>
      )}
    </main>
  );
}

// ---- Card proposta (volatile, non ancora salvata) -------------------------

interface ProposalCardProps {
  proposal: RecipeProposal;
  pantry: PantryItem[];
  onSaveForLater: () => void;
  onCooked: () => void;
  onError: (msg: string) => void;
}

interface DecrementPlanItem {
  ingredientName: string;
  pantryItemId: string | null;
  pantryItemName: string | null;
  pantryQty: number;
  unit: string;
  decrementQty: number;
  include: boolean;
}

function ProposalCard({
  proposal,
  pantry,
  onSaveForLater,
  onCooked,
  onError,
}: ProposalCardProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [plan, setPlan] = useState<DecrementPlanItem[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const startCooked = () => {
    const next = proposal.ingredients.map((ing): DecrementPlanItem => {
      const match = findPantryMatch(ing.name, pantry);
      return {
        ingredientName: ing.name,
        pantryItemId: match?.id ?? null,
        pantryItemName: match?.name ?? null,
        pantryQty: match?.quantity ?? 0,
        unit: ing.unit,
        // Se stessa unità usa quantità della ricetta, altrimenti 1 "confezione"
        decrementQty: match && match.unit === ing.unit ? ing.quantity : 1,
        include: match !== null,
      };
    });
    setPlan(next);
    setConfirming(true);
  };

  const confirmCooked = async () => {
    if (!user || !plan) return;
    setSubmitting(true);
    try {
      // Salva ricetta con cooked=false, poi marchia cucinata e decrementa
      const recipeId = await createRecipe(user.uid, {
        title: proposal.title,
        servings: proposal.servings,
        totalTimeMinutes: proposal.totalTimeMinutes,
        difficulty: proposal.difficulty,
        ingredients: proposalIngredientsToDomain(proposal.ingredients),
        steps: proposal.steps,
        generationContext: {
          focusedOnExpiring: proposal.usesExpiring,
          pantrySnapshot: pantry
            .filter((p) => p.quantity > 0)
            .map((p) => p.normalizedName),
        },
        cooked: false,
        saved: true,
        notes: null,
      });

      const decrements = new Map<string, number>();
      const currentQtys = new Map<string, number>();
      for (const row of plan) {
        if (!row.include || !row.pantryItemId) continue;
        decrements.set(row.pantryItemId, row.decrementQty);
        currentQtys.set(row.pantryItemId, row.pantryQty);
      }
      await markRecipeCooked(user.uid, recipeId, decrements, currentQtys);
      onCooked();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Errore salvataggio");
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  };

  const updatePlanRow = (idx: number, patch: Partial<DecrementPlanItem>) => {
    setPlan((p) =>
      p ? p.map((r, i) => (i === idx ? { ...r, ...patch } : r)) : p,
    );
  };

  return (
    <article className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
      <header>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-zinc-900">
            {proposal.title}
          </h3>
          <span className="shrink-0 text-xs text-zinc-500">
            {proposal.totalTimeMinutes}min · {proposal.difficulty}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-600">{proposal.whyThisRecipe}</p>
        {proposal.usesExpiring.length > 0 && (
          <p className="mt-1 text-xs text-amber-700">
            Usa in scadenza: {proposal.usesExpiring.join(", ")}
          </p>
        )}
      </header>

      {expanded && !confirming && (
        <div className="space-y-2 border-t border-zinc-100 pt-3 text-sm">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Ingredienti
            </p>
            <ul className="space-y-0.5 text-zinc-700">
              {proposal.ingredients.map((ing, i) => (
                <li key={i}>
                  {ing.quantity} {ing.unit} · {ing.name}
                  {ing.toBuy && (
                    <span className="ml-2 text-xs text-amber-700">
                      (da comprare)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Procedimento
            </p>
            <ol className="list-decimal space-y-1 pl-4 text-zinc-700">
              {proposal.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {confirming && plan && (
        <div className="space-y-3 border-t border-zinc-100 pt-3">
          <p className="text-xs text-zinc-600">
            Conferma gli ingredienti da scalare dalla dispensa:
          </p>
          <ul className="space-y-2">
            {plan.map((row, i) => (
              <li
                key={i}
                className={`rounded-md border p-2 text-xs ${
                  row.pantryItemId
                    ? "border-zinc-200 bg-zinc-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-zinc-800">
                    {row.ingredientName}
                  </span>
                  {row.pantryItemId ? (
                    <label className="flex items-center gap-1 text-zinc-700">
                      <input
                        type="checkbox"
                        checked={row.include}
                        onChange={(e) =>
                          updatePlanRow(i, { include: e.target.checked })
                        }
                        className="h-3.5 w-3.5 accent-zinc-900"
                      />
                      Scala
                    </label>
                  ) : (
                    <span className="text-amber-700">non in dispensa</span>
                  )}
                </div>
                {row.pantryItemId && (
                  <div className="flex items-center gap-2 text-zinc-600">
                    <span>→ {row.pantryItemName}</span>
                    <span>({row.pantryQty} disp.)</span>
                    <span className="ml-auto flex items-center gap-1">
                      <span>scala di</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.decrementQty}
                        onChange={(e) =>
                          updatePlanRow(i, {
                            decrementQty: Number(e.target.value),
                          })
                        }
                        className="w-14 rounded border border-zinc-200 bg-white px-1 py-0.5"
                      />
                      <span>{row.unit}</span>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={submitting}
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={confirmCooked}
              disabled={submitting}
              className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {submitting ? "Salvataggio..." : "Conferma"}
            </button>
          </div>
        </div>
      )}

      {!confirming && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100"
          >
            {expanded ? "Nascondi" : "Dettagli"}
          </button>
          <button
            type="button"
            onClick={onSaveForLater}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100"
          >
            Salva per dopo
          </button>
          <button
            type="button"
            onClick={startCooked}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-white hover:bg-zinc-800"
          >
            Ho cucinato
          </button>
        </div>
      )}
    </article>
  );
}

// ---- Card ricetta salvata -------------------------------------------------

function SavedRecipeCard({ recipe }: { recipe: Recipe }) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-3">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            {recipe.title}
          </h3>
          <p className="text-xs text-zinc-500">
            {recipe.cooked
              ? `Cucinata · ${recipe.totalTimeMinutes}min · ${recipe.difficulty}`
              : `Salvata · ${recipe.totalTimeMinutes}min · ${recipe.difficulty}`}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
          >
            {expanded ? "—" : "+"}
          </button>
          {user && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Eliminare "${recipe.title}"?`)) {
                  deleteRecipe(user.uid, recipe.id);
                }
              }}
              className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
            >
              ✕
            </button>
          )}
          {user && !recipe.cooked && (
            <button
              type="button"
              onClick={() => setRecipeSaved(user.uid, recipe.id, !recipe.saved)}
              className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
            >
              {recipe.saved ? "Rimuovi" : "Pinna"}
            </button>
          )}
        </div>
      </header>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3 text-xs text-zinc-700">
          <p className="font-medium uppercase tracking-wide text-zinc-500">
            Ingredienti
          </p>
          <ul className="space-y-0.5">
            {recipe.ingredients.map((ing, i) => (
              <li key={i}>
                {ing.quantity} {ing.unit} · {ing.name}
              </li>
            ))}
          </ul>
          <p className="mt-2 font-medium uppercase tracking-wide text-zinc-500">
            Procedimento
          </p>
          <ol className="list-decimal space-y-1 pl-4">
            {recipe.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}
