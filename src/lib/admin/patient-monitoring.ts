import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { isWithinAppointmentJoinWindow } from "@/lib/appointment-join-window";
import { getEntryStatusForAdmin } from "@/lib/humanitarian/dispatcher";
import { poolLabel } from "@/lib/humanitarian/constants";
import type {
  Appointment,
  HumanitarianQueueEntry,
  HumanitarianQueueStatus,
  PatientProfile,
  User,
} from "@prisma/client";

export type PatientMonitorStatus =
  | "IN_QUEUE"
  | "IN_CONSULT"
  | "ATTENDED"
  | "INACTIVE"
  | "PROBLEM";

export type PatientOrigin = "humanitarian" | "regular";

export interface PatientListFilters {
  q?: string;
  status?: PatientMonitorStatus;
  country?: string;
  origin?: PatientOrigin;
  registeredFrom?: string;
  registeredTo?: string;
  lastSpecialty?: string;
  sort?: "newest" | "oldest" | "lastActivity";
  queueAlertMinutes?: number;
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
  status: PatientMonitorStatus;
  statusDetail: string | null;
  registeredAt: string;
  lastActivityAt: string | null;
  lastSpecialty: string | null;
  appointments: number;
  documents: number;
  activeQueueEntryId: string | null;
  problemReasons: string[];
}

export interface MonitoringCounters {
  total: number;
  inQueue: number;
  inConsult: number;
  completedToday: number;
  withProblem: number;
}

export interface MonitoringAlert {
  id: string;
  type: "queue_wait" | "stuck_consult" | "no_documents" | "video_incident";
  patientProfileId: string;
  patientUserId: string;
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
    | "admin_problem";
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
  consultations: {
    id: string;
    kind: "humanitarian" | "appointment";
    professionalName: string | null;
    specialty: string | null;
    scheduledAt: string;
    durationMinutes: number | null;
    status: string;
    hasDocuments: boolean;
    documentIds: string[];
    adminProblemAt: string | null;
    adminProblemNote: string | null;
  }[];
  problemReasons: string[];
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
};

type EntryWithPool = HumanitarianQueueEntry & {
  pool: { slug: string; labelPt: string; labelEs: string; labelEn: string };
};

type ApptRow = Appointment & {
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
  videoIncidents: { id: string; kind: string; createdAt: Date; notes: string | null }[];
  activeEntry: EntryWithPool | null;
  activeAppointment: ApptRow | null;
  lastSpecialty: string | null;
  lastActivityAt: Date | null;
  origin: PatientOrigin;
  status: PatientMonitorStatus;
  statusDetail: string | null;
  problemReasons: string[];
}

function derivePatientContext(
  profile: ProfileBundle,
  humanitarianEntries: EntryWithPool[],
  appointments: ApptRow[],
  hasIntake: boolean,
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

  const origin: PatientOrigin =
    humanitarianEntries.length > 0 || hasIntake ? "humanitarian" : "regular";

  const problemReasons: string[] = [];

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
    if (e.status === "WAITING") {
      const waitMin = Math.floor((now.getTime() - e.enteredAt.getTime()) / 60000);
      if (waitMin >= queueAlertMinutes) {
        problemReasons.push(`Na fila h? ${waitMin} min (limite ${queueAlertMinutes} min)`);
      }
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
    videoIncidents,
    activeEntry,
    activeAppointment,
    lastSpecialty,
    lastActivityAt,
    origin,
    status,
    statusDetail,
    problemReasons,
  };
}

function contextToListRow(ctx: PatientContext): PatientListRow {
  const p = ctx.profile;
  return {
    id: p.id,
    userId: p.userId,
    name: `${safeDecrypt(p.firstName)} ${safeDecrypt(p.lastName)}`.trim() || "?",
    email: p.user.email,
    phoneHint: phoneHintFromUser(p.user, ctx.profilePhone),
    country: p.country ?? p.user.region ?? null,
    language: p.user.language,
    origin: ctx.origin,
    status: ctx.status,
    statusDetail: ctx.statusDetail,
    registeredAt: p.createdAt.toISOString(),
    lastActivityAt: ctx.lastActivityAt?.toISOString() ?? null,
    lastSpecialty: ctx.lastSpecialty,
    appointments: p._count.appointments,
    documents: p._count.medicalDocuments,
    activeQueueEntryId: ctx.activeEntry?.id ?? null,
    problemReasons: ctx.problemReasons,
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

  const [humanitarianEntries, intakes, appointments, videoIncidents] = await Promise.all([
    db.humanitarianQueueEntry.findMany({
      where: { patientUserId: { in: userIds } },
      include: {
        pool: { select: { slug: true, labelPt: true, labelEs: true, labelEn: true } },
      },
      orderBy: { enteredAt: "desc" },
    }),
    db.humanitarianIntake.findMany({
      where: { patientUserId: { in: userIds } },
      select: { patientUserId: true },
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
  ]);

  const entriesByUser = new Map<string, EntryWithPool[]>();
  for (const e of humanitarianEntries) {
    const list = entriesByUser.get(e.patientUserId) ?? [];
    list.push(e);
    entriesByUser.set(e.patientUserId, list);
  }

  const intakeUsers = new Set(intakes.map((i) => i.patientUserId));

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

  const contexts = profiles.map((profile) =>
    derivePatientContext(
      profile as ProfileBundle,
      entriesByUser.get(profile.userId) ?? [],
      apptsByPatient.get(profile.id) ?? [],
      intakeUsers.has(profile.userId),
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
      return (
        name.includes(q) ||
        (ctx.profile.user.email ?? "").toLowerCase().includes(q) ||
        matchesPhoneSearch(ctx.profile.user, ctx.profilePhone, qDigits)
      );
    });
  }

  if (filters.status) {
    filtered = filtered.filter((ctx) => ctx.status === filters.status);
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

export function buildMonitoringCounters(contexts: PatientContext[]): MonitoringCounters {
  const todayStart = startOfDay();
  let inQueue = 0;
  let inConsult = 0;
  let completedToday = 0;
  let withProblem = 0;

  for (const ctx of contexts) {
    if (ctx.status === "PROBLEM") withProblem++;
    if (ctx.status === "IN_QUEUE") inQueue++;
    if (ctx.status === "IN_CONSULT") inConsult++;

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
      events.push({
        id: `appt-${a.id}`,
        type: a.status === "COMPLETED" ? "consult_ended" : "consult_started",
        at: a.scheduledAt.toISOString(),
        title:
          a.status === "COMPLETED"
            ? "Consulta finalizada"
            : a.status === "CONFIRMED"
              ? "Consulta agendada"
              : `Consulta (${a.status})`,
        detail: proName,
        link: null,
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
        select: { email: true, region: true, language: true, phone: true, createdAt: true },
      },
      _count: { select: { appointments: true, medicalDocuments: true } },
    },
  });
  if (!profile) return null;

  const [humanitarianEntries, hasIntake, appointments, videoIncidents, medicalDocs] =
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
      db.humanitarianIntake.count({ where: { patientUserId: profile.userId } }),
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
    ]);

  const ctx = derivePatientContext(
    profile as ProfileBundle,
    humanitarianEntries,
    appointments as ApptRow[],
    hasIntake > 0,
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
      professionalName: info.name,
      specialty: poolLabel(e.pool, "pt"),
      scheduledAt: (e.startedAt ?? e.enteredAt).toISOString(),
      durationMinutes: dur,
      status: statusLabelPt(e.status),
      hasDocuments: false,
      documentIds: [],
      adminProblemAt: e.adminProblemAt?.toISOString() ?? null,
      adminProblemNote: e.adminProblemNote,
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
      professionalName,
      specialty,
      scheduledAt: a.scheduledAt.toISOString(),
      durationMinutes: a.durationMins,
      status: a.status,
      hasDocuments: a.documents.length > 0,
      documentIds: a.documents.map((d) => d.id),
      adminProblemAt: a.adminProblemAt?.toISOString() ?? null,
      adminProblemNote: a.adminProblemNote,
    });
  }

  consultations.sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  );

  const profilePhone = safeDecrypt(profile.phone);

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
    status: ctx.status,
    statusDetail: ctx.statusDetail,
    phoneHint: phoneHintFromUser(profile.user, profilePhone),
    activeQueue,
    liveConsult,
    timeline,
    consultations,
    problemReasons: ctx.problemReasons,
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
