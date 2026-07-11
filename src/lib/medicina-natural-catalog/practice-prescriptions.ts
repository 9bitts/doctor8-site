import type { NaturalMedicinePracticeId } from "@/lib/natural-medicine/config";

/** Query param `add=` on prescriptions deep link per MN practice. */
export const PRACTICE_RX_ADD_PARAM: Record<NaturalMedicinePracticeId, string> = {
  fitoterapia: "phytotherapy",
  terapia_florais: "floral",
  homeopatia: "homeopathy",
  aromaterapia: "aromatherapy",
  apiterapia: "apitherapy",
};

export function prescriptionsPathForPractice(
  portal: "professional" | "integrative",
  practiceId: NaturalMedicinePracticeId,
): string {
  const base =
    portal === "professional" ? "/professional/prescriptions" : "/integrative-therapist/prescriptions";
  return `${base}?add=${PRACTICE_RX_ADD_PARAM[practiceId]}`;
}
