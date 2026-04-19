"use client";

// Pagina di carico spesa con flusso progressivo a 4 fasi:
// 1. capture: l'utente accumula foto (scatto o galleria) finché non clicca Invia
// 2. recognizing: chiamata a /api/recognize-load con animazione di analisi
// 3. review: lista item editabili con checkbox includi/escludi e categoria iconata
// 4. saving: scrittura su Firestore (pantry + photoSession)

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { recognizeLoad } from "@/lib/api/client";
import { mergeDetectedItem } from "@/lib/firestore/pantry";
import {
  attachConfirmedItemIds,
  createConfirmedPhotoSession,
} from "@/lib/firestore/photoSessions";
import { CATEGORY_STYLE } from "@/lib/categoryStyle";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  UNITS,
  type Category,
  type Unit,
} from "@/lib/enums";
import {
  AnimatedNumber,
  Badge,
  Button,
  Field,
  Input,
  Select,
  type BadgeTone,
} from "@/components/ui";
import type { Confidence } from "@/lib/enums";
import type {
  DetectedItem,
  LoadRecognitionResult,
  TokenUsage,
} from "@/types";

type Phase = "capture" | "recognizing" | "review" | "saving";

interface ReviewItem extends DetectedItem {
  uiId: string;
  include: boolean;
}

interface CapturedPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

const MAX_PHOTOS = 8;

const CONFIDENCE_TONE: Record<Confidence, BadgeTone> = {
  alta: "success",
  media: "warning",
  bassa: "danger",
};

function makeReviewItems(detected: DetectedItem[]): ReviewItem[] {
  return detected.map((d, i) => ({
    ...d,
    uiId: `${i}-${d.name}-${Math.random().toString(36).slice(2, 7)}`,
    include: true,
  }));
}

export default function CaricoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  // Due input separati: scatto vs galleria. Riferimenti per click programmatico.
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("capture");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [recognitionResult, setRecognitionResult] =
    useState<LoadRecognitionResult | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);

  // Cleanup degli object URL quando la pagina viene smontata
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slotsLeft = MAX_PHOTOS - photos.length;
  const canAddMore = slotsLeft > 0;

  const appendFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList).slice(0, slotsLeft);
    const next: CapturedPhoto[] = incoming.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...next]);
    setError(null);
    if (incoming.length < fileList.length) {
      toast.show(`Massimo ${MAX_PHOTOS} foto`, "info");
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const clearAll = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
  };

  const handleRecognize = async () => {
    if (!user || photos.length === 0) return;
    setError(null);
    setPhase("recognizing");
    try {
      const { result, tokenUsage } = await recognizeLoad(
        user,
        photos.map((p) => p.file),
      );
      if (result.session_items.length === 0) {
        setError("Nessun prodotto riconosciuto. Riprova con foto più chiare.");
        setPhase("capture");
        return;
      }
      setRecognitionResult(result);
      setTokenUsage(tokenUsage);
      setReviewItems(makeReviewItems(result.session_items));
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
      setPhase("capture");
    }
  };

  const updateItem = (uiId: string, patch: Partial<ReviewItem>) => {
    setReviewItems((items) =>
      items.map((it) => (it.uiId === uiId ? { ...it, ...patch } : it)),
    );
  };

  const includedCount = useMemo(
    () => reviewItems.filter((i) => i.include).length,
    [reviewItems],
  );

  const handleConfirm = async () => {
    if (!user || !recognitionResult || !tokenUsage) return;
    const toSave = reviewItems.filter((it) => it.include);
    if (toSave.length === 0) {
      setError("Seleziona almeno un prodotto da salvare.");
      return;
    }

    setError(null);
    setPhase("saving");
    try {
      const sessionId = await createConfirmedPhotoSession({
        uid: user.uid,
        type: "load",
        photoCount: photos.length,
        rawDetection: recognitionResult,
        confirmedItemIds: [],
        tokenUsage,
      });

      const itemIds: string[] = [];
      for (const it of toSave) {
        const id = await mergeDetectedItem(
          user.uid,
          {
            name: it.name,
            brand: it.brand,
            category: it.category,
            quantity: it.quantity,
            unit: it.unit,
            size: it.size,
            estimatedExpiryDays: it.estimatedExpiryDays,
            trackingWorthy: it.trackingWorthy,
            confidence: it.confidence,
            photoIndex: it.photoIndex,
          },
          sessionId,
        );
        itemIds.push(id);
      }

      await attachConfirmedItemIds(user.uid, sessionId, itemIds);
      toast.show(
        `${toSave.length} ${toSave.length === 1 ? "prodotto aggiunto" : "prodotti aggiunti"}`,
        "success",
      );
      router.push("/dispensa");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio");
      setPhase("review");
    }
  };

  const handleDiscard = () => {
    clearAll();
    setReviewItems([]);
    setRecognitionResult(null);
    setTokenUsage(null);
    setError(null);
    setPhase("capture");
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Input nascosti, attivati via ref */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          appendFiles(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          appendFiles(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-forest-100 bg-cream-50/95 px-5 py-4 backdrop-blur">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-1 text-sm font-medium text-forest-700 hover:text-forest-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </button>
        <p className="text-xs font-semibold uppercase tracking-wider text-forest-500">
          Carico spesa
        </p>
        <div className="w-14" />
      </header>

      {error && (
        <div className="mx-5 mt-3">
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </p>
        </div>
      )}

      {/* === FASE CAPTURE === */}
      {phase === "capture" && (
        <CaptureView
          photos={photos}
          slotsLeft={slotsLeft}
          canAddMore={canAddMore}
          onCamera={() => cameraInputRef.current?.click()}
          onGallery={() => galleryInputRef.current?.click()}
          onRemove={removePhoto}
          onClear={clearAll}
          onSubmit={handleRecognize}
        />
      )}

      {/* === FASE RECOGNIZING === */}
      {phase === "recognizing" && <RecognizingView />}

      {/* === FASE REVIEW === */}
      {phase === "review" && (
        <ReviewView
          items={reviewItems}
          includedCount={includedCount}
          tokenUsage={tokenUsage}
          unclear={recognitionResult?.unclear ?? []}
          onUpdate={updateItem}
          onDiscard={handleDiscard}
          onConfirm={handleConfirm}
        />
      )}

      {/* === FASE SAVING === */}
      {phase === "saving" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-800 text-cream-50">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <p className="text-sm font-medium text-forest-700">
            Salvataggio in dispensa...
          </p>
        </div>
      )}
    </div>
  );
}

// === CAPTURE VIEW ==========================================================

interface CaptureViewProps {
  photos: CapturedPhoto[];
  slotsLeft: number;
  canAddMore: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSubmit: () => void;
}

function CaptureView({
  photos,
  slotsLeft,
  canAddMore,
  onCamera,
  onGallery,
  onRemove,
  onClear,
  onSubmit,
}: CaptureViewProps) {
  const isEmpty = photos.length === 0;

  return (
    <>
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-5 pt-5 pb-32">
        {/* Hero card */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-800 via-forest-800 to-forest-700 p-5 text-cream-50 shadow-soft-md"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-forest-500/40 blur-2xl"
          />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-forest-700/60 text-cream-50">
              <Camera className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-forest-200">
                Foto progressive
              </p>
              <p className="text-base font-semibold">
                Scatta una foto per ogni gruppo
              </p>
              <p className="text-xs text-forest-200">
                Frigo, dispensa, congelatore... aggiungile una alla volta. Quando
                hai finito, premi Invia.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Counter + clear */}
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-medium text-forest-700">
            <AnimatedNumber value={photos.length} />{" "}
            <span className="text-forest-500">/ {MAX_PHOTOS} foto</span>
          </p>
          {!isEmpty && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 text-xs font-medium text-forest-500 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Svuota
            </button>
          )}
        </div>

        {/* Empty state o griglia foto */}
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-forest-200 bg-white/50 px-6 py-12 text-center"
          >
            <div className="animate-float-soft flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-100 text-forest-600">
              <ImagePlus className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold text-forest-900">
              Inizia con la prima foto
            </p>
            <p className="max-w-xs text-xs text-forest-600">
              Tap su <strong>Scatta foto</strong> per la fotocamera, o{" "}
              <strong>Galleria</strong> per scegliere immagini esistenti.
            </p>
          </motion.div>
        ) : (
          <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            <AnimatePresence>
              {photos.map((p, i) => (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.2 }}
                  className="relative aspect-square overflow-hidden rounded-2xl border border-forest-100 bg-white shadow-soft-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.previewUrl}
                    alt={`Foto ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-forest-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-cream-50">
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(p.id)}
                    aria-label="Rimuovi foto"
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-forest-900/80 text-cream-50 backdrop-blur transition-all hover:bg-red-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.li>
              ))}
              {canAddMore && (
                <motion.li
                  key="add-tile"
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="aspect-square"
                >
                  <button
                    type="button"
                    onClick={onCamera}
                    className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-forest-200 bg-white/60 text-forest-500 transition-all hover:border-forest-400 hover:bg-cream-100 hover:text-forest-800"
                  >
                    <Plus className="h-6 w-6" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      Aggiungi
                    </span>
                  </button>
                </motion.li>
              )}
            </AnimatePresence>
          </ul>
        )}

        {/* Pulsanti capture (sempre visibili nel flusso) */}
        <div className="grid grid-cols-2 gap-2.5 px-1">
          <Button
            variant="primary"
            size="lg"
            onClick={onCamera}
            disabled={!canAddMore}
            iconLeft={<Camera className="h-5 w-5" />}
          >
            Scatta foto
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={onGallery}
            disabled={!canAddMore}
            iconLeft={<ImagePlus className="h-5 w-5" />}
          >
            Galleria
          </Button>
        </div>

        {!canAddMore && (
          <p className="px-1 text-center text-xs text-forest-500">
            Hai raggiunto il massimo di {MAX_PHOTOS} foto. Rimuovine alcune per
            aggiungerne altre.
          </p>
        )}
      </div>

      {/* Bottone Invia sticky in fondo */}
      <AnimatePresence>
        {!isEmpty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-forest-100 bg-cream-50/95 px-5 py-3 backdrop-blur md:left-56"
          >
            <div className="mx-auto w-full max-w-2xl">
              <Button
                fullWidth
                size="lg"
                onClick={onSubmit}
                iconLeft={<Send className="h-5 w-5" />}
              >
                Invia {photos.length}{" "}
                {photos.length === 1 ? "foto" : "foto"} a Claude
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// === RECOGNIZING VIEW ======================================================

function RecognizingView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5 py-10">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring" }}
        className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-forest-700 to-forest-800 shadow-soft-md"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="h-9 w-9 text-cream-50" />
        </motion.div>
      </motion.div>
      <div className="space-y-1 text-center">
        <p className="text-base font-semibold text-forest-900">
          Claude sta analizzando
        </p>
        <p className="text-xs text-forest-600">
          15-30 secondi a seconda del numero di foto
        </p>
      </div>
    </div>
  );
}

// === REVIEW VIEW ===========================================================

interface ReviewViewProps {
  items: ReviewItem[];
  includedCount: number;
  tokenUsage: TokenUsage | null;
  unclear: string[];
  onUpdate: (uiId: string, patch: Partial<ReviewItem>) => void;
  onDiscard: () => void;
  onConfirm: () => void;
}

function ReviewView({
  items,
  includedCount,
  tokenUsage,
  unclear,
  onUpdate,
  onDiscard,
  onConfirm,
}: ReviewViewProps) {
  return (
    <>
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-5 pt-5 pb-32">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-forest-500">
              Conferma
            </p>
            <h1 className="mt-0.5 text-2xl font-semibold text-forest-900">
              <AnimatedNumber value={includedCount} /> di {items.length} prodotti
            </h1>
            <p className="text-xs text-forest-600">
              Deseleziona quelli sbagliati o modifica i dettagli
            </p>
          </div>
          {tokenUsage && (
            <Badge tone="muted">
              ${tokenUsage.costUSD.toFixed(4)}
            </Badge>
          )}
        </div>

        <ul className="space-y-2.5">
          <AnimatePresence>
            {items.map((it, i) => (
              <motion.li
                key={it.uiId}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: 0.04 * i, duration: 0.25 }}
              >
                <ReviewItemCard
                  item={it}
                  onChange={(patch) => onUpdate(it.uiId, patch)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {unclear.length > 0 && (
          <div className="rounded-2xl border border-ember-200 bg-ember-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ember-700">
              Oggetti non identificati
            </p>
            <ul className="mt-1.5 space-y-0.5 text-xs text-ember-800">
              {unclear.map((u, i) => (
                <li key={i}>• {u}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Sticky footer azioni */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-forest-100 bg-cream-50/95 px-5 py-3 backdrop-blur md:left-56">
        <div className="mx-auto flex w-full max-w-2xl gap-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={onDiscard}
            className="flex-1"
          >
            Scarta
          </Button>
          <Button
            size="lg"
            onClick={onConfirm}
            className="flex-[2]"
            iconLeft={<Plus className="h-5 w-5" />}
          >
            Aggiungi {includedCount}
          </Button>
        </div>
      </div>
    </>
  );
}

// === REVIEW ITEM CARD ======================================================

function ReviewItemCard({
  item,
  onChange,
}: {
  item: ReviewItem;
  onChange: (patch: Partial<ReviewItem>) => void;
}) {
  const style = CATEGORY_STYLE[item.category];
  const Icon = style.icon;

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white shadow-soft-sm transition-opacity ${
        item.include ? "border-forest-100" : "border-forest-100 opacity-50"
      }`}
    >
      <div
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${style.rail}`}
      />

      <div className="space-y-3 p-3 pl-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => onChange({ include: !item.include })}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
              item.include
                ? `${style.accent} shadow-soft-sm`
                : "bg-cream-100 text-forest-400"
            }`}
            aria-label={item.include ? "Escludi" : "Includi"}
          >
            <Icon className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <Input
              value={item.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="font-semibold"
            />
            <Input
              value={item.brand ?? ""}
              onChange={(e) =>
                onChange({ brand: e.target.value.trim() || null })
              }
              placeholder="Brand (opzionale)"
              className="mt-1.5 text-xs"
            />
          </div>

          <Badge tone={CONFIDENCE_TONE[item.confidence]}>{item.confidence}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Categoria">
            <Select
              value={item.category}
              onChange={(e) =>
                onChange({ category: e.target.value as Category })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Unità">
            <Select
              value={item.unit}
              onChange={(e) => onChange({ unit: e.target.value as Unit })}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quantità">
            <Input
              type="number"
              min="0"
              step="0.5"
              value={item.quantity}
              onChange={(e) => onChange({ quantity: Number(e.target.value) })}
            />
          </Field>
          <Field label="Scade in (giorni)">
            <Input
              type="number"
              min="0"
              value={item.estimatedExpiryDays ?? ""}
              onChange={(e) =>
                onChange({
                  estimatedExpiryDays:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="—"
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-forest-700">
          <input
            type="checkbox"
            checked={item.trackingWorthy}
            onChange={(e) => onChange({ trackingWorthy: e.target.checked })}
            className="h-4 w-4 accent-forest-700"
          />
          Tracciare scadenza
        </label>
      </div>
    </article>
  );
}
