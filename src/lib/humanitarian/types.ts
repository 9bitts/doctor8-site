import type { HumanitarianPriority, HumanitarianQueueStatus } from "@prisma/client";

export type { HumanitarianPriority, HumanitarianQueueStatus };

export const PRIORITY_ORDER: Record<HumanitarianPriority, number> = {
  CRISIS: 3,
  URGENT: 2,
  ROUTINE: 1,
};

export const WAITING_ENTRY_STATUSES: HumanitarianQueueStatus[] = [
  "WAITING",
  "CALLED",
  "IN_PROGRESS",
];

export interface HumanitarianEntryStatusDto {
  id: string;
  status: HumanitarianQueueStatus;
  priority: HumanitarianPriority;
  position: number;
  aheadCount: number;
  estimatedWaitMinutes: number;
  onlineVolunteers: number;
  calledAt: string | null;
  expiresAt: string | null;
  meetingUrl: string | null;
  poolSlug: string;
  poolLabel: string;
  professionalName: string | null;
  campaignActive: boolean;
  campaignSlug: string;
}

export interface HumanitarianPoolStatsDto {
  id: string;
  slug: string;
  labelEs: string;
  labelPt: string;
  labelEn: string;
  maxWaiting: number;
  sortOrder: number;
  waiting: number;
  volunteersOnline: number;
  volunteersBusy: number;
  isFull: boolean;
  completedToday: number;
  crisisWaiting: number;
}

export interface HumanitarianCampaignReportDto {
  campaignId: string;
  slug: string;
  name: string;
  active: boolean;
  totals: {
    waiting: number;
    inConsult: number;
    completedToday: number;
    noShowsToday: number;
    volunteersOnline: number;
    volunteersBusy: number;
    avgWaitMinutesToday: number | null;
  };
  pools: HumanitarianPoolStatsDto[];
}
