import type { DrugCatalog, DrugLeaflet } from "@prisma/client";
import { anvisaBularioSearchUrl } from "./anvisa-links";
import { leafletSectionTitle } from "./section-titles";
import type { DrugLeafletPayload, DrugLeafletSection, DrugLeafletSectionKey } from "./types";

type DrugRow = Pick<
  DrugCatalog,
  | "name"
  | "activeIngredient"
  | "presentation"
  | "manufacturer"
  | "pharmaceuticalForm"
  | "dosage"
  | "ggremCode"
  | "category"
  | "country"
>;

function parseStoredSections(raw: unknown): DrugLeafletSection[] {
  if (!Array.isArray(raw)) return [];
  const out: DrugLeafletSection[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const key = o.key as DrugLeafletSectionKey;
    const content = typeof o.content === "string" ? o.content.trim() : "";
    if (!key || !content) continue;
    out.push({
      key,
      title: typeof o.title === "string" ? o.title : leafletSectionTitle(key),
      content,
      defaultOpen: o.defaultOpen === true || key === "posologia",
    });
  }
  return out;
}

function productIdentification(drug: DrugRow): string {
  return [
    `Nome comercial: ${drug.name}`,
    `Princípio ativo: ${drug.activeIngredient}`,
    drug.presentation ? `Apresentação: ${drug.presentation}` : null,
    drug.pharmaceuticalForm ? `Forma farmacêutica: ${drug.pharmaceuticalForm}` : null,
    drug.dosage ? `Concentração: ${drug.dosage}` : null,
    drug.manufacturer ? `Fabricante: ${drug.manufacturer}` : null,
    drug.ggremCode ? `GGREM: ${drug.ggremCode}` : null,
    drug.category ? `Categoria: ${drug.category}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildIndexedDrugLeaflet(
  drug: DrugRow,
  indexed: Pick<
    DrugLeaflet,
    "sections" | "posologyExcerpt" | "externalUrl" | "pdfUrl" | "source" | "activeIngredient"
  >,
): DrugLeafletPayload {
  const stored = parseStoredSections(indexed.sections);
  const identContent = productIdentification(drug);

  const sections: DrugLeafletSection[] = [];
  const identIdx = stored.findIndex((s) => s.key === "identificacao");
  if (identIdx >= 0) {
    sections.push({
      ...stored[identIdx],
      content: `${identContent}\n\n${stored[identIdx].content}`.trim(),
      defaultOpen: false,
    });
  } else {
    sections.push({
      key: "identificacao",
      title: leafletSectionTitle("identificacao"),
      content: identContent,
      defaultOpen: false,
    });
  }

  for (const s of stored) {
    if (s.key === "identificacao") continue;
    sections.push(s);
  }

  const searchName = drug.activeIngredient?.trim() || drug.name;
  const externalUrl =
    indexed.externalUrl ||
    indexed.pdfUrl ||
    anvisaBularioSearchUrl(searchName);

  return {
    title: drug.name,
    subtitle: drug.activeIngredient,
    source: "anvisa",
    externalUrl,
    sections,
    posologyExcerpt: indexed.posologyExcerpt?.trim() || undefined,
  };
}
