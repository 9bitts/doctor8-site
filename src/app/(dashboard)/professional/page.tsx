// src/app/(dashboard)/professional/page.tsx
// Professional home dashboard (i18n: translated server-side from User.language)

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { translate, normalizeLang, localeOf, Lang } from "@/lib/i18n/translations";
import { Calendar, Users, DollarSign, Clock, ChevronRight, Video } from "lucide-react";
import Link from "next/link";

export default async function ProfessionalDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROFESSIONAL") redirect("/patient");

  // Language for this user (server-side translation)
  const userRow = await db.user.findUnique({ where: { id: session.user.id }, select: { language: true } });
  const lang: Lang = normalizeLang(userRow?.language);
  const t = (key: string) => translate(lang, key);
  const locale = localeOf(lang);

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      appointments: {
        where: {
          status: { in: ["CONFIRMED", "PENDING"] },
          scheduledAt: { gte: new Date() },
        },
        include: {
          patient: { select: { firstName: true, lastName: true } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      },
    },
  });

  if (!professional) redirect("/onboarding");

  await audit.viewRecord(session.user.id, "ProfessionalProfile", professional.id);

  const [totalPatients, totalEarnings, completedToday] = await Promise.all([
    db.appointment.count({ where: { professionalId: professional.id, status: "COMPLETED" } }),
    db.appointment.aggregate({
      where: { professionalId: professional.id, status: "COMPLETED" },
      _sum: { priceAmount: true },
    }),
    db.appointment.count({
      where: {
        professionalId: professional.id,
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
    }),
  ]);

  const earningsTotal = totalEarnings._sum.priceAmount || 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {t("prodash.welcome")} {professional.firstName} 👋
        </h1>
        <p className="text-slate-500 mt-1">{professional.specialty}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Calendar className="text-blue-500" size={20} />, label: t("prodash.stat.today"), value: completedToday, bg: "bg-blue-50" },
          { icon: <Users className="text-violet-500" size={20} />, label: t("prodash.stat.totalConsults"), value: totalPatients, bg: "bg-violet-50" },
          { icon: <DollarSign className="text-emerald-500" size={20} />, label: t("prodash.stat.earnings"), value: new Intl.NumberFormat(locale, { style: "currency", currency: professional.currency }).format(earningsTotal / 100), bg: "bg-emerald-50" },
          { icon: <Clock className="text-rose-500" size={20} />, label: t("prodash.stat.upcoming"), value: professional.appointments.length, bg: "bg-rose-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>{s.icon}</div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Upcoming appointments */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Calendar size={16} /> {t("prodash.upcoming.title")}
          </p>
          <Link href="/professional/appointments" className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            {t("common.viewAll")} <ChevronRight size={13} />
          </Link>
        </div>
        <div className="p-5">
          {professional.appointments.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">{t("prodash.upcoming.empty")}</p>
          ) : (
            <div className="space-y-3">
              {professional.appointments.map((apt) => (
                <div key={apt.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm shrink-0">
                    {apt.patient.firstName[0]}{apt.patient.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{apt.patient.firstName} {apt.patient.lastName}</p>
                    <p className="text-xs text-slate-500">{apt.type === "TELECONSULT" ? t("prodash.type.teleconsult") : t("prodash.type.inPerson")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-slate-700">{new Date(apt.scheduledAt).toLocaleDateString(locale, { month: "short", day: "numeric" })}</p>
                    <p className="text-xs text-slate-500">{new Date(apt.scheduledAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  {apt.meetingUrl && (
                    <a href={apt.meetingUrl} className="shrink-0 bg-emerald-500 text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1 hover:bg-emerald-400 transition">
                      <Video size={12} /> {t("prodash.join")}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick setup if not fully configured */}
      {!professional.verified && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="font-semibold text-amber-800 mb-1">{t("prodash.verify.title")}</p>
          <p className="text-sm text-amber-700 mb-3">{t("prodash.verify.text")}</p>
          <Link href="/professional/settings" className="text-sm font-semibold text-amber-800 underline">
            {t("prodash.verify.action")} →
          </Link>
        </div>
      )}
    </div>
  );
}
