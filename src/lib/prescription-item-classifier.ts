import type { PrescriptionFormKind } from "@/lib/prescription-form-kind";

export type ClassifiedMedicationItem = {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  continuousUse?: boolean;
  presentation?: string;
  pharmaceuticalForm?: string;
  itemKind?: string;
  mnSlug?: string;
  renisus?: boolean;
  phytoProductId?: string;
  floralProductId?: string;
  prescriptionType?: string | null;
  controlled?: boolean;
};

export type MedicationRegulatoryBucket =
  | PrescriptionFormKind
  | "NRA"
  | "C2_C3"
  | "UNKNOWN_CONTROLLED";

/** Classify a medication line for split / document routing. */
export function classifyMedicationItem(
  item: ClassifiedMedicationItem,
): MedicationRegulatoryBucket {
  const code = (item.prescriptionType || "").toUpperCase().trim();
  if (!code) {
    if (item.controlled) return "UNKNOWN_CONTROLLED";
    return "SIMPLE";
  }
  if (code.startsWith("B")) return "NRB";
  if (code.startsWith("C")) {
    if (code === "C2" || code === "C3") return "C2_C3";
    return "RCE";
  }
  if (code.startsWith("A")) return "NRA";
  return "SIMPLE";
}

export function bucketToFormKind(
  bucket: MedicationRegulatoryBucket,
): PrescriptionFormKind | null {
  if (bucket === "NRB" || bucket === "RCE" || bucket === "SIMPLE") return bucket;
  return null;
}

export function unsupportedBucketMessage(
  bucket: MedicationRegulatoryBucket,
  lang: "pt" | "en" | "es" = "pt",
): string | null {
  const messages: Record<
    Exclude<MedicationRegulatoryBucket, PrescriptionFormKind>,
    Record<"pt" | "en" | "es", string>
  > = {
    NRA: {
      pt: "Medicamentos Lista A (entorpecentes) exigem Notificação de Receita A (amarela), ainda não emitida pelo Doctor8. Remova o item ou use o talonário físico.",
      en: "Schedule A drugs require yellow Notification A, not yet issued by Doctor8. Remove the item or use the physical form.",
      es: "Medicamentos Lista A requieren Notificación A (amarilla), aún no emitida por Doctor8.",
    },
    C2_C3: {
      pt: "Retinóides (C2) e talidomida (C3) exigem Notificação de Receita Especial, ainda não emitida pelo Doctor8.",
      en: "C2/C3 drugs require special notification forms not yet supported in Doctor8.",
      es: "C2/C3 requieren notificaciones especiales aún no soportadas en Doctor8.",
    },
    UNKNOWN_CONTROLLED: {
      pt: "Medicamento marcado como controlado sem classificação Lista B/C. Verifique o cadastro ou prescreva pelo talonário físico.",
      en: "Controlled drug without Lista B/C classification. Check catalog data or use a physical form.",
      es: "Medicamento controlado sin clasificación Lista B/C.",
    },
  };
  if (bucket === "SIMPLE" || bucket === "NRB" || bucket === "RCE") return null;
  return messages[bucket][lang];
}
