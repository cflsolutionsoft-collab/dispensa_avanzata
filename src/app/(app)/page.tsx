"use client";

// Home: stat hero animato, hero CTA scatto foto, dashboard scadenze, recent tray.

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Camera, ChevronRight, LogOut, Sparkles } from "lucide-react";

import ExpiringSoon from "@/components/features/ExpiringSoon";
import RecentUseTray from "@/components/features/RecentUseTray";
import { IconButton, StatHero } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { usePantry } from "@/hooks/usePantry";
import { getExpiryStatus } from "@/lib/expiry";

const MS_PER_DAY = 86_400_000;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Notte";
  if (h < 12) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

export default function HomePage() {
  const { user, signOut } = useAuth();
  const { items, loading } = usePantry(user?.uid);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const displayName =
    user?.displayName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "Utente";

  // Statistiche per la hero card
  const stats = useMemo(() => {
    const active = items.filter((i) => i.quantity > 0);
    let expiringSoon = 0;
    let expired = 0;
    for (const item of active) {
      if (!item.expiresAt) continue;
      const days = Math.ceil(
        (item.expiresAt.toMillis() - Date.now()) / MS_PER_DAY,
      );
      if (days < 0) expired++;
      else if (days <= 3) expiringSoon++;
    }
    return { active: active.length, expiringSoon, expired };
  }, [items]);

  const hintText =
    stats.expired > 0
      ? `${stats.expired} scaduti, attenzione`
      : stats.expiringSoon > 0
        ? `${stats.expiringSoon} in scadenza nei prossimi giorni`
        : stats.active > 0
          ? "Tutto sotto controllo"
          : "Aggiungi prodotti per iniziare";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-5 pb-8 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-forest-500">
            {getGreeting()}
          </p>
          <h1 className="mt-0.5 text-3xl font-semibold leading-tight text-forest-900">
            {displayName}
          </h1>
        </div>
        <IconButton
          icon={<LogOut className="h-5 w-5" />}
          label={signingOut ? "Disconnessione in corso" : "Esci"}
          onClick={handleSignOut}
          disabled={signingOut}
          variant="ghost"
        />
      </header>

      {!loading && (
        <StatHero
          kicker="In casa"
          value={stats.active}
          label={
            stats.active === 1
              ? "prodotto tracciato"
              : "prodotti tracciati"
          }
          hint={hintText}
          accent={
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-700/60">
              <Sparkles className="h-5 w-5 text-cream-50" />
            </div>
          }
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      >
        <Link
          href="/carico"
          className="group relative block overflow-hidden rounded-3xl border border-forest-100 bg-white p-5 shadow-soft transition-all hover:shadow-soft-md active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-forest-800 text-cream-50 transition-transform group-hover:rotate-6 group-hover:scale-105">
              <Camera className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-forest-500">
                Spesa appena fatta?
              </p>
              <p className="text-base font-semibold text-forest-900">
                Scatta le foto della spesa
              </p>
              <p className="text-xs text-forest-600">
                Claude le riconosce in 20 secondi
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-forest-400 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </motion.div>

      {user && <ExpiringSoon uid={user.uid} />}
      {user && <RecentUseTray uid={user.uid} />}
    </div>
  );
}
