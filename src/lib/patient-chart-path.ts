import { professionalPortalBaseFromSpecialty } from "@/lib/psychologist-portal";

/** Patient chart URL for a professional's specialty (server-side notifications, emails). */
export function patientChartPathForSpecialty(
  specialty: string | null | undefined,
  chartId: string,
): string {
  const base = professionalPortalBaseFromSpecialty(specialty);
  return `${base}/patients/${chartId}`;
}

export function professionalSharedPathForSpecialty(
  specialty: string | null | undefined,
): string {
  const base = professionalPortalBaseFromSpecialty(specialty);
  return `${base}/shared`;
}
