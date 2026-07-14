import {
  formatCannabisComposition,
  parseDetalhesCannabis,
} from "@/lib/medicina-natural/cannabis-display";
import type { PrescriptionItemKind } from "@/lib/prescription-item-kind";
import { getMedicinaNaturalItemBySlug } from "./search-server";

export type PdfMedicationInput = {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
  presentation?: string;
  pharmaceuticalForm?: string;
  mnSlug?: string;
  renisus?: boolean;
  regulatoryBadge?: string;
  itemKind?: PrescriptionItemKind;
};

const STATUS_LABEL_PT: Record<string, string> = {
  MEDICAMENTO_REGISTRADO: "Medicamento registrado",
  PRODUTO_TRADICIONAL_NOTIFICADO: "Produto tradicional (PTF)",
  USO_TRADICIONAL_SEM_REGISTRO: "Uso tradicional",
  PRATICA_INTEGRATIVA_NAO_REGULADA: "Pratica integrativa",
  PRODUTO_AUTORIZADO_ANVISA: "Produto autorizado Anvisa",
};

const CANNABIS_FOOTER: Record<"pt" | "en" | "es", Record<"A" | "B" | "mixed", string>> = {
  pt: {
    A: "Produto a base de Cannabis — RDC 327/2019. Venda sob prescricao, receituario tipo A.",
    B: "Produto a base de Cannabis — RDC 327/2019. Venda sob prescricao, receituario tipo B.",
    mixed: "Produto a base de Cannabis — RDC 327/2019. Venda sob prescricao; ver tipo de receituario por item.",
  },
  en: {
    A: "Cannabis-based product — RDC 327/2019. Prescription required; Type A prescription form.",
    B: "Cannabis-based product — RDC 327/2019. Prescription required; Type B prescription form.",
    mixed: "Cannabis-based product — RDC 327/2019. Prescription required; see item prescription type.",
  },
  es: {
    A: "Producto a base de Cannabis — RDC 327/2019. Venta bajo prescripcion, receta tipo A.",
    B: "Producto a base de Cannabis — RDC 327/2019. Venta bajo prescripcion, receta tipo B.",
    mixed: "Producto a base de Cannabis — RDC 327/2019. Venta bajo prescripcion; ver tipo de receta por item.",
  },
};

export function cannabisPdfComplianceLine(
  meds: PdfMedicationInput[],
  lang: "pt" | "en" | "es" = "pt",
): string | null {
  const cannabis = meds.filter((m) => m.itemKind === "cannabis");
  if (cannabis.length === 0) return null;
  const types = new Set<"A" | "B">();
  for (const med of cannabis) {
    const badge = med.regulatoryBadge || "";
    if (/receituario tipo A|tipo A|Type A|receta tipo A/i.test(badge)) types.add("A");
    else types.add("B");
  }
  const key = types.size > 1 ? "mixed" : types.has("A") ? "A" : "B";
  return CANNABIS_FOOTER[lang][key];
}

export async function enrichMedsForPrescriptionPdf(
  meds: PdfMedicationInput[],
  lang: "pt" | "en" | "es" = "pt",
): Promise<PdfMedicationInput[]> {
  return Promise.all(
    meds.map(async (med) => {
      let renisus = med.renisus;
      let badge = med.regulatoryBadge;
      let presentation = med.presentation;
      let pharmaceuticalForm = med.pharmaceuticalForm;

      if (med.mnSlug) {
        const item = await getMedicinaNaturalItemBySlug(med.mnSlug);
        if (item) {
          renisus = item.renisus;
          if (item.categoriaPratica === "CANNABIS") {
            const det = parseDetalhesCannabis(item.detalhesEspecificos);
            if (det) {
              presentation = formatCannabisComposition(det);
              pharmaceuticalForm = det.formaFarmaceutica.replace(/_/g, " ");
              const receituarioLabel =
                lang === "pt"
                  ? det.tipoReceituario === "A"
                    ? "Receituario tipo A (controle especial)"
                    : "Receituario tipo B"
                  : det.tipoReceituario === "A"
                    ? "Type A prescription (controlled)"
                    : "Type B prescription";
              badge = receituarioLabel;
            }
          } else {
            const parts: string[] = [];
            if (item.renisus) parts.push("RENISUS");
            const statusLabel =
              lang === "pt"
                ? STATUS_LABEL_PT[item.statusRegulatorio] || item.statusRegulatorio
                : item.statusRegulatorio.replace(/_/g, " ");
            if (statusLabel) parts.push(statusLabel);
            if (parts.length > 0) badge = parts.join(" · ");
          }
        }
      } else if (renisus && !badge) {
        badge = "RENISUS";
      }

      return {
        ...med,
        renisus,
        regulatoryBadge: badge,
        presentation,
        pharmaceuticalForm,
      };
    }),
  );
}
