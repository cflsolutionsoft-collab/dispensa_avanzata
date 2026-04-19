// Normalizzazione testo per matching robusto degli item della dispensa.
// Lowercase, rimozione accenti e collassamento spazi.

export function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // rimuove diacritici (à → a)
    .replace(/\s+/g, " ")
    .trim();
}
