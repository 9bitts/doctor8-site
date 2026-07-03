import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { poolLabel } from "@/lib/humanitarian/constants";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

function formatDatePt(d: Date): string {
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface ConsultationExportRow {
  patientName: string;
  phone: string;
  attendedAt: Date;
  professionalName: string;
  specialty: string;
  kind: "humanitarian" | "appointment";
}

export async function loadConsultationsForExport(
  consultFrom: string,
  consultTo: string,
): Promise<ConsultationExportRow[]> {
  const from = startOfDay(new Date(consultFrom));
  const to = endOfDay(new Date(consultTo));

  const [humanitarianEntries, appointments] = await Promise.all([
    db.humanitarianQueueEntry.findMany({
      where: {
        status: "DONE",
        OR: [
          { endedAt: { gte: from, lte: to } },
          { endedAt: null, startedAt: { gte: from, lte: to } },
        ],
      },
      include: {
        pool: { select: { slug: true, labelPt: true, labelEs: true, labelEn: true } },
        patientUser: {
          select: {
            phone: true,
            patientProfile: {
              select: { firstName: true, lastName: true, phone: true },
            },
          },
        },
        volunteer: {
          include: {
            professional: { select: { firstName: true, lastName: true } },
            psychoanalyst: { select: { firstName: true, lastName: true } },
            integrativeTherapist: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { endedAt: "asc" },
    }),
    db.appointment.findMany({
      where: {
        status: "COMPLETED",
        scheduledAt: { gte: from, lte: to },
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            user: { select: { phone: true } },
          },
        },
        professional: { select: { firstName: true, lastName: true, specialty: true } },
        psychoanalyst: { select: { firstName: true, lastName: true } },
        integrativeTherapist: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  const rows: ConsultationExportRow[] = [];

  for (const e of humanitarianEntries) {
    const profile = e.patientUser.patientProfile;
    const name = profile
      ? `${safeDecrypt(profile.firstName)} ${safeDecrypt(profile.lastName)}`.trim()
      : "?";
    const phone =
      safeDecrypt(profile?.phone) ||
      e.patientUser.phone?.replace(/\D/g, "") ||
      "";

    let professionalName = "Nao identificado";
    if (e.volunteer?.professional) {
      professionalName = `Dr. ${e.volunteer.professional.firstName} ${e.volunteer.professional.lastName}`;
    } else if (e.volunteer?.psychoanalyst) {
      professionalName = `${e.volunteer.psychoanalyst.firstName} ${e.volunteer.psychoanalyst.lastName}`;
    } else if (e.volunteer?.integrativeTherapist) {
      professionalName = `${e.volunteer.integrativeTherapist.firstName} ${e.volunteer.integrativeTherapist.lastName}`;
    }

    const attendedAt = e.endedAt ?? e.startedAt ?? e.enteredAt;
    if (attendedAt < from || attendedAt > to) continue;

    rows.push({
      patientName: name || "?",
      phone,
      attendedAt,
      professionalName,
      specialty: poolLabel(e.pool, "pt"),
      kind: "humanitarian",
    });
  }

  for (const a of appointments) {
    const name =
      `${safeDecrypt(a.patient.firstName)} ${safeDecrypt(a.patient.lastName)}`.trim() || "?";
    const phone =
      safeDecrypt(a.patient.phone) || a.patient.user.phone?.replace(/\D/g, "") || "";

    let professionalName = "Nao identificado";
    let specialty = "";
    if (a.professional) {
      professionalName = `Dr. ${a.professional.firstName} ${a.professional.lastName}`;
      specialty = a.professional.specialty;
    } else if (a.psychoanalyst) {
      professionalName = `${a.psychoanalyst.firstName} ${a.psychoanalyst.lastName}`;
      specialty = "Psicanalise";
    } else if (a.integrativeTherapist) {
      professionalName = `${a.integrativeTherapist.firstName} ${a.integrativeTherapist.lastName}`;
      specialty = "Terapia integrativa";
    }

    rows.push({
      patientName: name,
      phone,
      attendedAt: a.scheduledAt,
      professionalName,
      specialty,
      kind: "appointment",
    });
  }

  rows.sort((a, b) => a.attendedAt.getTime() - b.attendedAt.getTime());
  return rows;
}

export function buildConsultationsCsv(rows: ConsultationExportRow[]): string {
  const headers = ["nome", "telefone", "data_atendimento", "profissional", "especialidade", "tipo"];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        csvEscape(r.patientName),
        csvEscape(r.phone),
        csvEscape(formatDatePt(r.attendedAt)),
        csvEscape(r.professionalName),
        csvEscape(r.specialty),
        csvEscape(r.kind === "humanitarian" ? "humanitario" : "regular"),
      ].join(","),
    ),
  ];
  return lines.join("\n");
}
