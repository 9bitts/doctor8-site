import {
  Leaf, Flower2, Droplets, Wind, Hexagon,
} from "lucide-react";
import type { EmissionKind } from "@/components/professional/emissions/EmissionsSignModal";
import type { PrescriptionMedItem } from "@/components/professional/prescriptions/PrescriptionMedItemForm";
import { isFreeTextPrescriptionItem } from "@/lib/prescription-item-kind";

export type ImportablePatient = {
  patientProfileId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  hasAccount: true;
  source: "appointment" | "shared" | "email";
};

export type PlatformMatch = {
  patientProfileId: string;
  patientUserId: string;
  displayName: string;
  city: string | null;
  hasLink: boolean;
  linkStatus: "NONE" | "PENDING" | "ACCEPTED" | "REJECTED" | "REVOKED";
};

export type PlatformRxTarget = {
  patientUserId: string;
  patientProfileId: string;
  displayName: string;
  linkStatus: PlatformMatch["linkStatus"];
};

export type MnAddItemKind = "phytotherapy" | "floral" | "homeopathy" | "aromatherapy" | "apitherapy";

export const MN_RX_SEARCH_TABS: {
  mode: MnAddItemKind;
  icon: typeof Leaf;
  labelKey: string;
  activeClass: string;
  floralOnly?: boolean;
}[] = [
  { mode: "phytotherapy", icon: Leaf, labelKey: "rx.searchMode.phytotherapy", activeClass: "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20" },
  { mode: "floral", icon: Flower2, labelKey: "rx.searchMode.floral", activeClass: "border-pink-500 bg-pink-50 text-pink-800 ring-2 ring-pink-500/20", floralOnly: true },
  { mode: "homeopathy", icon: Droplets, labelKey: "rx.searchMode.homeopathy", activeClass: "border-sky-500 bg-sky-50 text-sky-800 ring-2 ring-sky-500/20" },
  { mode: "aromatherapy", icon: Wind, labelKey: "rx.searchMode.aromatherapy", activeClass: "border-violet-500 bg-violet-50 text-violet-800 ring-2 ring-violet-500/20" },
  { mode: "apitherapy", icon: Hexagon, labelKey: "rx.searchMode.apitherapy", activeClass: "border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20" },
];

export function controlInfo(type: string | null | undefined): {
  tarja: "preta" | "vermelha"; label: string; receita: string;
} | null {
  if (!type) return null;
  const code = type.toUpperCase();
  const A = "Exige Notificação de Receita A (amarela)";
  const B = "Exige Notificação de Receita B (azul)";
  const C = "Exige Receita de Controle Especial (2 vias)";
  const CESP = "Exige Notificação de Receita Especial";
  const map: Record<string, { tarja: "preta" | "vermelha"; label: string; receita: string }> = {
    A1: { tarja: "preta", label: "A1 — Receita A", receita: A },
    A2: { tarja: "preta", label: "A2 — Receita A", receita: A },
    A3: { tarja: "preta", label: "A3 — Receita A", receita: A },
    B1: { tarja: "preta", label: "B1 — Receita B", receita: B },
    B2: { tarja: "preta", label: "B2 — Receita B", receita: B },
    C1: { tarja: "vermelha", label: "C1 — Controle especial", receita: C },
    C2: { tarja: "vermelha", label: "C2 — Retinoide", receita: CESP },
    C3: { tarja: "vermelha", label: "C3 — Talidomida", receita: CESP },
    C4: { tarja: "vermelha", label: "C4 — Antirretroviral", receita: C },
    C5: { tarja: "vermelha", label: "C5 — Anabolizante", receita: C },
  };
  return map[code] || { tarja: "vermelha", label: "Controlado", receita: C };
}

export function missingLabel(code: string): string {
  return ({ name: "nome completo", address: "endereço", dob: "data de nascimento" } as Record<string, string>)[code] || code;
}

export interface ClinicalDocument {
  id: string; type: string; title: string; createdAt: string;
  content?: string | null; examItems?: string[]; examNotes?: string; cid?: string;
  patientRecordId?: string | null;
  signatureStatus?: string | null; digitalSignature?: string | null; signed?: boolean;
  whatsappNotifyStatus?: string | null;
  patientNotifiedAt?: boolean;
  categoryName?: string | null;
  document?: { patient?: { firstName: string; lastName: string } | null };
}

export type View = "hub" | "prescription" | "exam" | "document";
export type ListFilter = "all" | "prescription" | "exam" | "document";

export interface MedItem extends PrescriptionMedItem {}

export function medItemFieldErrors(m: MedItem): { name: boolean; dosage: boolean; frequency: boolean } {
  const kind = m.itemKind || "medication";
  return {
    name: !m.name.trim(),
    dosage: kind === "medication" && !m.dosage?.trim(),
    frequency: kind === "medication" && !m.frequency?.trim(),
  };
}

export function isMedItemValid(m: MedItem): boolean {
  const errors = medItemFieldErrors(m);
  return !errors.name && !errors.dosage && !errors.frequency;
}

export function isMedsFormValid(medications: MedItem[]): boolean {
  return medications.length > 0 && medications.every(isMedItemValid);
}

export function parseBulkMedicationLines(
  text: string,
  defaultKind: MedItem["itemKind"] = "medication",
): MedItem[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (isFreeTextPrescriptionItem(defaultKind)) {
        return {
          name: line,
          dosage: "",
          frequency: "",
          duration: "",
          instructions: "",
          itemKind: defaultKind,
        };
      }
      const parts = line.split(/\t|;\s*|\s+-\s+/).map((p) => p.trim()).filter(Boolean);
      return {
        name: parts[0] || line,
        dosage: parts[1] || "",
        frequency: parts[2] || "",
        duration: parts[3] || "",
        instructions: parts[4] || "",
        itemKind: defaultKind,
      };
    });
}

export function rxFieldClass(invalid: boolean): string {
  return invalid ? " !border-rose-400 !bg-rose-50" : "";
}

export interface Prescription {
  id: string; createdAt: string; validUntil?: string;
  instructions?: string; patientRecordId?: string | null;
  digitalSignature?: string | null;
  signatureStatus?: string | null;
  whatsappNotifyStatus?: string | null;
  patientNotifiedAt?: boolean;
  document?: { patient?: { firstName: string; lastName: string } | null };
  medications: MedItem[];
}

export interface RxTemplate {
  id: string;
  name: string;
  medications: MedItem[];
  instructions: string;
  validDays: number;
}

export function isExamDocType(type: string) {
  return type === "EXAM_REQUEST" || type === "EXAM_RESULT";
}

export function emissionKindFromDoc(type: string): EmissionKind {
  return isExamDocType(type) ? "exam" : "document";
}
