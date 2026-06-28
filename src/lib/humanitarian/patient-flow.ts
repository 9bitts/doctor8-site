export type HumanitarianFlowStep = "triage" | "tcle" | "anamnese" | "care" | "waiting" | "consult";

export function humanitarianCareHref(
  slug: string,
  intake: { triageValid?: boolean; tcleAccepted?: boolean },
): string {
  if (!intake.triageValid) return `/humanitarian/${slug}/triage`;
  if (!intake.tcleAccepted) return `/humanitarian/${slug}/tcle`;
  return `/humanitarian/${slug}`;
}

export function humanitarianFlowStep(
  intake: {
    triageValid?: boolean;
    tcleAccepted?: boolean;
    anamneseComplete?: boolean;
  },
  inQueue?: boolean,
): HumanitarianFlowStep {
  if (!intake.triageValid) return "triage";
  if (!intake.tcleAccepted) return "tcle";
  if (!intake.anamneseComplete && !inQueue) return "anamnese";
  if (inQueue) return "waiting";
  return "care";
}
