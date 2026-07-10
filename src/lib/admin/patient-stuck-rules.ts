import type { PatientAcquisitionChannel, PartnerIntakeStatus } from "@prisma/client";
import type { AdminJourneyStepKey, IntakeJourneySnapshot, PartnerIntakeJourneySnapshot } from "@/lib/admin/patient-journey";
import { isAcuraTriageComplete } from "@/lib/partner/acura-intake";

export type StuckAlertSeverity = "warning" | "critical";

export type StuckAlert = {
  id: string;
  rule: string;
  severity: StuckAlertSeverity;
  message: string;
  since: string;
  step: AdminJourneyStepKey;
};

type StuckRuleInput = {
  now: Date;
  userCreatedAt: Date;
  acquisitionChannel: PatientAcquisitionChannel;
  partnerIntake: PartnerIntakeJourneySnapshot | null;
  hasPatientAccount: boolean;
  intake: IntakeJourneySnapshot | null;
  queueWaitingSince: Date | null;
  queueAlertMinutes: number;
  priority: "emergencia" | "alta" | "regular" | null;
};

function mapPriority(raw: string | null | undefined): StuckRuleInput["priority"] {
  const p = (raw || "").toLowerCase();
  if (p.includes("emerg")) return "emergencia";
  if (p.includes("alta") || p.includes("urgent")) return "alta";
  if (p) return "regular";
  return null;
}

function acuraStatusIsNova(status: PartnerIntakeStatus): boolean {
  return status === "NOVA";
}

function hoursSince(from: Date, now: Date): number {
  return (now.getTime() - from.getTime()) / (60 * 60 * 1000);
}

function minutesSince(from: Date, now: Date): number {
  return (now.getTime() - from.getTime()) / (60 * 1000);
}

function pushAlert(
  alerts: StuckAlert[],
  alert: Omit<StuckAlert, "id">,
): void {
  alerts.push({ ...alert, id: `${alert.rule}-${alert.step}` });
}

/** Stuck detection for Doctor8 + ACURA partner intake. */
export function computeDoctor8StuckAlerts(input: StuckRuleInput): StuckAlert[] {
  const alerts: StuckAlert[] = [];
  const {
    now,
    userCreatedAt,
    partnerIntake,
    hasPatientAccount,
    intake,
    queueWaitingSince,
    queueAlertMinutes,
    priority,
  } = input;

  const isHumanitarian =
    input.acquisitionChannel !== "REGULAR" || intake !== null || partnerIntake !== null;

  if (partnerIntake) {
    if (
      acuraStatusIsNova(partnerIntake.acuraStatus) &&
      hoursSince(partnerIntake.submittedAt, now) >= (priority === "emergencia" ? 0.5 : 2)
    ) {
      pushAlert(alerts, {
        rule: priority === "emergencia" ? "ACURA_NO_TRIAGE_CRITICAL" : "ACURA_NO_TRIAGE",
        severity:
          priority === "emergencia" || hoursSince(partnerIntake.submittedAt, now) >= 6
            ? "critical"
            : "warning",
        message:
          priority === "emergencia"
            ? "Emergência ACURA sem triagem"
            : "Formulário ACURA aguardando triagem",
        since: partnerIntake.submittedAt.toISOString(),
        step: "acura_triage",
      });
    }

    if (
      partnerIntake.acuraStatus === "ORIENTADO_DOCTOR8" &&
      !hasPatientAccount &&
      hoursSince(partnerIntake.submittedAt, now) >= (priority === "emergencia" ? 2 : 12)
    ) {
      pushAlert(alerts, {
        rule: "ACURA_ORIENTED_NO_D8",
        severity: hoursSince(partnerIntake.submittedAt, now) >= 24 ? "critical" : "warning",
        message: "Orientado no Doctor8 (ACURA) mas sem conta criada",
        since: partnerIntake.submittedAt.toISOString(),
        step: "d8_register",
      });
    }

    if (
      isAcuraTriageComplete(partnerIntake.acuraStatus) &&
      !hasPatientAccount &&
      hoursSince(partnerIntake.submittedAt, now) >= (priority === "emergencia" ? 1 : 6)
    ) {
      pushAlert(alerts, {
        rule: "ACURA_CLICK_NO_REGISTER",
        severity: hoursSince(partnerIntake.submittedAt, now) >= 12 ? "critical" : "warning",
        message: "Triagem ACURA concluída — paciente ainda sem cadastro Doctor8",
        since: partnerIntake.submittedAt.toISOString(),
        step: "d8_register",
      });
    }
  }

  if (!isHumanitarian) return alerts;

  if (!intake && hoursSince(userCreatedAt, now) >= 1) {
    pushAlert(alerts, {
      rule: "ACCOUNT_NO_INTAKE",
      severity: hoursSince(userCreatedAt, now) >= 4 ? "critical" : "warning",
      message: "Cadastrou no Doctor8 mas ainda não iniciou a triagem humanitária",
      since: userCreatedAt.toISOString(),
      step: "d8_triage",
    });
  }

  if (intake && !intake.triageCompletedAt && hoursSince(userCreatedAt, now) >= 2) {
    pushAlert(alerts, {
      rule: "STUCK_D8_TRIAGE",
      severity: hoursSince(userCreatedAt, now) >= 8 ? "critical" : "warning",
      message: "Parado na triagem Doctor8",
      since: userCreatedAt.toISOString(),
      step: "d8_triage",
    });
  }

  if (
    intake?.triageCompletedAt &&
    !intake.telemedicineTcleAt &&
    hoursSince(intake.triageCompletedAt, now) >= 24
  ) {
    pushAlert(alerts, {
      rule: "STUCK_TCLE",
      severity: hoursSince(intake.triageCompletedAt, now) >= 72 ? "critical" : "warning",
      message: "TCLE pendente há mais de 24h",
      since: intake.triageCompletedAt.toISOString(),
      step: "d8_tcle",
    });
  }

  if (
    intake?.telemedicineTcleAt &&
    intake.status !== "COMPLETE" &&
    hoursSince(intake.telemedicineTcleAt, now) >= 4
  ) {
    pushAlert(alerts, {
      rule: "STUCK_ANAMNESE",
      severity: hoursSince(intake.telemedicineTcleAt, now) >= 24 ? "critical" : "warning",
      message: "Anamnese incompleta",
      since: intake.telemedicineTcleAt.toISOString(),
      step: "d8_anamnese",
    });
  }

  if (queueWaitingSince) {
    const waitMin = minutesSince(queueWaitingSince, now);
    if (waitMin >= queueAlertMinutes) {
      pushAlert(alerts, {
        rule: "QUEUE_WAIT",
        severity: waitMin >= queueAlertMinutes * 2 ? "critical" : "warning",
        message: `Na fila há ${Math.floor(waitMin)} min (limite ${queueAlertMinutes} min)`,
        since: queueWaitingSince.toISOString(),
        step: "d8_queue",
      });
    }
  }

  return alerts;
}

export function computeStuckAlerts(input: StuckRuleInput): StuckAlert[] {
  return computeDoctor8StuckAlerts(input);
}

export function priorityFromPartnerIntake(
  priorityEnc: string | null | undefined,
): StuckRuleInput["priority"] {
  return mapPriority(priorityEnc ?? null);
}

export function stuckAlertsToProblemReasons(alerts: StuckAlert[]): string[] {
  return alerts.map((a) => a.message);
}

export function stuckStepKeys(alerts: StuckAlert[]): Set<AdminJourneyStepKey> {
  return new Set(alerts.map((a) => a.step));
}
