import type { EmissionKind } from "@/components/professional/emissions/EmissionsSignModal";

export function emissionReuseView(kind: EmissionKind): "prescription" | "exam" | "document" {
  if (kind === "prescription") return "prescription";
  if (kind === "exam") return "exam";
  return "document";
}

/** Build prescriptions-page URL to reopen an emission for reuse/editing. */
export function buildEmissionReuseUrl(
  prescriptionsPath: string,
  chartId: string,
  kind: EmissionKind,
  emissionId: string,
): string {
  const params = new URLSearchParams({
    patientRecordId: chartId,
    view: emissionReuseView(kind),
  });
  if (kind === "prescription") {
    params.set("reuse", emissionId);
  } else {
    params.set("reuseDoc", emissionId);
  }
  return `${prescriptionsPath}?${params.toString()}`;
}
