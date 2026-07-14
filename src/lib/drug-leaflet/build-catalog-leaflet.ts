import type { DrugCatalog } from "@prisma/client";
import { anvisaBularioSearchUrl } from "./anvisa-links";
import { leafletSectionTitle } from "./section-titles";
import type { DrugLeafletPayload, DrugLeafletSection } from "./types";

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
  | "controlled"
  | "prescriptionType"
  | "country"
>;

export function buildCatalogDrugLeaflet(drug: DrugRow): DrugLeafletPayload {
  const searchName = drug.activeIngredient?.trim() || drug.name;
  const externalUrl = anvisaBularioSearchUrl(searchName);

  const identLines = [
    `Nome comercial: ${drug.name}`,
    `Princípio ativo: ${drug.activeIngredient}`,
    drug.presentation ? `Apresentação: ${drug.presentation}` : null,
    drug.pharmaceuticalForm ? `Forma farmacêutica: ${drug.pharmaceuticalForm}` : null,
    drug.dosage ? `Concentração: ${drug.dosage}` : null,
    drug.manufacturer ? `Fabricante: ${drug.manufacturer}` : null,
    drug.ggremCode ? `GGREM: ${drug.ggremCode}` : null,
    drug.category ? `Categoria: ${drug.category}` : null,
  ].filter(Boolean);

  const sections: DrugLeafletSection[] = [
    {
      key: "identificacao",
      title: leafletSectionTitle("identificacao"),
      content: identLines.join("\n"),
      defaultOpen: true,
    },
    {
      key: "referencia",
      title: leafletSectionTitle("referencia"),
      content:
        "A bula profissional completa (indicações, contraindicações, posologia e demais seções) está disponível no Bulário Eletrônico da ANVISA. Use o link abaixo para consultar o documento oficial vigente.",
    },
  ];

  return {
    title: drug.name,
    subtitle: drug.activeIngredient,
    source: drug.country === "BR" ? "anvisa" : "catalog",
    externalUrl,
    sections,
  };
}
