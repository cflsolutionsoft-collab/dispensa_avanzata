"use client";

// Shell con bottom-navigation su mobile e sidebar verticale su desktop.
// Voci: Home, Dispensa, Spesa, Ricette, Più (per Staples + Riconcilia).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ChefHat,
  Home,
  MoreHorizontal,
  Refrigerator,
  ShoppingBasket,
  ListChecks,
  RefreshCcw,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: <Home className="h-5 w-5" /> },
  {
    href: "/dispensa",
    label: "Dispensa",
    icon: <Refrigerator className="h-5 w-5" />,
  },
  {
    href: "/spesa",
    label: "Spesa",
    icon: <ShoppingBasket className="h-5 w-5" />,
  },
  { href: "/ricette", label: "Ricette", icon: <ChefHat className="h-5 w-5" /> },
];

const MORE_NAV: NavItem[] = [
  {
    href: "/staples",
    label: "Staples",
    icon: <ListChecks className="h-5 w-5" />,
  },
  {
    href: "/riconcilia",
    label: "Riconcilia",
    icon: <RefreshCcw className="h-5 w-5" />,
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Pagine in cui non vogliamo la nav (es. flussi pieno schermo)
  const hideNav = pathname.startsWith("/carico") || pathname.startsWith("/riconcilia");

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-forest-100 bg-cream-100/60 px-3 py-6 md:flex md:flex-col">
        <div className="mb-8 px-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-forest-500">
            Pantry AI
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          {[...PRIMARY_NAV, ...MORE_NAV].map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
            />
          ))}
        </nav>
      </aside>

      {/* Contenuto principale */}
      <main className="relative flex min-h-screen w-full flex-col">
        <div className={cn("flex-1", !hideNav && "pb-24 md:pb-0")}>
          {children}
        </div>

        {/* Bottom nav mobile */}
        {!hideNav && (
          <BottomNav
            pathname={pathname}
            onMore={() => setMoreOpen(true)}
            moreActive={MORE_NAV.some((i) => isActive(pathname, i.href))}
          />
        )}
      </main>

      {/* "More" sheet mobile */}
      {moreOpen && (
        <MoreSheet onClose={() => setMoreOpen(false)} pathname={pathname} />
      )}
    </div>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-forest-800 text-cream-50"
          : "text-forest-700 hover:bg-cream-200/60",
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

function BottomNav({
  pathname,
  onMore,
  moreActive,
}: {
  pathname: string;
  onMore: () => void;
  moreActive: boolean;
}) {
  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-forest-100 bg-cream-50/95 backdrop-blur md:hidden"
      role="navigation"
      aria-label="Navigazione principale"
    >
      <ul className="grid grid-cols-5 px-2 pt-1.5">
        {PRIMARY_NAV.map((item) => (
          <li key={item.href}>
            <BottomNavLink item={item} active={isActive(pathname, item.href)} />
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={onMore}
            className={cn(
              "flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors",
              moreActive ? "text-forest-800" : "text-forest-500 hover:text-forest-800",
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>Più</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

function BottomNavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors",
        active ? "text-forest-800" : "text-forest-500 hover:text-forest-800",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-lg p-1.5 transition-colors",
          active ? "bg-forest-100" : "",
        )}
      >
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

function MoreSheet({
  onClose,
  pathname,
}: {
  onClose: () => void;
  pathname: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-forest-900/40 md:hidden"
      onClick={onClose}
    >
      <div
        className="pb-safe w-full rounded-t-3xl bg-cream-50 px-4 pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-forest-900">Altre sezioni</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="rounded-lg p-1 text-forest-700 hover:bg-cream-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="space-y-1 pb-2">
          {MORE_NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                  isActive(pathname, item.href)
                    ? "bg-forest-800 text-cream-50"
                    : "bg-white text-forest-800 hover:bg-cream-100",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
