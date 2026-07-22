import type { EmissionKind } from "@/components/professional/emissions/EmissionsSignModal";

export function emissionReuseView(kind: EmissionKind): "prescription" | "exam" | "document" {
  if (kind === "prescription") return "prescription";
  if (kind === "exam") return "exam";
  return "document";
}

/** Build prescriptions-page URL to reopen an emission for reuse (creates a new row on save). */
export function buildEmissionReuseUrl(
  prescriptionsPath: string,
  chartId: string,
  kind: EmissionKind,
  emissionId: string,
  returnTo?: string,
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
  if (returnTo) params.set("returnTo", returnTo);
  return `${prescriptionsPath}?${params.toString()}`;
}

/** Build prescriptions-page URL to edit an existing unsigned emission (PATCH on save). */
export function buildEmissionEditUrl(
  prescriptionsPath: string,
  chartId: string,
  kind: EmissionKind,
  emissionId: string,
  returnTo?: string,
): string {
  const params = new URLSearchParams({
    patientRecordId: chartId,
    view: emissionReuseView(kind),
    editDoc: emissionId,
  });
  if (returnTo) params.set("returnTo", returnTo);
  return `${prescriptionsPath}?${params.toString()}`;
}
