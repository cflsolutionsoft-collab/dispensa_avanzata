"use client";

// Wrapper di protezione: mostra uno stato di caricamento finché Firebase
// risolve lo stato auth, redirige a /login se l'utente non è autenticato,
// altrimenti renderizza i children.

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Caricamento...</p>
      </div>
    );
  }

  // In attesa del redirect: evita di renderizzare children se non autenticato
  if (!user) return null;

  return <>{children}</>;
}
