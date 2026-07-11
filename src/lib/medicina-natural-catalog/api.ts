import type { MedicinaNaturalListItem } from "./search-server";
import type { MedicinaNaturalCatalogPortal } from "./portal-config";
import { mnCatalogApiBase } from "./portal-config";
import type { CategoriaPratica } from "@/lib/medicina-natural/item-types";

export type MedicinaNaturalDetailItem = MedicinaNaturalListItem & {
  contraindicacoes: string;
  precaucoes: string;
  interacoesMedicamentosas: string | null;
  viaAdministracao: string[];
  fontes: unknown;
  detalhesEspecificos: unknown;
  searchText: string;
};

export async function fetchMedicinaNaturalSearch(
  portal: MedicinaNaturalCatalogPortal,
  params: { q?: string; categoria?: CategoriaPratica; renisus?: boolean; take?: number },
): Promise<MedicinaNaturalListItem[]> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.categoria) sp.set("categoria", params.categoria);
  if (params.renisus) sp.set("renisus", "1");
  if (params.take) sp.set("take", String(params.take));

  const res = await fetch(`${mnCatalogApiBase(portal)}/search?${sp}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}

export async function fetchMedicinaNaturalBySlug(
  portal: MedicinaNaturalCatalogPortal,
  slug: string,
): Promise<MedicinaNaturalDetailItem | null> {
  const res = await fetch(`${mnCatalogApiBase(portal)}/${encodeURIComponent(slug)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.item ?? null;
}

export async function fetchMedicinaNaturalCount(
  portal: MedicinaNaturalCatalogPortal,
  categoria: CategoriaPratica,
): Promise<number> {
  const res = await fetch(
    `${mnCatalogApiBase(portal)}/search?categoria=${categoria}&take=1`,
  );
  if (!res.ok) return 0;
  const data = await res.json();
  return data.total ?? 0;
}
