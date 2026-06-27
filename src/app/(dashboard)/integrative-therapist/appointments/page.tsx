import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { translate, normalizeLang, localeOf, Lang } from "@/lib/i18n/translations";
import { Calendar, Video, MapPin } from "lucide-react";
import { decrypt } from "@/lib/encryption";

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
    include: { patient: { select: { firstName: true, lastName: true } } },
    orderBy: { scheduledAt: "desc" },
    take: 100,
  });

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
            {appointments.map((apt) => (
              <div key={apt.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">
                    {safeDecrypt(apt.patient.firstName)} {safeDecrypt(apt.patient.lastName)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(apt.scheduledAt).toLocaleString(locale)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {apt.type === "TELECONSULT" ? (
                      <Video size={12} className="text-teal-500" />
                    ) : (
                      <MapPin size={12} className="text-teal-500" />
                    )}
                    <span className="text-[10px] text-slate-400">{apt.type}</span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusColors[apt.status] || "bg-slate-100 text-slate-600"}`}
                >
                  {apt.status}
                </span>
                {apt.type === "TELECONSULT" && apt.status === "CONFIRMED" && (
                  <a
                    href={`/video/${apt.id}`}
                    className="text-xs font-bold bg-teal-500 text-white px-3 py-2 rounded-xl hover:bg-teal-600"
                  >
                    {t("proappt.join")}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
