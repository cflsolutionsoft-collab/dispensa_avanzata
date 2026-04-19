"use client";

// Pagina Riconciliazione: scatti foto del frigo/dispensa, Claude le confronta
// con la dispensa registrata e propone aggiornamenti suddivisi in tre bucket:
// - alta confidence: applicabili in batch
// - media confidence: richiedono conferma
// - bassa confidence/non visibili: ignorati (mostrati solo come info)
// Inoltre lista oggetti riconosciuti ma non in dispensa.

import Link from "next/link";
import { useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { usePantry } from "@/hooks/usePantry";
import { reconcile } from "@/lib/api/client";
import {
  applyQuantityUpdates,
  touchLastSeen,
} from "@/lib/firestore/pantry";
import { normalizeName } from "@/lib/normalize";
import type {
  ReconciliationResult,
  ReconciliationVerificationItem,
} from "@/lib/validators/reconciliation";
import type { PantryItem } from "@/types";

type Phase = "idle" | "running" | "review" | "saving";

const MAX_PHOTOS = 5;

interface MatchedRow {
  ai: ReconciliationVerificationItem;
  pantry: PantryItem;
}

// Trova il PantryItem citato dall'AI (match esatto su name, fallback normalizzato)
function matchPantry(
  aiName: string,
  pantry: PantryItem[],
): PantryItem | null {
  const exact = pantry.find((p) => p.name === aiName);
  if (exact) return exact;
  const norm = normalizeName(aiName);
  return pantry.find((p) => p.normalizedName === norm) ?? null;
}

export default function RiconciliaPage() {
  const { user } = useAuth();
  const { items: pantry } = usePantry(user?.uid);

  const [phase, setPhase] = useState<Phase>("idle");
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  // checkbox state per il bucket "media confidence"
  const [mediumApprovals, setMediumApprovals] = useState<Map<string, boolean>>(
    new Map(),
  );

  const trackable = useMemo(
    () => pantry.filter((p) => p.trackingWorthy && p.quantity > 0),
    [pantry],
  );

  const previewUrls = useMemo(
    () => photos.map((p) => URL.createObjectURL(p)),
    [photos],
  );

  // Suddivide la verifica in 3 bucket
  const buckets = useMemo(() => {
    if (!result) return null;
    const matched: MatchedRow[] = [];
    const unmatched: ReconciliationVerificationItem[] = [];

    for (const ai of result.pantry_verification) {
      const m = matchPantry(ai.pantry_item_name, pantry);
      if (m) matched.push({ ai, pantry: m });
      else unmatched.push(ai);
    }

    const high = matched.filter(
      (r) => r.ai.confidence === "alta" && r.ai.estimated_state !== "not_visible",
    );
    const medium = matched.filter(
      (r) => r.ai.confidence === "media" && r.ai.estimated_state !== "not_visible",
    );
    const low = matched.filter(
      (r) =>
        r.ai.confidence === "bassa" ||
        r.ai.estimated_state === "not_visible",
    );
    return { high, medium, low, unmatched };
  }, [result, pantry]);

  const handleStart = async () => {
    if (!user || photos.length === 0) return;
    if (trackable.length === 0) {
      setError("Nessun item tracciabile in dispensa.");
      return;
    }
    setPhase("running");
    setError(null);
    try {
      const snapshot = trackable.map((p) => ({
        name: p.name,
        quantity: p.quantity,
        unit: p.unit,
        brand: p.brand,
      }));
      const { result } = await reconcile(user, photos, snapshot);
      setResult(result);
      // Default: tutte le voci media confidence pre-selezionate
      const init = new Map<string, boolean>();
      for (const v of result.pantry_verification) {
        if (v.confidence === "media" && v.estimated_state !== "not_visible") {
          init.set(v.pantry_item_name, true);
        }
      }
      setMediumApprovals(init);
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore riconciliazione");
      setPhase("idle");
    }
  };

  const handleApply = async () => {
    if (!user || !buckets) return;
    setPhase("saving");
    setError(null);

    try {
      const updates: Array<{ itemId: string; newQuantity: number }> = [];
      const seenOnly: string[] = [];

      // Alta confidence: applica sempre
      for (const r of buckets.high) {
        updates.push({
          itemId: r.pantry.id,
          newQuantity: r.ai.estimated_quantity,
        });
      }
      // Media confidence: solo se l'utente ha lasciato selezionato
      for (const r of buckets.medium) {
        if (mediumApprovals.get(r.ai.pantry_item_name)) {
          updates.push({
            itemId: r.pantry.id,
            newQuantity: r.ai.estimated_quantity,
          });
        } else {
          seenOnly.push(r.pantry.id);
        }
      }

      await applyQuantityUpdates(user.uid, updates);
      await touchLastSeen(user.uid, seenOnly);

      // Reset
      setResult(null);
      setMediumApprovals(new Map());
      setPhotos([]);
      setPhase("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore applicazione");
      setPhase("review");
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Riconciliazione
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Verifica con foto
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

      {(phase === "idle" || phase === "running") && (
        <section className="space-y-3">
          <p className="text-sm text-zinc-600">
            Scatta da 1 a {MAX_PHOTOS} foto del frigo/dispensa. Claude le
            confronterà con i {trackable.length} item tracciati e proporrà
            aggiornamenti.
          </p>
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={(e) => {
              if (!e.target.files) return;
              setPhotos(Array.from(e.target.files).slice(0, MAX_PHOTOS));
            }}
            disabled={phase === "running"}
            className="block w-full text-sm text-zinc-700 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
          />
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previewUrls.map((u, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={u}
                  src={u}
                  alt={`Foto ${i + 1}`}
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={handleStart}
            disabled={photos.length === 0 || phase === "running"}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {phase === "running" ? "Verifica in corso..." : "Riconcilia"}
          </button>
        </section>
      )}

      {phase === "review" && buckets && (
        <section className="space-y-5">
          {buckets.high.length > 0 && (
            <Bucket
              title="Applicati automaticamente"
              tone="emerald"
              description="Confidence alta: verranno aggiornati al click su Conferma."
            >
              {buckets.high.map((r) => (
                <Row
                  key={r.pantry.id}
                  pantryName={r.pantry.name}
                  oldQty={`${r.pantry.quantity} ${r.pantry.unit}`}
                  newQty={`${r.ai.estimated_quantity} ${r.pantry.unit}`}
                  reasoning={r.ai.reasoning}
                />
              ))}
            </Bucket>
          )}

          {buckets.medium.length > 0 && (
            <Bucket
              title="Conferma questi cambi"
              tone="amber"
              description="Confidence media: deseleziona quelli che non vuoi applicare."
            >
              {buckets.medium.map((r) => (
                <Row
                  key={r.pantry.id}
                  pantryName={r.pantry.name}
                  oldQty={`${r.pantry.quantity} ${r.pantry.unit}`}
                  newQty={`${r.ai.estimated_quantity} ${r.pantry.unit}`}
                  reasoning={r.ai.reasoning}
                  checkbox={{
                    checked:
                      mediumApprovals.get(r.ai.pantry_item_name) ?? false,
                    onChange: (checked) =>
                      setMediumApprovals((prev) => {
                        const next = new Map(prev);
                        next.set(r.ai.pantry_item_name, checked);
                        return next;
                      }),
                  }}
                />
              ))}
            </Bucket>
          )}

          {buckets.low.length > 0 && (
            <Bucket
              title="Ignorati"
              tone="zinc"
              description="Confidence bassa o non visibili nelle foto. Aggiorno solo lastSeenAt."
            >
              {buckets.low.map((r) => (
                <Row
                  key={r.pantry.id}
                  pantryName={r.pantry.name}
                  oldQty={`${r.pantry.quantity} ${r.pantry.unit}`}
                  newQty="—"
                  reasoning={r.ai.reasoning}
                />
              ))}
            </Bucket>
          )}

          {result && result.unknown_items.length > 0 && (
            <Bucket
              title="Oggetti non in lista"
              tone="zinc"
              description="Visti nelle foto ma non registrati. Per ora informativi."
            >
              <ul className="space-y-1 text-xs text-zinc-600">
                {result.unknown_items.map((u, i) => (
                  <li key={i}>
                    <span className="font-medium text-zinc-800">
                      {u.description}
                    </span>{" "}
                    · cat. suggerita: {u.suggested_category}
                  </li>
                ))}
              </ul>
            </Bucket>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setPhase("idle");
                setPhotos([]);
              }}
              className="flex-1 rounded-lg border border-zinc-200 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-[2] rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Conferma e applica
            </button>
          </div>
        </section>
      )}

      {phase === "saving" && (
        <p className="text-sm text-zinc-600">Aggiornamento in corso...</p>
      )}
    </main>
  );
}

// ---- Componenti UI riutilizzabili ----------------------------------------

function Bucket({
  title,
  tone,
  description,
  children,
}: {
  title: string;
  tone: "emerald" | "amber" | "zinc";
  description: string;
  children: React.ReactNode;
}) {
  const toneCls = {
    emerald: "border-emerald-200 bg-emerald-50",
    amber: "border-amber-200 bg-amber-50",
    zinc: "border-zinc-200 bg-zinc-50",
  }[tone];
  return (
    <section className={`space-y-2 rounded-xl border p-3 ${toneCls}`}>
      <div>
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        <p className="text-xs text-zinc-600">{description}</p>
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Row({
  pantryName,
  oldQty,
  newQty,
  reasoning,
  checkbox,
}: {
  pantryName: string;
  oldQty: string;
  newQty: string;
  reasoning: string;
  checkbox?: { checked: boolean; onChange: (v: boolean) => void };
}) {
  return (
    <div className="rounded-md bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-zinc-900">
          {pantryName}
        </p>
        {checkbox ? (
          <input
            type="checkbox"
            checked={checkbox.checked}
            onChange={(e) => checkbox.onChange(e.target.checked)}
            className="h-4 w-4 accent-zinc-900"
          />
        ) : (
          <span className="text-xs text-zinc-600">
            {oldQty} → {newQty}
          </span>
        )}
      </div>
      {checkbox && (
        <p className="text-xs text-zinc-600">
          {oldQty} → {newQty}
        </p>
      )}
      <p className="mt-0.5 text-xs italic text-zinc-500">{reasoning}</p>
    </div>
  );
}
