import type { HumanitarianIntakeStatus, HumanitarianQueueStatus, PartnerIntakeStatus } from "@prisma/client";
import { isAcuraTriageComplete } from "@/lib/partner/acura-intake";
import { isHumanitarianPhoneGateEnabled } from "@/lib/humanitarian/feature-flags";
import type { HumanitarianFlowStep } from "@/lib/humanitarian/patient-flow";

export type AdminJourneyStepKey =
  | "acura_form"
  | "acura_triage"
  | "d8_register"
  | "d8_triage"
  | "d8_tcle"
  | "d8_anamnese"
  | "d8_queue"
  | "d8_consult";

export type AdminJourneyStepState =
  | "completed"
  | "in_progress"
  | "pending"
  | "skipped"
  | "stuck";

export type PartnerIntakeJourneySnapshot = {
  submittedAt: Date;
  acuraStatus: PartnerIntakeStatus;
};

export type IntakeJourneySnapshot = {
  status: HumanitarianIntakeStatus | null;
  triageCompletedAt: Date | null;
  telemedicineTcleAt: Date | null;
  consentAt: Date | null;
  updatedAt: Date | null;
};

export type AdminJourneyStep = {
  key: AdminJourneyStepKey;
  label: string;
  shortLabel: string;
  state: AdminJourneyStepState;
  completedAt: string | null;
  stuckSince: string | null;
};

export type AdminPatientJourney = {
  steps: AdminJourneyStep[];
  currentStep: AdminJourneyStepKey;
  flowStep: HumanitarianFlowStep | null;
};

const STEP_DEFS: { key: AdminJourneyStepKey; label: string; shortLabel: string }[] = [
  { key: "acura_form", label: "Solicitud ACURA", shortLabel: "ACURA" },
  { key: "acura_triage", label: "Triagem ACURA", shortLabel: "Triagem ACURA" },
  { key: "d8_register", label: "Cadastro Doctor8", shortLabel: "Cadastro" },
  { key: "d8_triage", label: "Triagem Doctor8", shortLabel: "Triagem" },
  { key: "d8_tcle", label: "TCLE", shortLabel: "TCLE" },
  { key: "d8_anamnese", label: "Anamnese", shortLabel: "Anamnese" },
  { key: "d8_queue", label: "Fila", shortLabel: "Fila" },
  { key: "d8_consult", label: "Consulta", shortLabel: "Consulta" },
];

function triageValid(intake: IntakeJourneySnapshot | null): boolean {
  return Boolean(intake?.triageCompletedAt);
}

function tcleAccepted(intake: IntakeJourneySnapshot | null): boolean {
  return Boolean(intake?.telemedicineTcleAt);
}

function anamneseComplete(intake: IntakeJourneySnapshot | null): boolean {
  return intake?.status === "COMPLETE";
}

function phoneReady(_intake: IntakeJourneySnapshot | null): boolean {
  return true;
}

function deriveFlowStep(
  intake: IntakeJourneySnapshot | null,
  inQueue: boolean,
  inConsult: boolean,
): HumanitarianFlowStep | null {
  if (!intake) return null;
  if (inConsult) return "consult";
  if (inQueue) return "waiting";
  if (!triageValid(intake)) return "triage";
  if (!tcleAccepted(intake)) return "tcle";
  if (isHumanitarianPhoneGateEnabled() && !phoneReady(intake)) return "phone";
  if (!anamneseComplete(intake) && !inQueue) return "anamnese";
  return "care";
}

function queueReached(
  entries: { status: HumanitarianQueueStatus; enteredAt: Date; endedAt: Date | null }[],
): boolean {
  return entries.some((e) =>
    ["WAITING", "CALLED", "IN_PROGRESS", "DONE"].includes(e.status),
  );
}

function consultCompleted(
  entries: { status: HumanitarianQueueStatus; endedAt: Date | null }[],
): boolean {
  return entries.some((e) => e.status === "DONE" && e.endedAt);
}

function consultInProgress(
  entries: { status: HumanitarianQueueStatus }[],
): boolean {
  return entries.some((e) => e.status === "IN_PROGRESS");
}

type JourneyStepContext = {
  userCreatedAt: Date;
  partnerIntake: PartnerIntakeJourneySnapshot | null;
  intake: IntakeJourneySnapshot | null;
  entries: {
    status: HumanitarianQueueStatus;
    enteredAt: Date;
    endedAt: Date | null;
    startedAt: Date | null;
  }[];
};

function stepCompletedAt(
  key: AdminJourneyStepKey,
  opts: JourneyStepContext,
): Date | null {
  const { userCreatedAt, intake, entries, partnerIntake } = opts;
  switch (key) {
    case "acura_form":
      return partnerIntake?.submittedAt ?? null;
    case "acura_triage":
      return partnerIntake && isAcuraTriageComplete(partnerIntake.acuraStatus)
        ? partnerIntake.submittedAt
        : null;
    case "d8_register":
      return userCreatedAt;
    case "d8_triage":
      return intake?.triageCompletedAt ?? null;
    case "d8_tcle":
      return intake?.telemedicineTcleAt ?? null;
    case "d8_anamnese":
      return intake?.status === "COMPLETE"
        ? intake.consentAt ?? intake.updatedAt
        : null;
    case "d8_queue": {
      const first = [...entries]
        .filter((e) => ["WAITING", "CALLED", "IN_PROGRESS", "DONE"].includes(e.status))
        .sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime())[0];
      return first?.enteredAt ?? null;
    }
    case "d8_consult": {
      const done = entries.find((e) => e.status === "DONE" && e.endedAt);
      return done?.endedAt ?? entries.find((e) => e.startedAt)?.startedAt ?? null;
    }
    default:
      return null;
  }
}

function isStepComplete(
  key: AdminJourneyStepKey,
  opts: JourneyStepContext,
): boolean {
  switch (key) {
    case "acura_form":
      return Boolean(opts.partnerIntake);
    case "acura_triage":
      return opts.partnerIntake
        ? isAcuraTriageComplete(opts.partnerIntake.acuraStatus)
        : false;
    case "d8_register":
      return true;
    case "d8_triage":
      return triageValid(opts.intake);
    case "d8_tcle":
      return tcleAccepted(opts.intake);
    case "d8_anamnese":
      return anamneseComplete(opts.intake);
    case "d8_queue":
      return queueReached(opts.entries);
    case "d8_consult":
      return consultCompleted(opts.entries);
    default:
      return false;
  }
}

function isStepSkipped(key: AdminJourneyStepKey, partner: PartnerIntakeJourneySnapshot | null): boolean {
  if (key === "acura_form" || key === "acura_triage") return !partner;
  return false;
}

/** Build admin journey steps (ACURA + Doctor8). */
export function buildAdminPatientJourney(opts: {
  userCreatedAt: Date;
  partnerIntake: PartnerIntakeJourneySnapshot | null;
  intake: IntakeJourneySnapshot | null;
  entries: {
    status: HumanitarianQueueStatus;
    enteredAt: Date;
    endedAt: Date | null;
    startedAt: Date | null;
  }[];
  stuckStepKeys?: Set<AdminJourneyStepKey>;
}): AdminPatientJourney {
  const inQueue = opts.entries.some((e) => ["WAITING", "CALLED"].includes(e.status));
  const inConsult = consultInProgress(opts.entries);
  const flowStep = deriveFlowStep(opts.intake, inQueue, inConsult);

  const stepOpts = {
    userCreatedAt: opts.userCreatedAt,
    partnerIntake: opts.partnerIntake,
    intake: opts.intake,
    entries: opts.entries,
  };

  let currentStep: AdminJourneyStepKey = opts.partnerIntake ? "acura_form" : "d8_register";
  const steps: AdminJourneyStep[] = STEP_DEFS.map((def) => {
    const skipped = isStepSkipped(def.key, opts.partnerIntake);
    const completed = !skipped && isStepComplete(def.key, stepOpts);
    const completedAt = completed ? stepCompletedAt(def.key, stepOpts) : null;
    const stuck = opts.stuckStepKeys?.has(def.key) ?? false;

    let state: AdminJourneyStepState = "pending";
    if (skipped) state = "skipped";
    else if (completed) state = "completed";
    else if (stuck) state = "stuck";

    return {
      key: def.key,
      label: def.label,
      shortLabel: def.shortLabel,
      state,
      completedAt: completedAt?.toISOString() ?? null,
      stuckSince: stuck && completedAt ? completedAt.toISOString() : null,
    };
  });

  for (const step of steps) {
    if (step.state === "skipped") continue;
    if (step.state === "completed") continue;
    if (step.state !== "stuck") step.state = "in_progress";
    currentStep = step.key;
    break;
  }

  if (steps.every((s) => s.state === "skipped" || s.state === "completed")) {
    currentStep = "d8_consult";
  }

  return { steps, currentStep, flowStep };
}

export function journeyStepLabel(key: AdminJourneyStepKey): string {
  return STEP_DEFS.find((s) => s.key === key)?.shortLabel ?? key;
}

export function intakeToJourneySnapshot(intake: {
  status: HumanitarianIntakeStatus;
  triageCompletedAt: Date | null;
  telemedicineTcleAt: Date | null;
  consentAt: Date | null;
  updatedAt: Date;
} | null): IntakeJourneySnapshot | null {
  if (!intake) return null;
  return {
    status: intake.status,
    triageCompletedAt: intake.triageCompletedAt,
    telemedicineTcleAt: intake.telemedicineTcleAt,
    consentAt: intake.consentAt,
    updatedAt: intake.updatedAt,
  };
}
