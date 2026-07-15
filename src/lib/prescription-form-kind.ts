/** Regulatory prescription document kinds (Portaria 344/98 + RDC 1.000/2025). */
export type PrescriptionFormKind = "SIMPLE" | "NRB" | "RCE";

/** UI intent when opening the prescription form. */
export type ControlledFormKind = "simple" | "B" | "C";

export const SNCR_RECEIPT_TYPE: Record<"NRB" | "RCE", string> = {
  NRB: "NRB",
  RCE: "RCE",
};

export function formKindToPrescriptionFormKind(
  kind: ControlledFormKind,
): PrescriptionFormKind | null {
  if (kind === "B") return "NRB";
  if (kind === "C") return "RCE";
  return null;
}

export function prescriptionFormKindLabel(
  kind: PrescriptionFormKind,
  lang: "pt" | "en" | "es" = "pt",
): string {
  const labels: Record<PrescriptionFormKind, Record<"pt" | "en" | "es", string>> = {
    SIMPLE: {
      pt: "Receita simples",
      en: "Standard prescription",
      es: "Receta simple",
    },
    NRB: {
      pt: "Notificação de Receita B (azul)",
      en: "Prescription B notification (blue)",
      es: "Notificación de Receta B (azul)",
    },
    RCE: {
      pt: "Receita de Controle Especial (2 vias)",
      en: "Special control prescription (2 copies)",
      es: "Receta de control especial (2 vías)",
    },
  };
  return labels[kind][lang];
}

export function defaultValidDaysForFormKind(kind: ControlledFormKind): number {
  if (kind === "B" || kind === "C") return 30;
  return 30;
}

export function validDaysForPrescriptionFormKind(kind: PrescriptionFormKind): number {
  return kind === "SIMPLE" ? 30 : 30;
}

export function requiresSncrNumber(kind: PrescriptionFormKind): boolean {
  return kind === "NRB" || kind === "RCE";
}

export function requiresIcpSignature(kind: PrescriptionFormKind): boolean {
  return kind === "NRB" || kind === "RCE";
}
