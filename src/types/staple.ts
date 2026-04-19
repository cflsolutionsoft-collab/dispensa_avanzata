// Tipo Staple: bene di prima necessità che l'utente vuole sempre avere.
// Schema documento: users/{uid}/staples/{stapleId}

import type { Timestamp } from "firebase/firestore";
import type { Category, Priority, Unit } from "@/lib/enums";

export interface Staple {
  id: string;
  name: string;
  normalizedName: string;
  category: Category;
  minQuantity: number; // sotto questa soglia → entra in shopping list
  unit: Unit;
  typicalBrand: string | null;
  // Popolato dopo qualche settimana di consumo storico, per predizione
  avgDaysPerUnit: number | null;
  priority: Priority;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type NewStaple = Omit<Staple, "id" | "createdAt" | "updatedAt">;
