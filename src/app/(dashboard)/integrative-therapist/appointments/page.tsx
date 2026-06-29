import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { translate, normalizeLang, localeOf, Lang } from "@/lib/i18n/translations";
import { Calendar, Video, MapPin } from "lucide-react";
import { decrypt } from "@/lib/encryption";
import { picBySlug, picLabel } from "@/lib/pics/practices";
import { getIntegrativeVisitMetaByPatientUserIds } from "@/lib/integrative-appointment-meta";

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
  if (!session?.user) redirect("/login");
  if (session.user.role !== "INTEGRATIVE_THERAPIST") redirect("/patient");

  const userRow = await db.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const lang: Lang = normalizeLang(userRow?.language);
  const t = (key: string) => translate(lang, key);
  const locale = localeOf(lang);

  const profile = await db.integrativeTherapistProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/integrative-therapist/settings");

  const appointments = await db.appointment.findMany({
    where: { integrativeTherapistId: profile.id },
    include: { patient: { select: { firstName: true, lastName: true, userId: true } } },
    orderBy: { scheduledAt: "desc" },
    take: 100,
  });

  const visitMetaByUser = await getIntegrativeVisitMetaByPatientUserIds(
    profile.id,
    appointments.map((a) => a.patient.userId),
  );

  const statusColors: Record<string, string> = {
    CONFIRMED: "bg-teal-100 text-teal-700",
    PENDING: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-teal-100 text-teal-700",
    CANCELLED: "bg-rose-100 text-rose-700",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("proappt.title")}</h1>
        <p className="text-slate-500 mt-1">{t("it.dash.subtitle")}</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {appointments.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-400 text-sm">{t("proappt.empty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.map((apt) => {
              const meta = visitMetaByUser.get(apt.patient.userId);
              const visitLabel =
                meta?.visitType === "first"
                  ? t("it.consult.firstVisit")
                  : t("it.consult.returnVisit");
              return (
                <div key={apt.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">
                      {safeDecrypt(apt.patient.firstName)} {safeDecrypt(apt.patient.lastName)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(apt.scheduledAt).toLocaleString(locale)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {apt.type === "TELECONSULT" ? (
                        <Video size={12} className="text-teal-500" />
                      ) : (
                        <MapPin size={12} className="text-teal-500" />
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                        {visitLabel}
                      </span>
                      {meta?.mainPractice && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {(() => {
                            const p = picBySlug(meta.mainPractice!);
                            return p ? picLabel(p, lang) : meta.mainPractice;
                          })()}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {meta?.suggestedDurationMins ?? 60} min
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${statusColors[apt.status] || "bg-slate-100 text-slate-600"}`}
                  >
                    {apt.status}
                  </span>
                  {apt.status === "CONFIRMED" && (
                    <a
                      href={
                        apt.type === "TELECONSULT"
                          ? `/video/${apt.id}`
                          : `/integrative-therapist/consult/${apt.id}`
                      }
                      className={`text-xs font-bold text-white px-3 py-2 rounded-xl shrink-0 ${
                        apt.type === "TELECONSULT"
                          ? "bg-teal-500 hover:bg-teal-600"
                          : "bg-slate-800 hover:bg-slate-700"
                      }`}
                    >
                      {apt.type === "TELECONSULT" ? t("proappt.join") : t("it.consult.start")}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
