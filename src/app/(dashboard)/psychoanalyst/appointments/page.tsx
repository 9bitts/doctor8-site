import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { translate, normalizeLang, Lang } from "@/lib/i18n/translations";
import { decrypt } from "@/lib/encryption";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";
import PsychoanalystAppointmentsView, {
  type PsychoanalystAppointmentRow,
} from "@/components/psychoanalyst/PsychoanalystAppointmentsView";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

export default async function PsychoanalystAppointmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PSYCHOANALYST") redirect("/patient");

  const userRow = await db.user.findUnique({
    where: { id: session.user.id },
    select: { language: true, timezone: true },
  });
  const lang: Lang = normalizeLang(userRow?.language);
  const t = (key: string) => translate(lang, key);
  const providerTz = userRow?.timezone || DEFAULT_TIME_ZONE;

  const profile = await db.psychoanalystProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) redirect("/psychoanalyst/settings");

  const appointments = await db.appointment.findMany({
    where: { psychoanalystId: profile.id },
    include: {
      patient: { select: { firstName: true, lastName: true, userId: true, phone: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: 100,
  });

  const patientUserIds = appointments.map((a) => a.patient.userId);
  const analysands = await db.analysandRecord.findMany({
    where: {
      psychoanalystId: profile.id,
      linkedUserId: { in: patientUserIds },
    },
    select: { id: true, linkedUserId: true },
  });
  const analysandByUserId = new Map(
    analysands.filter((a) => a.linkedUserId).map((a) => [a.linkedUserId!, a.id]),
  );

  const rows: PsychoanalystAppointmentRow[] = appointments.map((apt) => {
    return {
      id: apt.id,
      scheduledAt: apt.scheduledAt.toISOString(),
      status: apt.status,
      type: apt.type,
      patientFirstName: safeDecrypt(apt.patient.firstName),
      patientLastName: safeDecrypt(apt.patient.lastName),
      patientUserId: apt.patient.userId,
      patientPhone: safeDecrypt(apt.patient.phone) || null,
      patientConfirmedAt: apt.patientConfirmedAt?.toISOString() ?? null,
      intakeHealthPlanLabel: null,
      intakeServiceName: null,
      intakeVisitReason: null,
      analysandId: analysandByUserId.get(apt.patient.userId) ?? null,
    };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("proappt.title")}</h1>
        <p className="text-slate-500 mt-1">{t("pa.dash.subtitle")}</p>
      </div>
      <PsychoanalystAppointmentsView initialAppointments={rows} timeZone={providerTz} />
    </div>
  );
}
