export type HumanitarianFlowStep =
  | "triage"
  | "tcle"
  | "phone"
  | "anamnese"
  | "care"
  | "waiting"
  | "consult";

export function humanitarianCareHref(
  slug: string,
  intake: { triageValid?: boolean; tcleAccepted?: boolean; phoneReady?: boolean },
): string {
  if (!intake.triageValid) return `/humanitarian/${slug}/triage`;
  if (!intake.tcleAccepted) return `/humanitarian/${slug}/tcle`;
  return `/humanitarian/${slug}`;
}

export function humanitarianFlowStep(
  intake: {
    triageValid?: boolean;
    tcleAccepted?: boolean;
    phoneReady?: boolean;
    anamneseComplete?: boolean;
  },
  inQueue?: boolean,
  phoneGateEnabled = false,
): HumanitarianFlowStep {
  if (!intake.triageValid) return "triage";
  if (!intake.tcleAccepted) return "tcle";
  if (phoneGateEnabled && !intake.phoneReady) return "phone";
  if (!intake.anamneseComplete && !inQueue) return "anamnese";
  if (inQueue) return "waiting";
  return "care";
}
