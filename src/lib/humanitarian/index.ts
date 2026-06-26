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
export { createHumanitarianDailyRoom } from "@/lib/humanitarian/daily-room";

export const HUMANITARIAN_PRIORITY_OPTIONS = [
  {
    value: "ROUTINE" as const,
    labelEs: "Consulta general",
    labelPt: "Consulta geral",
    labelEn: "General consultation",
    descEs: "Necesito orientación o seguimiento",
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
    labelPt: "Crise / emergência emocional",
    labelEn: "Crisis / emotional emergency",
    descEs: "Riesgo inmediato, pânico o trauma agudo",
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
