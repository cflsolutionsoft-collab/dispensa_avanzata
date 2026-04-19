// Enum condivisi per categorie, unità di misura, priorità, ecc.

export const CATEGORIES = [
  "frutta_verdura",
  "carne_pesce",
  "latticini_uova",
  "pasta_riso_cereali",
  "pane_prodotti_da_forno",
  "bevande",
  "conserve_scatolame",
  "surgelati",
  "condimenti_spezie",
  "dolci_snack",
  "cura_casa",
  "cura_persona",
  "altro",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Etichette user-facing in italiano per le categorie
export const CATEGORY_LABELS: Record<Category, string> = {
  frutta_verdura: "Frutta e verdura",
  carne_pesce: "Carne e pesce",
  latticini_uova: "Latticini e uova",
  pasta_riso_cereali: "Pasta, riso e cereali",
  pane_prodotti_da_forno: "Pane e prodotti da forno",
  bevande: "Bevande",
  conserve_scatolame: "Conserve e scatolame",
  surgelati: "Surgelati",
  condimenti_spezie: "Condimenti e spezie",
  dolci_snack: "Dolci e snack",
  cura_casa: "Cura della casa",
  cura_persona: "Cura della persona",
  altro: "Altro",
};

export const UNITS = ["pz", "conf", "g", "kg", "ml", "l"] as const;
export type Unit = (typeof UNITS)[number];

export const PRIORITIES = ["alta", "media", "bassa"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const CONFIDENCES = ["alta", "media", "bassa"] as const;
export type Confidence = (typeof CONFIDENCES)[number];
