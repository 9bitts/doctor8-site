// src/app/(dashboard)/professional/appointments/page.tsx

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { translate, normalizeLang, Lang } from "@/lib/i18n/translations";
import { intakeDisplayForProvider } from "@/lib/appointment-intake";
import { isWithinAppointmentJoinWindow } from "@/lib/appointment-join-window";
import { decrypt } from "@/lib/encryption";
import { resolveHealthProfessionalPortalBaseForUser } from "@/lib/nutritionist-portal";
import { isDentistSpecialty } from "@/lib/profession-label";
import AppointmentsAnchorClient from "@/components/professional/AppointmentsAnchorClient";
import ProfessionalAppointmentsView, {
  type ProfessionalAppointmentRow,
} from "@/components/professional/ProfessionalAppointmentsView";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";
import { parseAvailabilityJson } from "@/lib/availability-exceptions";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

export default async function ProfessionalAppointments() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROFESSIONAL") redirect("/patient");

  const userRow = await db.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const lang: Lang = normalizeLang(userRow?.language);
  const t = (key: string) => translate(lang, key);

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) redirect("/onboarding");

  const providerTz = professional.timezone || DEFAULT_TIME_ZONE;
  const volunteerBlocks =
    parseAvailabilityJson(professional.availability).volunteerBlocks ?? [];

  const portalBase = await resolveHealthProfessionalPortalBaseForUser(session.user.id);
  const isPsychologistPortal = portalBase === "/psychologist";
  const isDentistPortal = isDentistSpecialty(professional.specialty);

  const dentalChairs = isDentistPortal
    ? await db.dentalChair.findMany({
        where: { professionalId: professional.id, active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      })
    : [];

  const now = new Date();
  const rangeStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const appointments = await db.appointment.findMany({
    where: {
      professionalId: professional.id,
      scheduledAt: { gte: rangeStart, lte: rangeEnd },
    },
    include: {
      patient: { select: { firstName: true, lastName: true, userId: true, phone: true } },
      dentalChair: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });

  const linkedUserIds = [
    ...new Set(appointments.map((a) => a.patient.userId).filter(Boolean)),
  ] as string[];

  const charts = linkedUserIds.length
    ? await db.patientRecord.findMany({
        where: {
          professionalId: professional.id,
          linkedUserId: { in: linkedUserIds },
        },
        select: { id: true, linkedUserId: true },
      })
    : [];

  const chartIdByUserId: Record<string, string> = Object.fromEntries(
    charts.map((c) => [c.linkedUserId!, c.id]),
  );

  const chartIds = Object.values(chartIdByUserId);
  const summarizeDocs = chartIds.length
    ? await db.medicalDocument.findMany({
        where: { patientRecordId: { in: chartIds } },
        orderBy: { createdAt: "desc" },
        distinct: ["patientRecordId"],
        select: { id: true, patientRecordId: true },
      })
    : [];
  const summarizeDocumentIdByChartId: Record<string, string> = Object.fromEntries(
    summarizeDocs
      .filter((doc) => doc.patientRecordId)
      .map((doc) => [doc.patientRecordId!, doc.id]),
  );

  await audit.viewRecord(session.user.id, "Appointment", "list");

  const rows: ProfessionalAppointmentRow[] = appointments.map((apt) => {
    const intakeFields = intakeDisplayForProvider(
      apt.chiefComplaint,
      apt.scheduledAt,
      apt.durationMins,
      isWithinAppointmentJoinWindow,
    );
    const patientUserId = apt.patient.userId;
    const chartId = patientUserId ? chartIdByUserId[patientUserId] ?? null : null;

    return {
      id: apt.id,
      scheduledAt: apt.scheduledAt.toISOString(),
      durationMins: apt.durationMins,
      type: apt.type,
      status: apt.status,
      hasNotes: Boolean(apt.notes),
      patientConfirmedAt: apt.patientConfirmedAt?.toISOString() ?? null,
      patientFirstName: safeDecrypt(apt.patient.firstName),
      patientLastName: safeDecrypt(apt.patient.lastName),
      patientUserId,
      patientPhone: safeDecrypt(apt.patient.phone) || null,
      patientJoinedAt: apt.patientJoinedAt?.toISOString() ?? null,
      professionalJoinedAt: apt.professionalJoinedAt?.toISOString() ?? null,
      chartId,
      summarizeDocumentId: chartId ? summarizeDocumentIdByChartId[chartId] ?? null : null,
      ...intakeFields,
      bookingSource: apt.bookingSource,
      priceAmount: apt.priceAmount,
      dentalChairId: apt.dentalChairId,
      dentalChairName: apt.dentalChair?.name ?? null,
    };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <AppointmentsAnchorClient />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("proappt.title")}</h1>
        <p className="text-slate-500 mt-1">{t("proappt.subtitle")}</p>
      </div>

      <ProfessionalAppointmentsView
        initialAppointments={rows}
        timeZone={providerTz}
        portalBase={portalBase}
        isPsychologistPortal={isPsychologistPortal}
        isDentistPortal={isDentistPortal}
        dentalChairs={dentalChairs}
        volunteerBlocks={volunteerBlocks}
      />
    </div>
  );
}
