import { getMedicinaNaturalItemBySlug } from "@/lib/medicina-natural-catalog/search-server";
import type { InteractionResult } from "./interaction-engine";
import type { PrescriptionMedicationLine } from "./prescription-medication-lines";

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** MN catalog interaction hints (free text) vs other medication names on the same Rx. */
export async function checkMnCatalogInteractions(
  medications: PrescriptionMedicationLine[],
): Promise<InteractionResult[]> {
  const others = medications
    .map((m) => m.name.trim())
    .filter(Boolean);
  if (others.length < 2) return [];

  const found: InteractionResult[] = [];
  const seen = new Set<string>();

  for (const med of medications) {
    if (!med.mnSlug) continue;
    const item = await getMedicinaNaturalItemBySlug(med.mnSlug);
    const hint = item?.interacoesMedicamentosas?.trim();
    if (!hint) continue;

    const hintLower = hint.toLowerCase();
    for (const other of others) {
      if (normalizeName(other) === normalizeName(med.name)) continue;
      const otherLower = other.toLowerCase();
      if (!hintLower.includes(otherLower) && !otherLower.includes(normalizeName(med.name))) {
        continue;
      }
      const key = [med.name, other, hint].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({
        drugA: med.name,
        drugB: other,
        severity: "MODERATE",
        description: hint.slice(0, 500),
      });
    }
  }

  return found;
}
