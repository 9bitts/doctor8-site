export {
  VENEZUELA_CAMPAIGN_SLUG,
  DEFAULT_VENEZUELA_POOLS,
  poolLabel,
  type HumanitarianPoolSlug,
} from "@/lib/humanitarian/constants";

export type {
  HumanitarianEntryStatusDto,
  HumanitarianPoolStatsDto,
  HumanitarianCampaignReportDto,
  HumanitarianPriority,
} from "@/lib/humanitarian/types";

export { PRIORITY_ORDER, WAITING_ENTRY_STATUSES } from "@/lib/humanitarian/types";

export {
  assignNextInPool,
  completeHumanitarianEntry,
  releaseVolunteer,
  getEntryStatus,
  countActiveInPool,
  getCampaignStats,
  resolveVolunteerProfile,
  poolMatchesVolunteer,
  expireHumanitarianNoShows,
  type VolunteerProfile,
} from "@/lib/humanitarian/dispatcher";

export {
  buildCampaignReport,
  getActiveCampaignForRegion,
  getPatientActiveHumanitarianEntry,
  notifyHumanitarianJoined,
  notifyHumanitarianYourTurn,
  notifyHumanitarianMissedTurn,
  notifyVolunteerAssigned,
} from "@/lib/humanitarian/notify";

export { seedVenezuelaCampaign } from "@/lib/humanitarian/seed-venezuela";
export { buildHumanitarianCsv } from "@/lib/humanitarian/export-csv";
export { createHumanitarianDailyRoom } from "@/lib/humanitarian/daily-room";
export {
  ANAMNESE_SERVICE_TYPES,
  MEDICO_SYMPTOMS,
  PSICO_SYMPTOMS,
} from "@/lib/humanitarian/anamnese";
export {
  computeTriagePriority,
  humanitarianTriageSchema,
  isTriageValid,
  triageExpiresAt,
  TRIAGE_VALIDITY_MS,
} from "@/lib/humanitarian/triage";
export type { HumanitarianTriageData, TriageResult } from "@/lib/humanitarian/triage";
export {
  getPatientIntakeStatus,
  getPatientIntakeStatusBySlug,
  requireValidIntake,
  saveHumanitarianTriage,
  saveAnamneseSection,
  listCampaignIntakes,
  getIntakePrefill,
} from "@/lib/humanitarian/intake";
export type { IntakeStatusDto, AdminIntakeRow, AnamneseDto } from "@/lib/humanitarian/intake";
export { notifyHumanitarianAnamneseReminder } from "@/lib/humanitarian/notify";
export { buildIntakeSummary } from "@/lib/humanitarian/intake-summary";
export {
  notifyCoordinationIntakeComplete,
  notifyCoordinationUrgentTriage,
} from "@/lib/humanitarian/coordination-email";
export { buildHumanitarianIntakesCsv } from "@/lib/humanitarian/export-csv";

export const HUMANITARIAN_PRIORITY_OPTIONS = [
  {
    value: "ROUTINE" as const,
    labelEs: "Consulta general",
    labelPt: "Consulta geral",
    labelEn: "General consultation",
    descEs: "Necesito orientaci?n o seguimiento",
  },
  {
    value: "URGENT" as const,
    labelEs: "Urgente",
    labelPt: "Urgente",
    labelEn: "Urgent",
    descEs: "Dolor, ansiedad intensa o empeoramiento",
  },
  {
    value: "CRISIS" as const,
    labelEs: "Crisis / emergencia emocional",
    labelPt: "Crise / emerg?ncia emocional",
    labelEn: "Crisis / emotional emergency",
    descEs: "Riesgo inmediato, p?nico o trauma agudo",
  },
];

export function priorityLabel(
  priority: "ROUTINE" | "URGENT" | "CRISIS",
  lang = "es",
): string {
  const opt = HUMANITARIAN_PRIORITY_OPTIONS.find((o) => o.value === priority);
  if (!opt) return priority;
  if (lang.startsWith("pt")) return opt.labelPt;
  if (lang.startsWith("en")) return opt.labelEn;
  return opt.labelEs;
}
