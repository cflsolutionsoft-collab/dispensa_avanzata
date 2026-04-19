// Mapping categoria → icona + classi colore.
// Centralizza l'identità visiva delle categorie alimentari per usarla
// ovunque (pill, chip, card, badge) in modo coerente.

import {
  Apple,
  Beef,
  Cookie,
  Croissant,
  CupSoda,
  Heart,
  Milk,
  Package,
  Salad,
  Snowflake,
  Soup,
  Sparkles,
  Wheat,
  type LucideIcon,
} from "lucide-react";

import type { Category } from "@/lib/enums";

export interface CategoryStyle {
  icon: LucideIcon;
  // Classi Tailwind: bordo, sfondo soft, accento testo, accento solid
  bg: string;
  border: string;
  text: string;
  accent: string; // colore "ricco" per icona/avatar
  // Tinta del bordo laterale sulle card pantry
  rail: string;
}

export const CATEGORY_STYLE: Record<Category, CategoryStyle> = {
  frutta_verdura: {
    icon: Apple,
    bg: "bg-lime-50",
    border: "border-lime-200",
    text: "text-lime-800",
    accent: "bg-lime-500 text-white",
    rail: "bg-lime-400",
  },
  carne_pesce: {
    icon: Beef,
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-800",
    accent: "bg-rose-500 text-white",
    rail: "bg-rose-400",
  },
  latticini_uova: {
    icon: Milk,
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-800",
    accent: "bg-sky-500 text-white",
    rail: "bg-sky-400",
  },
  pasta_riso_cereali: {
    icon: Wheat,
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    accent: "bg-amber-500 text-white",
    rail: "bg-amber-400",
  },
  pane_prodotti_da_forno: {
    icon: Croissant,
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-800",
    accent: "bg-orange-500 text-white",
    rail: "bg-orange-400",
  },
  bevande: {
    icon: CupSoda,
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    accent: "bg-blue-500 text-white",
    rail: "bg-blue-400",
  },
  conserve_scatolame: {
    icon: Soup,
    bg: "bg-stone-100",
    border: "border-stone-300",
    text: "text-stone-800",
    accent: "bg-stone-600 text-white",
    rail: "bg-stone-500",
  },
  surgelati: {
    icon: Snowflake,
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    text: "text-cyan-800",
    accent: "bg-cyan-500 text-white",
    rail: "bg-cyan-400",
  },
  condimenti_spezie: {
    icon: Salad,
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-800",
    accent: "bg-yellow-500 text-white",
    rail: "bg-yellow-400",
  },
  dolci_snack: {
    icon: Cookie,
    bg: "bg-pink-50",
    border: "border-pink-200",
    text: "text-pink-800",
    accent: "bg-pink-500 text-white",
    rail: "bg-pink-400",
  },
  cura_casa: {
    icon: Sparkles,
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-800",
    accent: "bg-indigo-500 text-white",
    rail: "bg-indigo-400",
  },
  cura_persona: {
    icon: Heart,
    bg: "bg-fuchsia-50",
    border: "border-fuchsia-200",
    text: "text-fuchsia-800",
    accent: "bg-fuchsia-500 text-white",
    rail: "bg-fuchsia-400",
  },
  altro: {
    icon: Package,
    bg: "bg-cream-100",
    border: "border-forest-100",
    text: "text-forest-700",
    accent: "bg-forest-600 text-cream-50",
    rail: "bg-forest-300",
  },
};
