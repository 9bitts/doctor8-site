import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { translate, normalizeLang, localeOf, Lang } from "@/lib/i18n/translations";
import { Calendar, Video, MapPin, ChevronRight, UserPlus } from "lucide-react";
import Link from "next/link";
import { parseAppointmentIntake } from "@/lib/appointment-intake";
import { decrypt } from "@/lib/encryption";
import {
  DEFAULT_TIME_ZONE,
  formatShortDateWithYear,
  formatAppointmentTimeWithLabel,
} from "@/lib/timezone";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
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
  const locale = localeOf(lang);
  const providerTz = userRow?.timezone || DEFAULT_TIME_ZONE;

  const profile = await db.psychoanalystProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) redirect("/psychoanalyst/settings");

  const appointments = await db.appointment.findMany({
    where: { psychoanalystId: profile.id },
    include: { patient: { select: { firstName: true, lastName: true, userId: true } } },
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

  const statusColors: Record<string, string> = {
    CONFIRMED: "bg-violet-100 text-violet-700",
    PENDING: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-violet-100 text-violet-700",
    CANCELLED: "bg-rose-100 text-rose-700",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("proappt.title")}</h1>
        <p className="text-slate-500 mt-1">{t("pa.dash.subtitle")}</p>
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
              const firstName = safeDecrypt(apt.patient.firstName);
              const lastName = safeDecrypt(apt.patient.lastName);
              const intake = parseAppointmentIntake(apt.chiefComplaint);
              const analysandId = analysandByUserId.get(apt.patient.userId);
              return (
                <div key={apt.id} className="flex flex-wrap items-center gap-3 sm:gap-4 px-5 py-4 hover:bg-slate-50 transition">
                  <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center font-bold text-violet-600 text-sm shrink-0">
                    {firstName[0]}{lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{firstName} {lastName}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      {apt.type === "TELECONSULT" ? <><Video size={12} /> {t("proappt.teleconsult")}</> : <><MapPin size={12} /> {t("proappt.inPerson")}</>}
                    </p>
                    {intake?.healthPlanLabel && (
                      <p className="text-[11px] text-violet-600 mt-1">{intake.healthPlanLabel}</p>
                    )}
                    {intake?.serviceName && (
                      <p className="text-[11px] text-slate-600 mt-1">{intake.serviceName}</p>
                    )}
                    {intake?.visitReason && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{intake.visitReason}</p>
                    )}
                    {analysandId ? (
                      <Link
                        href={`/psychoanalyst/analysands/${analysandId}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 mt-2 hover:text-violet-800"
                      >
                        {t("pa.appt.viewAnalysand")} <ChevronRight size={12} />
                      </Link>
                    ) : (
                      <Link
                        href="/psychoanalyst/analysands"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 mt-2 hover:text-amber-900"
                      >
                        <UserPlus size={12} /> {t("pa.appt.createAnalysand")}
                      </Link>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-slate-700">
                      {formatShortDateWithYear(new Date(apt.scheduledAt), providerTz, locale)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatAppointmentTimeWithLabel(new Date(apt.scheduledAt), providerTz, locale)}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg ${statusColors[apt.status] || "bg-slate-100 text-slate-600"}`}>
                    {t(`status.${apt.status}`)}
                  </span>
                  {apt.patientConfirmedAt && (
                    <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {t("proappt.patientConfirmed")}
                    </span>
                  )}
                  {apt.type === "TELECONSULT" && apt.status === "CONFIRMED" && (
                    <a href={`/video/${apt.id}`} className="shrink-0 bg-violet-500 text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1 hover:bg-violet-600 transition">
                      <Video size={12} /> {t("proappt.join")}
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
