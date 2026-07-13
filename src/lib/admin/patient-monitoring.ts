import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { isWithinAppointmentJoinWindow } from "@/lib/appointment-join-window";
import { getEntryStatusForAdmin } from "@/lib/humanitarian/dispatcher";
import { poolLabel } from "@/lib/humanitarian/constants";
import { buildIntakeSummary } from "@/lib/humanitarian/intake-summary";
import { SCHEDULED_VOLUNTEER_BOOKING_SOURCE } from "@/lib/scheduled-volunteer";
import type { IntakeSummarySection } from "@/lib/humanitarian/intake-summary";
import {
  PatientAcquisitionChannel,
  type Appointment,
  type HumanitarianQueueEntry,
  type HumanitarianQueueStatus,
  type PartnerIntake,
  type PatientProfile,
  type User,
} from "@prisma/client";
import {
  buildAdminPatientJourney,
  intakeToJourneySnapshot,
  type AdminJourneyStepKey,
  type AdminPatientJourney,
  type PartnerIntakeJourneySnapshot,
} from "@/lib/admin/patient-journey";
import {
  computeStuckAlerts,
  priorityFromPartnerIntake,
  stuckAlertsToProblemReasons,
  stuckStepKeys,
  type StuckAlert,
} from "@/lib/admin/patient-stuck-rules";
import {
  getLatestPartnerIntakeForUser,
  getPartnerIntakeEvents,
  partnerIntakeTimelineEvents,
  partnerIntakeToAdminDto,
  resolvePartnerIntakePhoneDisplay,
  type AcuraIntakeAdminDto,
} from "@/lib/partner/acura-intake";
import { resolveDisplayAcquisitionChannel } from "@/lib/humanitarian/acquisition-channel";

export type PatientMonitorStatus =
  | "IN_QUEUE"
  | "IN_CONSULT"
  | "ATTENDED"
  | "INACTIVE"
  | "PROBLEM"
  | "PENDING_D8_REGISTRATION";

export type PatientOrigin = "humanitarian" | "regular";

export type { PatientAcquisitionChannel };

export interface PatientListFilters {
  q?: string;
  status?: PatientMonitorStatus;
  country?: string;
  origin?: PatientOrigin;
  acquisitionChannel?: PatientAcquisitionChannel;
  journeyStep?: AdminJourneyStepKey;
  needsAttention?: boolean;
  registeredFrom?: string;
  registeredTo?: string;
  lastSpecialty?: string;
  sort?: "newest" | "oldest" | "lastActivity";
  queueAlertMinutes?: number;
  reviewed?: "yes" | "no" | "all";
}

export interface PatientListRow {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phoneHint: string | null;
  country: string | null;
  language: string;
  origin: PatientOrigin;
  acquisitionChannel: PatientAcquisitionChannel;
  acuraProtocolo: string | null;
  currentJourneyStep: AdminJourneyStepKey;
  stuckAlertCount: number;
  status: PatientMonitorStatus;
  statusDetail: string | null;
  registeredAt: string;
  lastActivityAt: string | null;
  lastSpecialty: string | null;
  appointments: number;
  documents: number;
  activeQueueEntryId: string | null;
  problemReasons: string[];
  adminNote: string | null;
  adminReviewedAt: string | null;
  hasAnamnese: boolean;
  anamneseStatus: string | null;
}

export interface UnlinkedIntakeListRow {
  kind: "unlinked_intake";
  id: string;
  protocolo: string;
  name: string;
  email: string;
  phoneHint: string | null;
  country: string | null;
  origin: "humanitarian";
  acquisitionChannel: "ACURA_SOS_FORM";
  acuraProtocolo: string;
  currentJourneyStep: AdminJourneyStepKey;
  stuckAlertCount: number;
  status: PatientMonitorStatus;
  statusDetail: string | null;
  registeredAt: string;
  lastActivityAt: string | null;
  lastSpecialty: string | null;
  appointments: number;
  documents: number;
  hasAnamnese: boolean;
  anamneseStatus: string | null;
  adminReviewedAt: null;
  problemReasons: string[];
}

export type MonitoringListRow =
  | (PatientListRow & { kind: "patient" })
  | UnlinkedIntakeListRow;

export interface MonitoringCounters {
  total: number;
  inQueue: number;
  inConsult: number;
  completedToday: number;
  withProblem: number;
  pendingReview: number;
  pendingAcuraRegistration: number;
}

export interface MonitoringAlert {
  id: string;
  type: "queue_wait" | "stuck_consult" | "no_documents" | "video_incident" | "acura_pending";
  patientProfileId?: string;
  patientUserId?: string;
  partnerIntakeId?: string;
  protocolo?: string;
  patientName: string;
  message: string;
  severity: "warning" | "critical";
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  type:
    | "queue_joined"
    | "queue_called"
    | "consult_started"
    | "consult_ended"
    | "document"
    | "payment"
    | "cancelled"
    | "video_incident"
    | "admin_removed"
    | "admin_problem"
    | "account_created"
    | "intake_triage_completed"
    | "intake_tcle_accepted"
    | "intake_anamnese_completed"
    | "acura_form_submitted"
    | "acura_status_changed"
    | "acura_clicked_doctor8_register"
    | "acura_clicked_doctor8_login"
    | "acura_clicked_whatsapp"
    | "acura_doctor8_email_verified"
    | "acura_patient_linked";
  at: string;
  title: string;
  detail: string | null;
  link: string | null;
  meta?: Record<string, unknown>;
}

export interface PatientDetailDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  country: string | null;
  language: string;
  region: string;
  registeredAt: string;
  origin: PatientOrigin;
  acquisitionChannel: PatientAcquisitionChannel;
  acquisitionReferrer: string | null;
  status: PatientMonitorStatus;
  statusDetail: string | null;
  phoneHint: string | null;
  activeQueue: Awaited<ReturnType<typeof getEntryStatusForAdmin>> | null;
  liveConsult: {
    kind: "humanitarian" | "appointment";
    id: string;
    professionalName: string | null;
    professionalUserId: string | null;
    professionalProfileId: string | null;
    providerTab: string | null;
    specialty: string | null;
    startedAt: string;
    durationMinutes: number;
  } | null;
  timeline: TimelineEvent[];
  journey: AdminPatientJourney;
  stuckAlerts: StuckAlert[];
  acuraIntake: AcuraIntakeAdminDto | null;
  consultations: {
    id: string;
    kind: "humanitarian" | "appointment";
    origin: "humanitarian" | "volunteer_scheduled" | "paid";
    professionalName: string | null;
    specialty: string | null;
    scheduledAt: string;
    durationMinutes: number | null;
    status: string;
    hasDocuments: boolean;
    documentIds: string[];
    adminProblemAt: string | null;
    adminProblemNote: string | null;
    canCancel: boolean;
  }[];
  journeyHighlight: boolean;
  problemReasons: string[];
  adminNote: string | null;
  adminReviewedAt: string | null;
  emailVerified: boolean;
  accountLocked: boolean;
  failedLoginAttempts: number;
  anamnese: {
    priority: string | null;
    status: string;
    anamneseComplete: boolean;
    sections: IntakeSummarySection[];
    submittedAt: string | null;
  } | null;
}

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function phoneHintFromUser(user: Pick<User, "phone">, profilePhone: string | null): string | null {
  const account = user.phone?.replace(/\D/g, "") ?? "";
  const profile = profilePhone?.replace(/\D/g, "") ?? "";
  const digits = profile || account;
  if (!digits) return null;
  if (digits.length >= 4) return `***${digits.slice(-4)}`;
  return "***";
}

function matchesPhoneSearch(
  user: Pick<User, "phone">,
  profilePhone: string | null,
  qDigits: string,
): boolean {
  if (!qDigits) return false;
  const account = user.phone?.replace(/\D/g, "") ?? "";
  const profile = profilePhone?.replace(/\D/g, "") ?? "";
  return account.includes(qDigits) || profile.includes(qDigits);
}

function volunteerDisplayName(vol: {
  professional: { firstName: string; lastName: string; specialty: string } | null;
  psychoanalyst: { firstName: string; lastName: string } | null;
  integrativeTherapist: { firstName: string; lastName: string } | null;
} | null | undefined): { name: string | null; specialty: string | null; userId: string | null; profileId: string | null; tab: string | null } {
  if (!vol) return { name: null, specialty: null, userId: null, profileId: null, tab: null };
  if (vol.professional) {
    return {
      name: `Dr. ${vol.professional.firstName} ${vol.professional.lastName}`,
      specialty: vol.professional.specialty,
      userId: null,
      profileId: null,
      tab: "medicine",
    };
  }
  if (vol.psychoanalyst) {
    return {
      name: `${vol.psychoanalyst.firstName} ${vol.psychoanalyst.lastName}`,
      specialty: "Psican?lise",
      userId: null,
      profileId: null,
      tab: "psychoanalysis",
    };
  }
  if (vol.integrativeTherapist) {
    return {
      name: `${vol.integrativeTherapist.firstName} ${vol.integrativeTherapist.lastName}`,
      specialty: "Terapia integrativa",
      userId: null,
      profileId: null,
      tab: "integrative",
    };
  }
  return { name: null, specialty: null, userId: null, profileId: null, tab: null };
}

type ProfileBundle = PatientProfile & {
  user: Pick<User, "email" | "region" | "language" | "phone" | "createdAt">;
  _count: { appointments: number; medicalDocuments: number };
  adminNote?: string | null;
  adminReviewedAt?: Date | null;
};

type EntryWithPool = HumanitarianQueueEntry & {
  pool: { slug: string; labelPt: string; labelEs: string; labelEn: string };
};

type ApptRow = Appointment & {
  bookingSource: string | null;
  priceAmount: number;
  professional: { firstName: string; lastName: string; specialty: string; userId: string } | null;
  psychoanalyst: { firstName: string; lastName: string; userId: string } | null;
  integrativeTherapist: { firstName: string; lastName: string; userId: string } | null;
  documents: { id: string }[];
};

interface PatientContext {
  profile: ProfileBundle;
  profilePhone: string;
  humanitarianEntries: EntryWithPool[];
  appointments: ApptRow[];
  hasIntake: boolean;
  intakeStatus: string | null;
  intakeSnapshot: ReturnType<typeof intakeToJourneySnapshot>;
  partnerIntakeSnapshot: PartnerIntakeJourneySnapshot | null;
  partnerPriorityLabel: string | null;
  acuraProtocolo: string | null;
  videoIncidents: { id: string; kind: string; createdAt: Date; notes: string | null }[];
  activeEntry: EntryWithPool | null;
  activeAppointment: ApptRow | null;
  lastSpecialty: string | null;
  lastActivityAt: Date | null;
  origin: PatientOrigin;
  acquisitionChannel: PatientAcquisitionChannel;
  journey: AdminPatientJourney;
  stuckAlerts: StuckAlert[];
  status: PatientMonitorStatus;
  statusDetail: string | null;
  problemReasons: string[];
}

interface UnlinkedIntakeContext {
  intake: PartnerIntake;
  journey: AdminPatientJourney;
  stuckAlerts: StuckAlert[];
  status: PatientMonitorStatus;
  statusDetail: string | null;
  problemReasons: string[];
  lastActivityAt: Date | null;
  partnerIntakeSnapshot: PartnerIntakeJourneySnapshot;
  priorityLabel: string | null;
}

function partnerSnapshotFromRow(row: {
  submittedAt: Date;
  acuraStatus: import("@prisma/client").PartnerIntakeStatus;
  protocolo: string;
  priorityEnc: string | null;
  clickedDoctor8RegisterAt?: Date | null;
  clickedDoctor8LoginAt?: Date | null;
}): { snapshot: PartnerIntakeJourneySnapshot; protocolo: string; priorityLabel: string | null } {
  return {
    snapshot: {
      submittedAt: row.submittedAt,
      acuraStatus: row.acuraStatus,
      clickedDoctor8RegisterAt: row.clickedDoctor8RegisterAt ?? null,
      clickedDoctor8LoginAt: row.clickedDoctor8LoginAt ?? null,
    },
    protocolo: row.protocolo,
    priorityLabel: safeDecrypt(row.priorityEnc) || null,
  };
}

function derivePatientContext(
  profile: ProfileBundle,
  humanitarianEntries: EntryWithPool[],
  appointments: ApptRow[],
  hasIntake: boolean,
  intakeStatus: string | null,
  intakeSnapshot: ReturnType<typeof intakeToJourneySnapshot>,
  partnerBundle: ReturnType<typeof partnerSnapshotFromRow> | null,
  videoIncidents: { id: string; kind: string; createdAt: Date; notes: string | null }[],
  queueAlertMinutes: number,
): PatientContext {
  const profilePhone = safeDecrypt(profile.phone);
  const now = new Date();
  const todayStart = startOfDay(now);

  const activeEntry =
    humanitarianEntries.find((e) =>
      ["WAITING", "CALLED", "IN_PROGRESS"].includes(e.status),
    ) ?? null;

  const activeAppointment =
    appointments.find(
      (a) =>
        a.status === "CONFIRMED" &&
        a.type === "TELECONSULT" &&
        isWithinAppointmentJoinWindow(a.scheduledAt, a.durationMins),
    ) ?? null;

  const hasHumanitarianActivity = humanitarianEntries.length > 0 || hasIntake;
  const partnerIntakeSnapshot = partnerBundle?.snapshot ?? null;
  const acuraProtocolo = partnerBundle?.protocolo ?? null;

  const acquisitionChannel = partnerIntakeSnapshot
    ? PatientAcquisitionChannel.ACURA_SOS_FORM
    : resolveDisplayAcquisitionChannel({
        stored: profile.acquisitionChannel,
        hasHumanitarianActivity,
      });

  const origin: PatientOrigin =
    acquisitionChannel !== "REGULAR" || hasHumanitarianActivity ? "humanitarian" : "regular";

  const queueWaitingSince =
    activeEntry?.status === "WAITING" ? activeEntry.enteredAt : null;

  const stuckAlerts = computeStuckAlerts({
    now,
    userCreatedAt: profile.user.createdAt,
    acquisitionChannel,
    partnerIntake: partnerIntakeSnapshot,
    hasPatientAccount: true,
    intake: intakeSnapshot,
    queueWaitingSince,
    queueAlertMinutes,
    priority: priorityFromPartnerIntake(partnerBundle?.priorityLabel),
  });

  const journey = buildAdminPatientJourney({
    userCreatedAt: profile.user.createdAt,
    hasPatientAccount: true,
    partnerIntake: partnerIntakeSnapshot,
    intake: intakeSnapshot,
    entries: humanitarianEntries.map((e) => ({
      status: e.status,
      enteredAt: e.enteredAt,
      endedAt: e.endedAt,
      startedAt: e.startedAt,
    })),
    stuckStepKeys: stuckStepKeys(stuckAlerts),
  });

  const problemReasons: string[] = [...stuckAlertsToProblemReasons(stuckAlerts)];

  if (activeEntry?.adminProblemAt) {
    problemReasons.push("Marcado como problema pelo admin");
  }
  if (activeAppointment?.adminProblemAt) {
    problemReasons.push("Consulta regular marcada como problema");
  }

  for (const e of humanitarianEntries) {
    if (e.adminProblemAt && !problemReasons.includes("Marcado como problema pelo admin")) {
      problemReasons.push("Marcado como problema pelo admin");
    }
    if (e.status === "IN_PROGRESS" && e.startedAt) {
      const consultMin = Math.floor((now.getTime() - e.startedAt.getTime()) / 60000);
      if (consultMin >= 120) {
        problemReasons.push(`Consulta humanit?ria em andamento h? ${consultMin} min`);
      }
    }
    if (e.status === "DONE" && e.endedAt && e.endedAt >= todayStart) {
      // checked below with documents
    }
  }

  for (const a of appointments) {
    if (a.adminProblemAt && !problemReasons.some((r) => r.includes("problema"))) {
      problemReasons.push("Consulta regular marcada como problema");
    }
    if (
      a.status === "CONFIRMED" &&
      isWithinAppointmentJoinWindow(a.scheduledAt, a.durationMins) &&
      now.getTime() - a.scheduledAt.getTime() > 2 * 60 * 60 * 1000
    ) {
      problemReasons.push("Consulta agendada passou de 2h sem finaliza??o");
    }
    if (a.status === "COMPLETED" && a.updatedAt >= todayStart && a.documents.length === 0) {
      problemReasons.push("Consulta conclu?da sem documentos emitidos");
    }
  }

  if (videoIncidents.some((v) => v.createdAt >= new Date(now.getTime() - 24 * 60 * 60 * 1000))) {
    problemReasons.push("Queda ou incidente de v?deo registrado");
  }

  let status: PatientMonitorStatus = "INACTIVE";
  let statusDetail: string | null = null;

  if (problemReasons.length > 0) {
    status = "PROBLEM";
    statusDetail = problemReasons[0];
  } else if (activeEntry?.status === "IN_PROGRESS" || activeAppointment) {
    status = "IN_CONSULT";
    statusDetail = activeEntry ? "Consulta humanit?ria" : "Consulta agendada";
  } else if (activeEntry && ["WAITING", "CALLED"].includes(activeEntry.status)) {
    status = "IN_QUEUE";
    statusDetail =
      activeEntry.status === "CALLED"
        ? "Chamado ? aguardando entrar"
        : `Posi??o ${activeEntry.position}`;
  } else {
    const completedTodayHumanitarian = humanitarianEntries.some(
      (e) => e.status === "DONE" && e.endedAt && e.endedAt >= todayStart,
    );
    const completedTodayAppt = appointments.some(
      (a) => a.status === "COMPLETED" && a.updatedAt >= todayStart,
    );
    if (completedTodayHumanitarian || completedTodayAppt) {
      status = "ATTENDED";
      statusDetail = "Atendido hoje";
    }
  }

  const activityDates: Date[] = [
    profile.createdAt,
    profile.user.createdAt,
    ...humanitarianEntries.flatMap((e) =>
      [e.enteredAt, e.calledAt, e.startedAt, e.endedAt, e.updatedAt].filter(Boolean) as Date[],
    ),
    ...appointments.flatMap((a) =>
      [a.scheduledAt, a.paidAt, a.cancelledAt, a.updatedAt, a.createdAt].filter(Boolean) as Date[],
    ),
    ...videoIncidents.map((v) => v.createdAt),
  ];
  const lastActivityAt =
    activityDates.length > 0
      ? new Date(Math.max(...activityDates.map((d) => d.getTime())))
      : null;

  let lastSpecialty: string | null = null;
  const lastHum = humanitarianEntries[0];
  if (lastHum?.pool) {
    lastSpecialty = poolLabel(lastHum.pool, "pt");
  } else {
    const lastAppt = appointments[0];
    if (lastAppt?.professional) lastSpecialty = lastAppt.professional.specialty;
    else if (lastAppt?.psychoanalyst) lastSpecialty = "Psican?lise";
    else if (lastAppt?.integrativeTherapist) lastSpecialty = "Terapia integrativa";
  }

  return {
    profile,
    profilePhone,
    humanitarianEntries,
    appointments,
    hasIntake,
    intakeStatus,
    intakeSnapshot,
    partnerIntakeSnapshot,
    partnerPriorityLabel: partnerBundle?.priorityLabel ?? null,
    acuraProtocolo,
    videoIncidents,
    activeEntry,
    activeAppointment,
    lastSpecialty,
    lastActivityAt,
    origin,
    acquisitionChannel,
    journey,
    stuckAlerts,
    status,
    statusDetail,
    problemReasons,
  };
}

function contextToListRow(ctx: PatientContext): PatientListRow & { kind: "patient" } {
  const p = ctx.profile;
  return {
    kind: "patient",
    id: p.id,
    userId: p.userId,
    name: `${safeDecrypt(p.firstName)} ${safeDecrypt(p.lastName)}`.trim() || "?",
    email: p.user.email,
    phoneHint: phoneHintFromUser(p.user, ctx.profilePhone),
    country: p.country ?? p.user.region ?? null,
    language: p.user.language,
    origin: ctx.origin,
    acquisitionChannel: ctx.acquisitionChannel,
    acuraProtocolo: ctx.acuraProtocolo,
    currentJourneyStep: ctx.journey.currentStep,
    stuckAlertCount: ctx.stuckAlerts.length,
    status: ctx.status,
    statusDetail: ctx.statusDetail,
    registeredAt: p.createdAt.toISOString(),
    lastActivityAt: ctx.lastActivityAt?.toISOString() ?? null,
    lastSpecialty: ctx.lastSpecialty,
    appointments: p._count.appointments,
    documents: p._count.medicalDocuments,
    activeQueueEntryId: ctx.activeEntry?.id ?? null,
    problemReasons: ctx.problemReasons,
    adminNote: p.adminNote ?? null,
    adminReviewedAt: p.adminReviewedAt?.toISOString() ?? null,
    hasAnamnese: ctx.hasIntake,
    anamneseStatus: ctx.intakeStatus,
  };
}

function phoneHintFromIntake(intake: PartnerIntake): string | null {
  const raw = resolvePartnerIntakePhoneDisplay(intake.phoneJson) ?? "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length >= 4) return `***${digits.slice(-4)}`;
  return "***";
}

function unlinkedDisplayName(intake: PartnerIntake): string {
  const patientName = safeDecrypt(intake.patientNameEnc).trim();
  if (patientName) return patientName;
  return intake.requesterName.trim() || "Solicitante ACURA";
}

function deriveUnlinkedIntakeContext(
  intake: PartnerIntake,
  queueAlertMinutes: number,
): UnlinkedIntakeContext {
  const now = new Date();
  const partnerBundle = partnerSnapshotFromRow(intake);
  const partnerIntakeSnapshot = partnerBundle.snapshot;

  const stuckAlerts = computeStuckAlerts({
    now,
    userCreatedAt: intake.submittedAt,
    acquisitionChannel: PatientAcquisitionChannel.ACURA_SOS_FORM,
    partnerIntake: partnerIntakeSnapshot,
    hasPatientAccount: false,
    intake: null,
    queueWaitingSince: null,
    queueAlertMinutes,
    priority: priorityFromPartnerIntake(partnerBundle.priorityLabel),
  });

  const journey = buildAdminPatientJourney({
    userCreatedAt: intake.submittedAt,
    hasPatientAccount: false,
    partnerIntake: partnerIntakeSnapshot,
    intake: null,
    entries: [],
    stuckStepKeys: stuckStepKeys(stuckAlerts),
  });

  const problemReasons = stuckAlertsToProblemReasons(stuckAlerts);
  const status: PatientMonitorStatus =
    stuckAlerts.length > 0 ? "PROBLEM" : "PENDING_D8_REGISTRATION";
  const statusDetail = problemReasons[0] ?? "Aguardando cadastro na Doctor8";

  const clickDates = [
    intake.clickedDoctor8RegisterAt,
    intake.clickedDoctor8LoginAt,
    intake.clickedWhatsappHelpAt,
    intake.lastSyncedAt,
  ].filter(Boolean) as Date[];
  const lastActivityAt =
    clickDates.length > 0
      ? new Date(Math.max(...clickDates.map((d) => d.getTime())))
      : intake.submittedAt;

  return {
    intake,
    journey,
    stuckAlerts,
    status,
    statusDetail,
    problemReasons,
    lastActivityAt,
    partnerIntakeSnapshot,
    priorityLabel: partnerBundle.priorityLabel,
  };
}

function unlinkedContextToListRow(ctx: UnlinkedIntakeContext): UnlinkedIntakeListRow {
  const intake = ctx.intake;
  const careType = safeDecrypt(intake.careTypeEnc);
  return {
    kind: "unlinked_intake",
    id: intake.id,
    protocolo: intake.protocolo,
    name: unlinkedDisplayName(intake),
    email: intake.email,
    phoneHint: phoneHintFromIntake(intake),
    country: intake.location || null,
    origin: "humanitarian",
    acquisitionChannel: "ACURA_SOS_FORM",
    acuraProtocolo: intake.protocolo,
    currentJourneyStep: ctx.journey.currentStep,
    stuckAlertCount: ctx.stuckAlerts.length,
    status: ctx.status,
    statusDetail: ctx.statusDetail,
    registeredAt: intake.submittedAt.toISOString(),
    lastActivityAt: ctx.lastActivityAt?.toISOString() ?? null,
    lastSpecialty: careType || null,
    appointments: 0,
    documents: 0,
    hasAnamnese: false,
    anamneseStatus: null,
    adminReviewedAt: null,
    problemReasons: ctx.problemReasons,
  };
}

export async function loadUnlinkedPartnerIntakeContexts(queueAlertMinutes: number) {
  const intakes = await db.partnerIntake.findMany({
    where: { patientUserId: null },
    orderBy: { submittedAt: "desc" },
  });
  return intakes.map((intake) => deriveUnlinkedIntakeContext(intake, queueAlertMinutes));
}

export async function loadFullMonitoringData(queueAlertMinutes: number) {
  const patientContexts = await loadPatientMonitoringData(queueAlertMinutes);
  return { patientContexts, unlinkedIntakeContexts: [] as UnlinkedIntakeContext[] };
}

export interface UnlinkedIntakeDetailDto {
  kind: "unlinked_intake";
  id: string;
  protocolo: string;
  name: string;
  email: string;
  registeredAt: string;
  status: PatientMonitorStatus;
  statusDetail: string | null;
  journey: AdminPatientJourney;
  stuckAlerts: StuckAlert[];
  problemReasons: string[];
  acuraIntake: AcuraIntakeAdminDto;
  timeline: TimelineEvent[];
}

export async function loadUnlinkedIntakeDetail(
  protocolo: string,
  queueAlertMinutes: number,
): Promise<
  | { kind: "redirect"; profileId: string }
  | { kind: "detail"; detail: UnlinkedIntakeDetailDto }
  | null
> {
  const intake = await db.partnerIntake.findUnique({ where: { protocolo } });
  if (!intake) return null;

  if (intake.patientUserId) {
    const profile = await db.patientProfile.findUnique({
      where: { userId: intake.patientUserId },
      select: { id: true },
    });
    if (profile) return { kind: "redirect", profileId: profile.id };
  }

  const ctx = deriveUnlinkedIntakeContext(intake, queueAlertMinutes);
  const partnerEvents = await getPartnerIntakeEvents(intake.id);
  const acuraTimeline = partnerIntakeTimelineEvents(intake, partnerEvents);

  return {
    kind: "detail",
    detail: {
      kind: "unlinked_intake",
      id: intake.id,
      protocolo: intake.protocolo,
      name: unlinkedDisplayName(intake),
      email: intake.email,
      registeredAt: intake.submittedAt.toISOString(),
      status: ctx.status,
      statusDetail: ctx.statusDetail,
      journey: ctx.journey,
      stuckAlerts: ctx.stuckAlerts,
      problemReasons: ctx.problemReasons,
      acuraIntake: partnerIntakeToAdminDto(intake),
      timeline: acuraTimeline.map((ev) => ({
        id: ev.id,
        type: ev.type as TimelineEvent["type"],
        at: ev.at,
        title: ev.title,
        detail: ev.detail,
        link: null,
      })),
    },
  };
}

export async function loadPatientMonitoringData(queueAlertMinutes: number) {
  const profiles = await db.patientProfile.findMany({
    include: {
      user: {
        select: { email: true, region: true, language: true, phone: true, createdAt: true },
      },
      _count: { select: { appointments: true, medicalDocuments: true } },
    },
  });

  const userIds = profiles.map((p) => p.userId);

  const [humanitarianEntries, intakes, appointments, videoIncidents, partnerIntakes] =
    await Promise.all([
    db.humanitarianQueueEntry.findMany({
      where: { patientUserId: { in: userIds } },
      include: {
        pool: { select: { slug: true, labelPt: true, labelEs: true, labelEn: true } },
      },
      orderBy: { enteredAt: "desc" },
    }),
    db.humanitarianIntake.findMany({
      where: { patientUserId: { in: userIds } },
      select: {
        patientUserId: true,
        status: true,
        triageCompletedAt: true,
        telemedicineTcleAt: true,
        consentAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.appointment.findMany({
      where: { patient: { userId: { in: userIds } } },
      include: {
        professional: {
          select: { firstName: true, lastName: true, specialty: true, userId: true },
        },
        psychoanalyst: { select: { firstName: true, lastName: true, userId: true } },
        integrativeTherapist: {
          select: { firstName: true, lastName: true, userId: true },
        },
        documents: { select: { id: true } },
      },
      orderBy: { scheduledAt: "desc" },
    }),
    db.consultVideoIncident.findMany({
      where: { patientUserId: { in: userIds } },
      select: { id: true, patientUserId: true, kind: true, createdAt: true, notes: true },
      orderBy: { createdAt: "desc" },
    }),
    db.partnerIntake.findMany({
      where: { patientUserId: { in: userIds } },
      select: {
        patientUserId: true,
        protocolo: true,
        submittedAt: true,
        acuraStatus: true,
        priorityEnc: true,
        clickedDoctor8RegisterAt: true,
        clickedDoctor8LoginAt: true,
      },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  const entriesByUser = new Map<string, EntryWithPool[]>();
  for (const e of humanitarianEntries) {
    const list = entriesByUser.get(e.patientUserId) ?? [];
    list.push(e);
    entriesByUser.set(e.patientUserId, list);
  }

  const intakeUsers = new Set(intakes.map((i) => i.patientUserId));
  const intakeStatusByUser = new Map<string, string>();
  const intakeSnapshotByUser = new Map<string, ReturnType<typeof intakeToJourneySnapshot>>();
  for (const i of intakes) {
    if (!intakeStatusByUser.has(i.patientUserId)) {
      intakeStatusByUser.set(i.patientUserId, i.status);
      intakeSnapshotByUser.set(i.patientUserId, intakeToJourneySnapshot(i));
    }
  }

  const apptsByPatient = new Map<string, ApptRow[]>();
  for (const a of appointments) {
    const list = apptsByPatient.get(a.patientId) ?? [];
    list.push(a);
    apptsByPatient.set(a.patientId, list);
  }

  const incidentsByUser = new Map<string, typeof videoIncidents>();
  for (const v of videoIncidents) {
    const list = incidentsByUser.get(v.patientUserId) ?? [];
    list.push(v);
    incidentsByUser.set(v.patientUserId, list);
  }

  const partnerByUser = new Map<string, ReturnType<typeof partnerSnapshotFromRow>>();
  for (const p of partnerIntakes) {
    if (!p.patientUserId || partnerByUser.has(p.patientUserId)) continue;
    partnerByUser.set(p.patientUserId, partnerSnapshotFromRow(p));
  }

  const contexts = profiles.map((profile) =>
    derivePatientContext(
      profile as ProfileBundle,
      entriesByUser.get(profile.userId) ?? [],
      apptsByPatient.get(profile.id) ?? [],
      intakeUsers.has(profile.userId),
      intakeStatusByUser.get(profile.userId) ?? null,
      intakeSnapshotByUser.get(profile.userId) ?? null,
      partnerByUser.get(profile.userId) ?? null,
      incidentsByUser.get(profile.userId) ?? [],
      queueAlertMinutes,
    ),
  );

  return contexts;
}

export function filterAndSortPatients(
  contexts: PatientContext[],
  filters: PatientListFilters,
): PatientListRow[] {
  const q = filters.q?.trim().toLowerCase() ?? "";
  const qDigits = q.replace(/\D/g, "");

  let filtered = contexts;

  if (q) {
    filtered = contexts.filter((ctx) => {
      const name =
        `${safeDecrypt(ctx.profile.firstName)} ${safeDecrypt(ctx.profile.lastName)}`
          .trim()
          .toLowerCase();
      const qLower = q.toLowerCase();
      return (
        name.includes(qLower) ||
        (ctx.profile.user.email ?? "").toLowerCase().includes(qLower) ||
        (ctx.acuraProtocolo ?? "").toLowerCase().includes(qLower) ||
        matchesPhoneSearch(ctx.profile.user, ctx.profilePhone, qDigits)
      );
    });
  }

  if (filters.status) {
    filtered = filtered.filter((ctx) => ctx.status === filters.status);
    if (filters.status === "PENDING_D8_REGISTRATION") {
      filtered = [];
    }
  }
  if (filters.country) {
    filtered = filtered.filter(
      (ctx) =>
        (ctx.profile.country ?? ctx.profile.user.region ?? "").toUpperCase() ===
        filters.country!.toUpperCase(),
    );
  }
  if (filters.origin) {
    filtered = filtered.filter((ctx) => ctx.origin === filters.origin);
  }
  if (filters.acquisitionChannel) {
    filtered = filtered.filter(
      (ctx) => ctx.acquisitionChannel === filters.acquisitionChannel,
    );
  }
  if (filters.journeyStep) {
    filtered = filtered.filter(
      (ctx) => ctx.journey.currentStep === filters.journeyStep,
    );
  }
  if (filters.needsAttention) {
    filtered = filtered.filter(
      (ctx) => ctx.stuckAlerts.length > 0 || ctx.status === "PROBLEM",
    );
  }
  if (filters.lastSpecialty) {
    filtered = filtered.filter((ctx) =>
      (ctx.lastSpecialty ?? "").toLowerCase().includes(filters.lastSpecialty!.toLowerCase()),
    );
  }
  if (filters.registeredFrom) {
    const from = new Date(filters.registeredFrom);
    filtered = filtered.filter((ctx) => ctx.profile.createdAt >= from);
  }
  if (filters.registeredTo) {
    const to = endOfDay(new Date(filters.registeredTo));
    filtered = filtered.filter((ctx) => ctx.profile.createdAt <= to);
  }
  if (filters.reviewed === "yes") {
    filtered = filtered.filter((ctx) => ctx.profile.adminReviewedAt != null);
  } else if (filters.reviewed === "no") {
    filtered = filtered.filter((ctx) => ctx.profile.adminReviewedAt == null);
  }

  let rows = filtered.map(contextToListRow);

  const sort = filters.sort ?? "newest";
  rows.sort((a, b) => {
    if (sort === "oldest") {
      return new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime();
    }
    if (sort === "lastActivity") {
      const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return tb - ta;
    }
    return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
  });

  return rows;
}

export function filterAndSortMonitoringRows(
  patientContexts: PatientContext[],
  unlinkedContexts: UnlinkedIntakeContext[],
  filters: PatientListFilters,
): MonitoringListRow[] {
  const patientRows = filterAndSortPatients(patientContexts, filters).map((row) => ({
    ...row,
    kind: "patient" as const,
  }));

  const q = filters.q?.trim().toLowerCase() ?? "";
  const qDigits = q.replace(/\D/g, "");

  let filteredUnlinked = unlinkedContexts;

  if (q) {
    filteredUnlinked = unlinkedContexts.filter((ctx) => {
      const name = unlinkedDisplayName(ctx.intake).toLowerCase();
      return (
        name.includes(q) ||
        ctx.intake.email.toLowerCase().includes(q) ||
        ctx.intake.protocolo.toLowerCase().includes(q) ||
        ctx.intake.requesterName.toLowerCase().includes(q) ||
        (qDigits && phoneHintFromIntake(ctx.intake)?.includes(qDigits.slice(-4)))
      );
    });
  }

  if (filters.status) {
    if (filters.status === "PENDING_D8_REGISTRATION") {
      // All unlinked ACURA intakes are pending D8 registration
    } else {
      filteredUnlinked = filteredUnlinked.filter((ctx) => ctx.status === filters.status);
    }
  }
  if (filters.origin === "regular") {
    filteredUnlinked = [];
  }
  if (filters.acquisitionChannel && filters.acquisitionChannel !== "ACURA_SOS_FORM") {
    filteredUnlinked = [];
  }
  if (filters.journeyStep) {
    filteredUnlinked = filteredUnlinked.filter(
      (ctx) => ctx.journey.currentStep === filters.journeyStep,
    );
  }
  if (filters.needsAttention) {
    filteredUnlinked = filteredUnlinked.filter(
      (ctx) => ctx.stuckAlerts.length > 0 || ctx.status === "PROBLEM",
    );
  }
  if (filters.lastSpecialty) {
    filteredUnlinked = filteredUnlinked.filter((ctx) =>
      (safeDecrypt(ctx.intake.careTypeEnc) ?? "")
        .toLowerCase()
        .includes(filters.lastSpecialty!.toLowerCase()),
    );
  }
  if (filters.registeredFrom) {
    const from = new Date(filters.registeredFrom);
    filteredUnlinked = filteredUnlinked.filter((ctx) => ctx.intake.submittedAt >= from);
  }
  if (filters.registeredTo) {
    const to = endOfDay(new Date(filters.registeredTo));
    filteredUnlinked = filteredUnlinked.filter((ctx) => ctx.intake.submittedAt <= to);
  }
  if (filters.reviewed === "yes") {
    filteredUnlinked = [];
  }

  const unlinkedRows = filteredUnlinked.map(unlinkedContextToListRow);
  const merged = [...patientRows, ...unlinkedRows];

  const sort = filters.sort ?? "newest";
  merged.sort((a, b) => {
    if (sort === "oldest") {
      return new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime();
    }
    if (sort === "lastActivity") {
      const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return tb - ta;
    }
    return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
  });

  return merged;
}

export function buildFullMonitoringCounters(
  patientContexts: PatientContext[],
  unlinkedContexts: UnlinkedIntakeContext[],
): MonitoringCounters {
  const base = buildMonitoringCounters(patientContexts);
  return {
    ...base,
    // Acura integration retired: ignore unlinked partner intakes for admin monitoring.
    total: base.total,
    withProblem: base.withProblem,
    pendingAcuraRegistration: 0,
  };
}

export function buildFullMonitoringAlerts(
  patientContexts: PatientContext[],
  unlinkedContexts: UnlinkedIntakeContext[],
): MonitoringAlert[] {
  const alerts = buildMonitoringAlerts(patientContexts);
  return alerts;
}

export function buildMonitoringCounters(contexts: PatientContext[]): MonitoringCounters {
  const todayStart = startOfDay();
  let inQueue = 0;
  let inConsult = 0;
  let completedToday = 0;
  let withProblem = 0;
  let pendingReview = 0;

  for (const ctx of contexts) {
    if (ctx.status === "PROBLEM") withProblem++;
    if (ctx.status === "IN_QUEUE") inQueue++;
    if (ctx.status === "IN_CONSULT") inConsult++;
    if (!ctx.profile.adminReviewedAt) pendingReview++;

    const humToday = ctx.humanitarianEntries.some(
      (e) => e.status === "DONE" && e.endedAt && e.endedAt >= todayStart,
    );
    const apptToday = ctx.appointments.some(
      (a) => a.status === "COMPLETED" && a.updatedAt >= todayStart,
    );
    if (humToday || apptToday) completedToday++;
  }

  return {
    total: contexts.length,
    inQueue,
    inConsult,
    completedToday,
    withProblem,
    pendingReview,
    pendingAcuraRegistration: 0,
  };
}

export function buildMonitoringAlerts(contexts: PatientContext[]): MonitoringAlert[] {
  const alerts: MonitoringAlert[] = [];

  for (const ctx of contexts) {
    const name =
      `${safeDecrypt(ctx.profile.firstName)} ${safeDecrypt(ctx.profile.lastName)}`.trim() ||
      "Paciente";

    for (const reason of ctx.problemReasons) {
      let type: MonitoringAlert["type"] = "queue_wait";
      if (reason.includes("2h") || reason.includes("andamento")) type = "stuck_consult";
      else if (reason.includes("documentos")) type = "no_documents";
      else if (reason.includes("v?deo") || reason.includes("video")) type = "video_incident";
      else if (reason.includes("problema")) type = "stuck_consult";

      alerts.push({
        id: `${ctx.profile.id}-${type}-${reason.slice(0, 20)}`,
        type,
        patientProfileId: ctx.profile.id,
        patientUserId: ctx.profile.userId,
        patientName: name,
        message: reason,
        severity: reason.includes("2h") || reason.includes("CRISIS") ? "critical" : "warning",
        createdAt: ctx.lastActivityAt?.toISOString() ?? new Date().toISOString(),
      });
    }
  }

  return alerts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function appointmentOriginLabel(bookingSource: string | null): "volunteer_scheduled" | "paid" {
  if (bookingSource === SCHEDULED_VOLUNTEER_BOOKING_SOURCE) return "volunteer_scheduled";
  return "paid";
}

function appointmentTimelineTitle(
  status: string,
  origin: "volunteer_scheduled" | "paid",
): string {
  const originTag =
    origin === "volunteer_scheduled" ? "Voluntario agendado" : "Consulta paga";
  if (status === "COMPLETED") return `${originTag} — finalizada`;
  if (status === "CONFIRMED") return `${originTag} — agendada`;
  if (status === "PENDING") return `${originTag} — pendente`;
  if (status === "NO_SHOW") return `${originTag} — nao compareceu`;
  if (status === "CANCELLED") return `${originTag} — cancelada`;
  return `${originTag} (${status})`;
}

function statusLabelPt(s: HumanitarianQueueStatus): string {
  const map: Record<HumanitarianQueueStatus, string> = {
    WAITING: "Na fila",
    CALLED: "Chamado",
    IN_PROGRESS: "Em consulta",
    DONE: "Conclu?do",
    CANCELLED: "Cancelado",
    NO_SHOW: "N?o compareceu",
  };
  return map[s] ?? s;
}

function documentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    PRESCRIPTION: "Receita",
    EXAM_REQUEST: "Pedido de exame",
    EXAM_RESULT: "Resultado de exame",
    CERTIFICATE: "Atestado",
    REFERRAL: "Encaminhamento",
    CLINICAL_NOTE: "Nota cl?nica",
    OTHER: "Documento",
  };
  return map[type] ?? type;
}

export function buildPatientTimeline(ctx: PatientContext): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    id: `account-${ctx.profile.userId}`,
    type: "account_created",
    at: ctx.profile.user.createdAt.toISOString(),
    title: "Conta criada no Doctor8",
    detail: null,
    link: null,
  });

  const intake = ctx.intakeSnapshot;
  if (intake?.triageCompletedAt) {
    events.push({
      id: `intake-triage-${ctx.profile.userId}`,
      type: "intake_triage_completed",
      at: intake.triageCompletedAt.toISOString(),
      title: "Triagem humanitária concluída",
      detail: null,
      link: null,
    });
  }
  if (intake?.telemedicineTcleAt) {
    events.push({
      id: `intake-tcle-${ctx.profile.userId}`,
      type: "intake_tcle_accepted",
      at: intake.telemedicineTcleAt.toISOString(),
      title: "TCLE de telemedicina aceito",
      detail: null,
      link: null,
    });
  }
  if (intake?.status === "COMPLETE") {
    events.push({
      id: `intake-anamnese-${ctx.profile.userId}`,
      type: "intake_anamnese_completed",
      at: (intake.consentAt ?? intake.updatedAt)?.toISOString() ?? ctx.profile.user.createdAt.toISOString(),
      title: "Anamnese humanitária completa",
      detail: null,
      link: null,
    });
  }

  for (const e of ctx.humanitarianEntries) {
    const specialty = poolLabel(e.pool, "pt");
    events.push({
      id: `hq-enter-${e.id}`,
      type: "queue_joined",
      at: e.enteredAt.toISOString(),
      title: "Entrou na fila humanit?ria",
      detail: `${specialty} ? posi??o ${e.position}`,
      link: null,
      meta: { entryId: e.id, specialty },
    });
    if (e.calledAt) {
      events.push({
        id: `hq-called-${e.id}`,
        type: "queue_called",
        at: e.calledAt.toISOString(),
        title: "Chamado da fila",
        detail: specialty,
        link: null,
      });
    }
    if (e.startedAt) {
      events.push({
        id: `hq-start-${e.id}`,
        type: "consult_started",
        at: e.startedAt.toISOString(),
        title: "Consulta humanit?ria iniciada",
        detail: specialty,
        link: null,
      });
    }
    if (e.endedAt) {
      const dur =
        e.startedAt && e.endedAt
          ? Math.round((e.endedAt.getTime() - e.startedAt.getTime()) / 60000)
          : null;
      events.push({
        id: `hq-end-${e.id}`,
        type: "consult_ended",
        at: e.endedAt.toISOString(),
        title: "Consulta humanit?ria finalizada",
        detail: dur != null ? `Dura??o: ${dur} min` : statusLabelPt(e.status),
        link: null,
      });
    }
    if (e.adminRemovedAt) {
      events.push({
        id: `hq-admin-remove-${e.id}`,
        type: "admin_removed",
        at: e.adminRemovedAt.toISOString(),
        title: "Removido da fila pelo admin",
        detail: e.adminRemovalReason,
        link: null,
      });
    }
    if (e.adminProblemAt) {
      events.push({
        id: `hq-problem-${e.id}`,
        type: "admin_problem",
        at: e.adminProblemAt.toISOString(),
        title: "Marcado como problema",
        detail: e.adminProblemNote,
        link: null,
      });
    }
    if (e.status === "CANCELLED" && e.endedAt && !e.adminRemovedAt) {
      events.push({
        id: `hq-cancel-${e.id}`,
        type: "cancelled",
        at: e.endedAt.toISOString(),
        title: "Atendimento humanit?rio cancelado",
        detail: null,
        link: null,
      });
    }
  }

  for (const a of ctx.appointments) {
    let proName: string | null = null;
    if (a.professional) proName = `Dr. ${a.professional.firstName} ${a.professional.lastName}`;
    else if (a.psychoanalyst)
      proName = `${a.psychoanalyst.firstName} ${a.psychoanalyst.lastName}`;
    else if (a.integrativeTherapist)
      proName = `${a.integrativeTherapist.firstName} ${a.integrativeTherapist.lastName}`;

    if (a.status !== "CANCELLED") {
      const origin = appointmentOriginLabel(a.bookingSource);
      events.push({
        id: `appt-${a.id}`,
        type: a.status === "COMPLETED" ? "consult_ended" : "consult_started",
        at: a.scheduledAt.toISOString(),
        title: appointmentTimelineTitle(a.status, origin),
        detail: proName,
        link: null,
        meta: { origin, appointmentId: a.id },
      });
    }
    if (a.paidAt) {
      events.push({
        id: `pay-${a.id}`,
        type: "payment",
        at: a.paidAt.toISOString(),
        title: "Pagamento confirmado",
        detail: `${(a.priceAmount / 100).toFixed(2)} ${a.currency}`,
        link: null,
      });
    }
    if (a.cancelledAt) {
      events.push({
        id: `appt-cancel-${a.id}`,
        type: "cancelled",
        at: a.cancelledAt.toISOString(),
        title: "Consulta cancelada",
        detail: a.cancelReason,
        link: null,
      });
    }
    if (a.adminProblemAt) {
      events.push({
        id: `appt-problem-${a.id}`,
        type: "admin_problem",
        at: a.adminProblemAt.toISOString(),
        title: "Consulta marcada como problema",
        detail: a.adminProblemNote,
        link: null,
      });
    }
    for (const doc of a.documents) {
      events.push({
        id: `doc-${doc.id}`,
        type: "document",
        at: a.updatedAt.toISOString(),
        title: "Documento emitido",
        detail: null,
        link: `/patient/documents`,
        meta: { documentId: doc.id },
      });
    }
  }

  for (const v of ctx.videoIncidents) {
    events.push({
      id: `video-${v.id}`,
      type: "video_incident",
      at: v.createdAt.toISOString(),
      title: "Incidente de v?deo",
      detail: v.notes ?? v.kind,
      link: null,
    });
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export async function loadPatientDetail(
  profileId: string,
  queueAlertMinutes: number,
): Promise<PatientDetailDto | null> {
  const profile = await db.patientProfile.findUnique({
    where: { id: profileId },
    include: {
      user: {
        select: {
          email: true,
          region: true,
          language: true,
          phone: true,
          createdAt: true,
          emailVerified: true,
          phoneVerified: true,
          lockedUntil: true,
          failedLoginAttempts: true,
        },
      },
      _count: { select: { appointments: true, medicalDocuments: true } },
    },
  });
  if (!profile) return null;

  const [humanitarianEntries, intakeRecord, appointments, videoIncidents, medicalDocs, partnerIntakeRow] =
    await Promise.all([
      db.humanitarianQueueEntry.findMany({
        where: { patientUserId: profile.userId },
        include: {
          pool: { select: { slug: true, labelPt: true, labelEs: true, labelEn: true } },
          volunteer: {
            include: {
              user: { select: { id: true } },
              professional: {
                select: { id: true, firstName: true, lastName: true, specialty: true, userId: true },
              },
              psychoanalyst: {
                select: { id: true, firstName: true, lastName: true, userId: true },
              },
              integrativeTherapist: {
                select: { id: true, firstName: true, lastName: true, userId: true },
              },
            },
          },
        },
        orderBy: { enteredAt: "desc" },
      }),
      db.humanitarianIntake.findFirst({
        where: { patientUserId: profile.userId },
        orderBy: { updatedAt: "desc" },
      }),
      db.appointment.findMany({
        where: { patientId: profile.id },
        include: {
          professional: {
            select: { firstName: true, lastName: true, specialty: true, userId: true },
          },
          psychoanalyst: { select: { firstName: true, lastName: true, userId: true } },
          integrativeTherapist: {
            select: { firstName: true, lastName: true, userId: true },
          },
          documents: { select: { id: true, type: true, title: true } },
        },
        orderBy: { scheduledAt: "desc" },
      }),
      db.consultVideoIncident.findMany({
        where: { patientUserId: profile.userId },
        select: { id: true, kind: true, createdAt: true, notes: true },
        orderBy: { createdAt: "desc" },
      }),
      db.medicalDocument.findMany({
        where: { patientId: profile.id },
        select: { id: true, type: true, title: true, appointmentId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      getLatestPartnerIntakeForUser(profile.userId),
    ]);

  const partnerBundle = partnerIntakeRow ? partnerSnapshotFromRow(partnerIntakeRow) : null;

  const ctx = derivePatientContext(
    profile as ProfileBundle,
    humanitarianEntries,
    appointments as ApptRow[],
    Boolean(intakeRecord),
    intakeRecord?.status ?? null,
    intakeToJourneySnapshot(intakeRecord),
    partnerBundle,
    videoIncidents,
    queueAlertMinutes,
  );

  let activeQueue = null;
  if (ctx.activeEntry) {
    activeQueue = await getEntryStatusForAdmin(ctx.activeEntry.id, "pt");
  }

  let liveConsult: PatientDetailDto["liveConsult"] = null;
  const now = Date.now();

  if (ctx.activeEntry?.status === "IN_PROGRESS" && ctx.activeEntry.startedAt) {
    const vol = humanitarianEntries.find((e) => e.id === ctx.activeEntry!.id)?.volunteer;
    const info = volunteerDisplayName(vol);
    if (vol?.professional) {
      info.userId = vol.professional.userId;
      info.profileId = vol.professional.id;
    } else if (vol?.psychoanalyst) {
      info.userId = vol.psychoanalyst.userId;
      info.profileId = vol.psychoanalyst.id;
    } else if (vol?.integrativeTherapist) {
      info.userId = vol.integrativeTherapist.userId;
      info.profileId = vol.integrativeTherapist.id;
    }
    if (vol?.user) info.userId = vol.user.id;

    liveConsult = {
      kind: "humanitarian",
      id: ctx.activeEntry.id,
      professionalName: info.name,
      professionalUserId: info.userId,
      professionalProfileId: info.profileId,
      providerTab: info.tab,
      specialty: poolLabel(ctx.activeEntry.pool, "pt"),
      startedAt: ctx.activeEntry.startedAt.toISOString(),
      durationMinutes: Math.floor(
        (now - ctx.activeEntry.startedAt.getTime()) / 60000,
      ),
    };
  } else if (ctx.activeAppointment) {
    const a = ctx.activeAppointment;
    let professionalName: string | null = null;
    let professionalUserId: string | null = null;
    let specialty: string | null = null;
    let providerTab: string | null = null;
    if (a.professional) {
      professionalName = `Dr. ${a.professional.firstName} ${a.professional.lastName}`;
      professionalUserId = a.professional.userId;
      specialty = a.professional.specialty;
      providerTab = "medicine";
    } else if (a.psychoanalyst) {
      professionalName = `${a.psychoanalyst.firstName} ${a.psychoanalyst.lastName}`;
      professionalUserId = a.psychoanalyst.userId;
      specialty = "Psican?lise";
      providerTab = "psychoanalysis";
    } else if (a.integrativeTherapist) {
      professionalName = `${a.integrativeTherapist.firstName} ${a.integrativeTherapist.lastName}`;
      professionalUserId = a.integrativeTherapist.userId;
      specialty = "Terapia integrativa";
      providerTab = "integrative";
    }
    liveConsult = {
      kind: "appointment",
      id: a.id,
      professionalName,
      professionalUserId,
      professionalProfileId: null,
      providerTab,
      specialty,
      startedAt: a.scheduledAt.toISOString(),
      durationMinutes: Math.floor((now - a.scheduledAt.getTime()) / 60000),
    };
  }

  const timeline = buildPatientTimeline(ctx);

  if (partnerIntakeRow) {
    const partnerEvents = await getPartnerIntakeEvents(partnerIntakeRow.id);
    const acuraTimeline = partnerIntakeTimelineEvents(partnerIntakeRow, partnerEvents);
    for (const ev of acuraTimeline) {
      timeline.push({
        id: ev.id,
        type: ev.type as TimelineEvent["type"],
        at: ev.at,
        title: ev.title,
        detail: ev.detail,
        link: null,
      });
    }
  }

  for (const doc of medicalDocs) {
    if (doc.appointmentId) continue;
    timeline.push({
      id: `mdoc-${doc.id}`,
      type: "document",
      at: doc.createdAt.toISOString(),
      title: documentTypeLabel(doc.type),
      detail: safeDecrypt(doc.title) || null,
      link: `/patient/documents`,
      meta: { documentId: doc.id },
    });
  }
  timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const consultations: PatientDetailDto["consultations"] = [];

  for (const e of humanitarianEntries) {
    const vol = e.volunteer;
    const info = volunteerDisplayName(vol);
    const dur =
      e.startedAt && e.endedAt
        ? Math.round((e.endedAt.getTime() - e.startedAt.getTime()) / 60000)
        : e.startedAt
          ? Math.round((Date.now() - e.startedAt.getTime()) / 60000)
          : null;

    consultations.push({
      id: e.id,
      kind: "humanitarian",
      origin: "humanitarian",
      professionalName: info.name,
      specialty: poolLabel(e.pool, "pt"),
      scheduledAt: (e.startedAt ?? e.enteredAt).toISOString(),
      durationMinutes: dur,
      status: statusLabelPt(e.status),
      hasDocuments: false,
      documentIds: [],
      adminProblemAt: e.adminProblemAt?.toISOString() ?? null,
      adminProblemNote: e.adminProblemNote,
      canCancel: false,
    });
  }

  for (const a of appointments) {
    let professionalName: string | null = null;
    let specialty: string | null = null;
    if (a.professional) {
      professionalName = `Dr. ${a.professional.firstName} ${a.professional.lastName}`;
      specialty = a.professional.specialty;
    } else if (a.psychoanalyst) {
      professionalName = `${a.psychoanalyst.firstName} ${a.psychoanalyst.lastName}`;
      specialty = "Psican?lise";
    } else if (a.integrativeTherapist) {
      professionalName = `${a.integrativeTherapist.firstName} ${a.integrativeTherapist.lastName}`;
      specialty = "Terapia integrativa";
    }

    consultations.push({
      id: a.id,
      kind: "appointment",
      origin: appointmentOriginLabel(a.bookingSource),
      professionalName,
      specialty,
      scheduledAt: a.scheduledAt.toISOString(),
      durationMinutes: a.durationMins,
      status: a.status,
      hasDocuments: a.documents.length > 0,
      documentIds: a.documents.map((d) => d.id),
      adminProblemAt: a.adminProblemAt?.toISOString() ?? null,
      adminProblemNote: a.adminProblemNote,
      canCancel: ["CONFIRMED", "PENDING"].includes(a.status) && a.scheduledAt >= new Date(),
    });
  }

  consultations.sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  );

  const hasHumanitarianHistory = humanitarianEntries.length > 0;
  const hasFutureVolunteerScheduled = appointments.some(
    (a) =>
      a.bookingSource === SCHEDULED_VOLUNTEER_BOOKING_SOURCE &&
      ["CONFIRMED", "PENDING"].includes(a.status) &&
      a.scheduledAt >= new Date(),
  );
  const journeyHighlight = hasHumanitarianHistory && hasFutureVolunteerScheduled;

  const profilePhone = safeDecrypt(profile.phone);
  const accountLocked = !!profile.user.lockedUntil && profile.user.lockedUntil.getTime() > now;

  let anamnese: PatientDetailDto["anamnese"] = null;
  if (intakeRecord) {
    const summary = buildIntakeSummary(intakeRecord, profile.user.language === "pt" ? "pt" : profile.user.language === "en" ? "en" : "es");
    anamnese = {
      priority: summary.priority,
      status: summary.status,
      anamneseComplete: summary.anamneseComplete,
      sections: summary.sections,
      submittedAt: intakeRecord.consentAt?.toISOString() ?? intakeRecord.updatedAt.toISOString(),
    };
  }

  const acuraIntake = partnerIntakeRow ? partnerIntakeToAdminDto(partnerIntakeRow) : null;

  return {
    id: profile.id,
    userId: profile.userId,
    name: `${safeDecrypt(profile.firstName)} ${safeDecrypt(profile.lastName)}`.trim() || "?",
    email: profile.user.email,
    country: profile.country ?? profile.user.region ?? null,
    language: profile.user.language,
    region: profile.user.region,
    registeredAt: profile.createdAt.toISOString(),
    origin: ctx.origin,
    acquisitionChannel: ctx.acquisitionChannel,
    acquisitionReferrer: profile.acquisitionReferrer ?? null,
    status: ctx.status,
    statusDetail: ctx.statusDetail,
    phoneHint: phoneHintFromUser(profile.user, profilePhone),
    activeQueue,
    liveConsult,
    timeline,
    journey: ctx.journey,
    stuckAlerts: ctx.stuckAlerts,
    acuraIntake,
    consultations,
    journeyHighlight,
    problemReasons: ctx.problemReasons,
    adminNote: profile.adminNote ?? null,
    adminReviewedAt: profile.adminReviewedAt?.toISOString() ?? null,
    emailVerified: !!(profile.user.emailVerified || profile.user.phoneVerified),
    accountLocked,
    failedLoginAttempts: profile.user.failedLoginAttempts,
    anamnese,
  };
}

export function getDefaultQueueAlertMinutes(): number {
  const raw = process.env.ADMIN_QUEUE_ALERT_MINUTES;
  const n = raw ? parseInt(raw, 10) : 30;
  return Number.isFinite(n) && n > 0 ? n : 30;
}

export function listDistinctCountries(contexts: PatientContext[]): string[] {
  const set = new Set<string>();
  for (const ctx of contexts) {
    const c = ctx.profile.country ?? ctx.profile.user.region;
    if (c) set.add(c.toUpperCase());
  }
  return [...set].sort();
}

export function listDistinctSpecialties(contexts: PatientContext[]): string[] {
  const set = new Set<string>();
  for (const ctx of contexts) {
    if (ctx.lastSpecialty) set.add(ctx.lastSpecialty);
  }
  return [...set].sort();
}

export type { PatientContext };
