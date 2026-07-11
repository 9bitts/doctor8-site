import type { CategoriaPraticaMedicinaNatural, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizeSearchText } from "@/lib/medicina-natural/search-text";

export const MN_LIST_SELECT = {
  slug: true,
  nome: true,
  nomeCientifico: true,
  nomesAlternativos: true,
  categoriaPratica: true,
  statusRegulatorio: true,
  renisus: true,
  alertaGestacaoPediatria: true,
  posologia: true,
  indicacoes: true,
} as const;

export type MedicinaNaturalListItem = Prisma.MedicinaNaturalItemGetPayload<{
  select: typeof MN_LIST_SELECT;
}>;

export async function searchMedicinaNaturalItems(params: {
  q?: string;
  categoria?: CategoriaPraticaMedicinaNatural;
  renisus?: boolean;
  take?: number;
}): Promise<MedicinaNaturalListItem[]> {
  const take = Math.min(params.take ?? 20, 100);
  const where: Prisma.MedicinaNaturalItemWhereInput = { active: true };

  if (params.categoria) where.categoriaPratica = params.categoria;
  if (params.renisus) where.renisus = true;

  const q = params.q?.trim();
  if (q && q.length >= 2) {
    where.searchText = { contains: normalizeSearchText([q]) };
  }

  return db.medicinaNaturalItem.findMany({
    where,
    select: MN_LIST_SELECT,
    orderBy: [{ nome: "asc" }],
    take: q && q.length >= 2 ? take : Math.min(take, 100),
  });
}

export async function getMedicinaNaturalItemBySlug(slug: string) {
  return db.medicinaNaturalItem.findFirst({
    where: { slug, active: true },
  });
}

export async function countMedicinaNaturalItems(
  categoria: CategoriaPraticaMedicinaNatural,
): Promise<number> {
  return db.medicinaNaturalItem.count({
    where: { active: true, categoriaPratica: categoria },
  });
}
