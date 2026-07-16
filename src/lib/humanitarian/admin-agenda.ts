import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { SCHEDULED_VOLUNTEER_BOOKING_SOURCE } from "@/lib/scheduled-volunteer";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

function patientName(profile: {
  firstName: string;
  lastName: string;
} | null | undefined): string {
  if (!profile) return "Paciente";
  return `${safeDecrypt(profile.firstName)} ${safeDecrypt(profile.lastName)}`.trim() || "Paciente";
}

function providerName(apt: {
  professional: { firstName: string; lastName: string } | null;
  psychoanalyst: { firstName: string; lastName: string } | null;
  integrativeTherapist: { firstName: string; lastName: string } | null;
}): string | null {
  if (apt.professional) {
    return `Dr. ${apt.professional.firstName} ${apt.professional.lastName}`.trim();
  }
  if (apt.psychoanalyst) {
    return `${apt.psychoanalyst.firstName} ${apt.psychoanalyst.lastName}`.trim();
  }
  if (apt.integrativeTherapist) {
    return `${apt.integrativeTherapist.firstName} ${apt.integrativeTherapist.lastName}`.trim();
  }
  return null;
}

export type AgendaItemKind = "queue" | "scheduled";

export interface AgendaItemDto {
  id: string;
  kind: AgendaItemKind;
  status: string;
  scheduledAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  patientProfileId: string | null;
  patientName: string;
  professionalName: string | null;
  specialty: string | null;
  poolLabel: string | null;
  channel: string | null;
  meetingUrl: string | null;
  priority: string | null;
}

export interface AgendaFilters {
  from: Date;
  to: Date;
  kind?: "queue" | "scheduled" | "all";
  status?: string;
  q?: string;
}

export async function buildHumanitarianAgenda(
  campaignId: string,
  filters: AgendaFilters,
): Promise<AgendaItemDto[]> {
  const kind = filters.kind ?? "all";
  const items: AgendaItemDto[] = [];
  const statusFilter = filters.status && filters.status !== "all" ? filters.status : null;

  const QUEUE_STATUSES = new Set([
    "WAITING",
    "CALLED",
    "IN_PROGRESS",
    "DONE",
    "NO_SHOW",
    "CANCELLED",
  ]);
  const APPT_STATUSES = new Set([
    "PENDING",
    "CONFIRMED",
    "CANCELLED",
    "COMPLETED",
    "NO_SHOW",
  ]);

  if (kind === "all" || kind === "queue") {
    const queueStatus =
      statusFilter && QUEUE_STATUSES.has(statusFilter) ? statusFilter : undefined;
    // Skip queue query if filtering by appointment-only status
    if (!statusFilter || queueStatus) {
      const entries = await db.humanitarianQueueEntry.findMany({
        where: {
          campaignId,
          OR: [
            {
              status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] },
            },
            {
              endedAt: { gte: filters.from, lte: filters.to },
            },
            {
              enteredAt: { gte: filters.from, lte: filters.to },
              status: { in: ["DONE", "NO_SHOW", "CANCELLED"] },
            },
          ],
          ...(queueStatus ? { status: queueStatus as never } : {}),
        },
        include: {
          pool: { select: { labelPt: true, labelEs: true, slug: true } },
          patientUser: {
            select: {
              patientProfile: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          volunteer: {
            include: {
              professional: { select: { firstName: true, lastName: true, specialty: true } },
              psychoanalyst: { select: { firstName: true, lastName: true } },
              integrativeTherapist: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { enteredAt: "desc" },
        take: 500,
      });

      for (const e of entries) {
        const start = e.startedAt ?? e.enteredAt;
        const end = e.endedAt;
        const durationMinutes =
          e.startedAt && end
            ? Math.max(0, Math.round((end.getTime() - e.startedAt.getTime()) / 60000))
            : e.startedAt
              ? Math.max(0, Math.round((Date.now() - e.startedAt.getTime()) / 60000))
              : null;

        let professionalName: string | null = null;
        let specialty: string | null = e.pool.labelPt || e.pool.labelEs;
        if (e.volunteer?.professional) {
          professionalName = `Dr. ${e.volunteer.professional.firstName} ${e.volunteer.professional.lastName}`;
          specialty = e.volunteer.professional.specialty || specialty;
        } else if (e.volunteer?.psychoanalyst) {
          professionalName = `${e.volunteer.psychoanalyst.firstName} ${e.volunteer.psychoanalyst.lastName}`;
        } else if (e.volunteer?.integrativeTherapist) {
          professionalName = `${e.volunteer.integrativeTherapist.firstName} ${e.volunteer.integrativeTherapist.lastName}`;
        }

        items.push({
          id: e.id,
          kind: "queue",
          status: e.status,
          scheduledAt: start.toISOString(),
          endedAt: end?.toISOString() ?? null,
          durationMinutes,
          patientProfileId: e.patientUser.patientProfile?.id ?? null,
          patientName: patientName(e.patientUser.patientProfile),
          professionalName,
          specialty,
          poolLabel: e.pool.labelPt || e.pool.labelEs,
          channel: e.completionChannel,
          meetingUrl: e.meetingUrl,
          priority: e.priority,
        });
      }
    }
  }

  if (kind === "all" || kind === "scheduled") {
    const apptStatus =
      statusFilter && APPT_STATUSES.has(statusFilter) ? statusFilter : undefined;
    if (!statusFilter || apptStatus) {
      const appointments = await db.appointment.findMany({
        where: {
          bookingSource: SCHEDULED_VOLUNTEER_BOOKING_SOURCE,
          scheduledAt: { gte: filters.from, lte: filters.to },
          ...(apptStatus ? { status: apptStatus as never } : {}),
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          professional: { select: { firstName: true, lastName: true, specialty: true } },
          psychoanalyst: { select: { firstName: true, lastName: true } },
          integrativeTherapist: { select: { firstName: true, lastName: true } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 500,
      });

      for (const a of appointments) {
        items.push({
          id: a.id,
          kind: "scheduled",
          status: a.status,
          scheduledAt: a.scheduledAt.toISOString(),
          endedAt: null,
          durationMinutes: a.durationMins,
          patientProfileId: a.patient.id,
          patientName: patientName(a.patient),
          professionalName: providerName(a),
          specialty:
            a.professional?.specialty ??
            (a.psychoanalyst ? "Psicanálise" : a.integrativeTherapist ? "PICS" : null),
          poolLabel: null,
          channel: a.videoChannel,
          meetingUrl: a.meetingUrl,
          priority: null,
        });
      }
    }
  }

  let result = items;
  if (filters.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    result = items.filter(
      (i) =>
        i.patientName.toLowerCase().includes(q) ||
        (i.professionalName?.toLowerCase().includes(q) ?? false) ||
        (i.specialty?.toLowerCase().includes(q) ?? false) ||
        (i.poolLabel?.toLowerCase().includes(q) ?? false),
    );
  }

  result.sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );

  return result;
}

export function agendaToCsv(items: AgendaItemDto[]): string {
  const header = [
    "kind",
    "id",
    "status",
    "scheduledAt",
    "endedAt",
    "durationMinutes",
    "patientName",
    "professionalName",
    "specialty",
    "pool",
    "channel",
    "priority",
  ].join(",");
  const rows = items.map((i) =>
    [
      i.kind,
      i.id,
      i.status,
      i.scheduledAt,
      i.endedAt ?? "",
      i.durationMinutes ?? "",
      csvEscape(i.patientName),
      csvEscape(i.professionalName ?? ""),
      csvEscape(i.specialty ?? ""),
      csvEscape(i.poolLabel ?? ""),
      i.channel ?? "",
      i.priority ?? "",
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
