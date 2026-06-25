import { findBestReferenceMatch } from "@/lib/medicamentos-api-br/client";
import { isPharmacyReferenceEnabled } from "./config";
import type { PharmacyDrugRef, PharmacyReferencePrice } from "./types";

export async function getCmedReferencePrice(
  drug: PharmacyDrugRef
): Promise<PharmacyReferencePrice | null> {
  if (!isPharmacyReferenceEnabled()) return null;

  const ingredient = drug.activeIngredient?.trim() || drug.name.trim();
  if (!ingredient) return null;

  const match = await findBestReferenceMatch({
    name: drug.name,
    activeIngredient: ingredient,
  });

  if (!match) return null;

  return {
    priceCents: match.priceCents,
    priceType: match.priceType,
    source: match.source,
    sourceUrl: match.sourceUrl,
    cmedTableLabel: match.cmedTableLabel,
    matchedName: match.name,
    isRegulatedReference: true,
  };
}
