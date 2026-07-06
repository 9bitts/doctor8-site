import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { translate, localeOf, greetingKey, Lang } from "@/lib/i18n/translations";
import { getUserLang } from "@/lib/i18n/server-lang";
import { NURSE_LOGIN } from "@/lib/nurse-portal";
import { getProfessionLabel } from "@/lib/professions";
import {
  Calendar, Users, ChevronRight, Video, UserCog, FileText,
  ClipboardList, BarChart3, Activity, MessageSquare, Inbox, TrendingUp, HeartPulse,
} from "lucide-react";
import Link from "next/link";

const NURSE_MODULES = [
  { href: "/enfermeiro/sae", icon: ClipboardList, labelKey: "nurse.mod.sae.title", color: "bg-rose-100 text-rose-700" },
  { href: "/enfermeiro/escalas", icon: BarChart3, labelKey: "nurse.mod.scales.title", color: "bg-pink-100 text-pink-700" },
  { href: "/enfermeiro/prescricao", icon: FileText, labelKey: "nurse.mod.carePlan.title", color: "bg-red-100 text-red-700" },
  { href: "/enfermeiro/monitoramento", icon: Activity, labelKey: "nurse.mod.monitoring.title", color: "bg-rose-100 text-rose-700" },
] as const;

const QUICK_LINKS = [
  { href: "/enfermeiro/patients", icon: Users, labelKey: "nav.patients" },
  { href: "/enfermeiro/appointments", icon: Calendar, labelKey: "nav.appointments" },
  { href: "/enfermeiro/messages", icon: MessageSquare, labelKey: "nav.messages" },
  { href: "/enfermeiro/shared", icon: Inbox, labelKey: "nav.sharedWithMe" },
  { href: "/enfermeiro/financeiro", icon: TrendingUp, labelKey: "nav.financeiro" },
  { href: "/enfermeiro/settings", icon: UserCog, labelKey: "nav.myProfile" },
  { href: "/enfermeiro/settings/availability", icon: Video, labelKey: "nav.availability" },
] as const;

export default async function NurseDashboard() {
  const session = await auth();
  if (!session?.user) redirect(NURSE_LOGIN);
  if (session.user.role !== "PROFESSIONAL") redirect("/patient");

  const userId = session.user.id;
  const lang: Lang = await getUserLang(userId);
  const t = (key: string) => translate(lang, key);
  const locale = localeOf(lang);

  const professional = await db.professionalProfile.findUnique({
    where: { userId },
    include: {
      appointments: {
        where: {
          status: { in: ["CONFIRMED", "PENDING"] },
          scheduledAt: { gte: new Date() },
        },
        orderBy: { scheduledAt: "asc" },
        take: 3,
        include: { patient: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!professional) redirect("/onboarding?portal=nurse");

  await audit.viewRecord(userId, "ProfessionalProfile", professional.id);

  const patientCount = await db.patientRecord.count({
    where: { professionalId: professional.id },
  });

  const professionLabel = getProfessionLabel(lang, professional.specialty) || t("role.nurse");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
          <HeartPulse size={28} className="text-rose-600" />
        </div>
        <div>
          <p className="text-slate-500 text-sm">{t(greetingKey())}</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {professional.firstName} {professional.lastName}
          </h1>
          <p className="text-rose-700 text-sm font-medium mt-1">{professionLabel}</p>
          <p className="text-slate-500 text-sm mt-1">{t("nurse.dashboard.subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {NURSE_MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-rose-300 transition group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${mod.color}`}>
                <Icon size={20} />
              </div>
              <p className="font-semibold text-slate-900 text-sm">{t(mod.labelKey)}</p>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t(`${mod.labelKey}.desc`)}</p>
              <ChevronRight size={14} className="mt-3 text-slate-300 group-hover:text-rose-500 transition" />
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">{t("nurse.dashboard.upcoming")}</h2>
            <Link href="/enfermeiro/appointments" className="text-sm text-rose-600 hover:text-rose-700 font-medium">
              {t("nurse.dashboard.viewAll")}
            </Link>
          </div>
          {professional.appointments.length === 0 ? (
            <p className="text-sm text-slate-500">{t("nurse.dashboard.noAppointments")}</p>
          ) : (
            <ul className="space-y-3">
              {professional.appointments.map((apt) => (
                <li key={apt.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <Calendar size={16} className="text-rose-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {apt.patient.firstName} {apt.patient.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(apt.scheduledAt).toLocaleString(locale, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <p className="text-3xl font-bold text-slate-900">{patientCount}</p>
            <p className="text-sm text-slate-500">{t("nurse.dashboard.patientCharts")}</p>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-1">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 py-2 text-sm text-slate-600 hover:text-rose-700 transition"
                >
                  <Icon size={15} />
                  {t(link.labelKey)}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
