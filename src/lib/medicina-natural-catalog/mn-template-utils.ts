import type { NaturalMedicinePracticeId } from "@/lib/natural-medicine/config";
import type { PrescriptionItemKind } from "@/lib/prescription-item-kind";
import { PRACTICE_RX_ADD_PARAM } from "./practice-prescriptions";
import { MN_ADD_PARAM_TO_ITEM_KIND } from "./prescription-search";

export function itemKindForPractice(
  practiceId: NaturalMedicinePracticeId,
): PrescriptionItemKind {
  const add = PRACTICE_RX_ADD_PARAM[practiceId];
  return MN_ADD_PARAM_TO_ITEM_KIND[add] || "phytotherapy";
}

export function templateMatchesPractice(
  medications: { itemKind?: string }[],
  practiceId: NaturalMedicinePracticeId,
): boolean {
  const kind = itemKindForPractice(practiceId);
  return medications.some((m) => (m.itemKind || "phytotherapy") === kind);
}

export const MN_PRACTICE_THEME: Record<
  NaturalMedicinePracticeId,
  { card: string; border: string; button: string; icon: string }
> = {
  fitoterapia: {
    card: "bg-emerald-50 border-emerald-100",
    border: "hover:border-emerald-200",
    button: "bg-emerald-600 hover:bg-emerald-700",
    icon: "text-emerald-500",
  },
  terapia_florais: {
    card: "bg-pink-50 border-pink-100",
    border: "hover:border-pink-200",
    button: "bg-pink-600 hover:bg-pink-700",
    icon: "text-pink-500",
  },
  homeopatia: {
    card: "bg-sky-50 border-sky-100",
    border: "hover:border-sky-200",
    button: "bg-sky-600 hover:bg-sky-700",
    icon: "text-sky-500",
  },
  aromaterapia: {
    card: "bg-violet-50 border-violet-100",
    border: "hover:border-violet-200",
    button: "bg-violet-600 hover:bg-violet-700",
    icon: "text-violet-500",
  },
  apiterapia: {
    card: "bg-amber-50 border-amber-100",
    border: "hover:border-amber-200",
    button: "bg-amber-600 hover:bg-amber-700",
    icon: "text-amber-500",
  },
};
