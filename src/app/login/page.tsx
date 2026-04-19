"use client";

// Pagina di login. Pubblica: chi è già autenticato viene rispedito alla home.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Refrigerator } from "lucide-react";

import { Button } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  const handleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'accesso");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-50 px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-800 text-cream-50 shadow-soft-md">
            <Refrigerator className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-forest-900">
              Pantry AI
            </h1>
            <p className="mt-1 text-sm text-forest-600">
              Gestisci la dispensa con l&apos;aiuto dell&apos;AI
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-forest-100 bg-white p-6 shadow-soft-md">
          <Button
            fullWidth
            size="lg"
            onClick={handleSignIn}
            loading={submitting}
            disabled={loading}
          >
            {submitting ? "Accesso in corso..." : "Accedi con Google"}
          </Button>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
