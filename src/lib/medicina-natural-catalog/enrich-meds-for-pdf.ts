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
};

const STATUS_LABEL_PT: Record<string, string> = {
  MEDICAMENTO_REGISTRADO: "Medicamento registrado",
  PRODUTO_TRADICIONAL_NOTIFICADO: "Produto tradicional (PTF)",
  USO_TRADICIONAL_SEM_REGISTRO: "Uso tradicional",
  PRATICA_INTEGRATIVA_NAO_REGULADA: "Prática integrativa",
};

export async function enrichMedsForPrescriptionPdf(
  meds: PdfMedicationInput[],
  lang: "pt" | "en" | "es" = "pt",
): Promise<PdfMedicationInput[]> {
  return Promise.all(
    meds.map(async (med) => {
      let renisus = med.renisus;
      let badge = med.regulatoryBadge;

      if (med.mnSlug) {
        const item = await getMedicinaNaturalItemBySlug(med.mnSlug);
        if (item) {
          renisus = item.renisus;
          const parts: string[] = [];
          if (item.renisus) parts.push("RENISUS");
          const statusLabel =
            lang === "pt"
              ? STATUS_LABEL_PT[item.statusRegulatorio] || item.statusRegulatorio
              : item.statusRegulatorio.replace(/_/g, " ");
          if (statusLabel) parts.push(statusLabel);
          if (parts.length > 0) badge = parts.join(" · ");
        }
      } else if (renisus && !badge) {
        badge = "RENISUS";
      }

      return { ...med, renisus, regulatoryBadge: badge };
    }),
  );
}
