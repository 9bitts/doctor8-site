import { db } from "@/lib/db";
import { buildCatalogDrugLeaflet } from "./build-catalog-leaflet";
import { buildIndexedDrugLeaflet } from "./build-indexed-leaflet";
import { buildMnDrugLeaflet } from "./build-mn-leaflet";
import { normalizeActiveIngredientKey } from "./normalize-ingredient";
import type { DrugLeafletPayload } from "./types";

const DRUG_SELECT = {
  name: true,
  activeIngredient: true,
  presentation: true,
  manufacturer: true,
  pharmaceuticalForm: true,
  dosage: true,
  ggremCode: true,
  category: true,
  controlled: true,
  prescriptionType: true,
  country: true,
} as const;

export async function resolveDrugLeafletByDrugId(
  drugId: string,
): Promise<DrugLeafletPayload | null> {
  const drug = await db.drugCatalog.findFirst({
    where: { id: drugId, active: true },
    select: DRUG_SELECT,
  });
  if (!drug) return null;

  const ingredientKey = normalizeActiveIngredientKey(drug.activeIngredient || drug.name);

  let indexed = drug.ggremCode
    ? await db.drugLeaflet.findFirst({
        where: { ggremCode: drug.ggremCode, active: true },
      })
    : null;

  if (!indexed && ingredientKey) {
    indexed = await db.drugLeaflet.findFirst({
      where: {
        country: drug.country,
        activeIngredientKey: ingredientKey,
        active: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (indexed) {
    return buildIndexedDrugLeaflet(drug, indexed);
  }

  return buildCatalogDrugLeaflet(drug);
}

export async function resolveDrugLeafletByMnSlug(
  slug: string,
): Promise<DrugLeafletPayload | null> {
  const item = await db.medicinaNaturalItem.findFirst({
    where: { slug, active: true },
  });
  if (!item) return null;
  return buildMnDrugLeaflet(item);
}
