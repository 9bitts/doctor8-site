export type IntegrativeVisitType = "first" | "return";

export interface IntegrativeConsultContext {
  clientId: string;
  clientFirstName: string;
  clientLastName: string;
  mainPractice: string | null;
  chiefComplaint: string | null;
  treatmentGoals: string | null;
  picsPractices: string[];
  priorSessionCount: number;
  defaultVisitType: IntegrativeVisitType;
  appointment: {
    id: string;
    scheduledAt: string;
    type: string;
    durationMins: number;
    status: string;
  } | null;
}

export function visitDurationMins(visitType: IntegrativeVisitType): number {
  return visitType === "first" ? 60 : 30;
}
