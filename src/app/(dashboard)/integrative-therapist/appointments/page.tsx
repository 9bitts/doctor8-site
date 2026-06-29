import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { translate, normalizeLang, Lang } from "@/lib/i18n/translations";
import { decrypt } from "@/lib/encryption";
import { picBySlug, picLabel } from "@/lib/pics/practices";
import { getIntegrativeVisitMetaByPatientUserIds } from "@/lib/integrative-appointment-meta";
import IntegrativeAppointmentsView from "@/components/integrative-therapist/IntegrativeAppointmentsView";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

export default async function IntegrativeTherapistAppointmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login/terapeuta-integrativo");
  if (session.user.role !== "INTEGRATIVE_THERAPIST") redirect("/patient");

  const userRow = await db.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const lang: Lang = normalizeLang(userRow?.language);
  const t = (key: string) => translate(lang, key);

  const profile = await db.integrativeTherapistProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/integrative-therapist/settings");

  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - 60);
  const rangeEnd = new Date();
  rangeEnd.setDate(rangeEnd.getDate() + 90);

  const appointments = await db.appointment.findMany({
    where: {
      integrativeTherapistId: profile.id,
      scheduledAt: { gte: rangeStart, lte: rangeEnd },
    },
    include: { patient: { select: { firstName: true, lastName: true, userId: true } } },
    orderBy: { scheduledAt: "desc" },
  });

  const visitMetaByUser = await getIntegrativeVisitMetaByPatientUserIds(
    profile.id,
    appointments.map((a) => a.patient.userId),
  );

  const practiceOptions = profile.picsPractices
    .map((slug) => {
      const p = picBySlug(slug);
      return p ? { slug, label: picLabel(p, lang) } : { slug, label: slug };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const rows = appointments.map((apt) => {
    const meta = visitMetaByUser.get(apt.patient.userId);
    const mainPractice = meta?.mainPractice ?? null;
    const p = mainPractice ? picBySlug(mainPractice) : undefined;
    return {
      id: apt.id,
      scheduledAt: apt.scheduledAt.toISOString(),
      status: apt.status,
      type: apt.type,
      patientName: `${safeDecrypt(apt.patient.firstName)} ${safeDecrypt(apt.patient.lastName)}`.trim(),
      visitType: meta?.visitType ?? ("first" as const),
      mainPractice,
      mainPracticeLabel: p ? picLabel(p, lang) : mainPractice,
      suggestedDurationMins: meta?.suggestedDurationMins ?? 60,
    };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("proappt.title")}</h1>
        <p className="text-slate-500 mt-1">{t("it.dash.subtitle")}</p>
      </div>
      <IntegrativeAppointmentsView appointments={rows} practiceOptions={practiceOptions} />
    </div>
  );
}
