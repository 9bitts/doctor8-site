import type { CategoriaPratica } from "@/lib/medicina-natural/item-types";
import type { PrescriptionItemKind } from "@/lib/prescription-item-kind";
import { db } from "@/lib/db";

const CATEGORIA_TO_ITEM_KIND: Record<CategoriaPratica, PrescriptionItemKind> = {
  FITOTERAPICO: "phytotherapy",
  FLORAL: "floral",
  HOMEOPATIA: "homeopathy",
  AROMATERAPIA: "aromatherapy",
  APITERAPIA: "apitherapy",
  CANNABIS: "cannabis",
};

export function itemKindFromMnCategoria(
  categoria: CategoriaPratica,
): PrescriptionItemKind {
  return CATEGORIA_TO_ITEM_KIND[categoria] || "phytotherapy";
}

function normalizeQuery(q: string): string {
  return q
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function resolveMnCatalogMatches(
  query: string,
  categoria?: CategoriaPratica,
  take = 3,
) {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];

  return db.medicinaNaturalItem.findMany({
    where: {
      active: true,
      ...(categoria ? { categoriaPratica: categoria } : {}),
      OR: [
        { searchText: { contains: q } },
        { nome: { contains: query.trim(), mode: "insensitive" } },
        { slug: { contains: q } },
      ],
    },
    select: {
      slug: true,
      nome: true,
      posologia: true,
      renisus: true,
      categoriaPratica: true,
    },
    orderBy: { nome: "asc" },
    take,
  });
}
