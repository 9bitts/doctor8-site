import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { translate, localeOf, greetingKey, Lang } from "@/lib/i18n/translations";
import { getUserLang } from "@/lib/i18n/server-lang";
import { PHARMACIST_LOGIN } from "@/lib/pharmacist-portal";
import { getProfessionLabel } from "@/lib/professions";
import {
  Calendar, Users, ChevronRight, Video, UserCog, FileText,
  ClipboardList, FlaskConical, Activity, MessageSquare, Inbox, TrendingUp, Pill,
  BookOpen, Shield, FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";

const PHARMA_MODULES = [
  { href: "/farmaceutico/revisao", icon: ClipboardList, labelKey: "pharma.mod.medReview.title", color: "bg-teal-100 text-teal-700" },
  { href: "/farmaceutico/conciliacao", icon: FileSpreadsheet, labelKey: "pharma.mod.reconciliation.title", color: "bg-cyan-100 text-cyan-800" },
  { href: "/farmaceutico/monitoramento", icon: Activity, labelKey: "pharma.mod.monitoring.title", color: "bg-teal-100 text-teal-700" },
  { href: "/farmaceutico/prescricao", icon: Pill, labelKey: "pharma.mod.pharmaRx.title", color: "bg-emerald-100 text-emerald-800" },
  { href: "/farmaceutico/educacao", icon: BookOpen, labelKey: "pharma.mod.education.title", color: "bg-sky-100 text-sky-800" },
  { href: "/farmaceutico/dispensacao", icon: Shield, labelKey: "pharma.mod.dispensing.title", color: "bg-teal-100 text-teal-800" },
  { href: "/farmaceutico/interacoes", icon: FlaskConical, labelKey: "pharma.mod.interactions.title", color: "bg-orange-100 text-orange-800" },
] as const;

const QUICK_LINKS = [
  { href: "/farmaceutico/patients", icon: Users, labelKey: "nav.patients" },
  { href: "/farmaceutico/appointments", icon: Calendar, labelKey: "nav.appointments" },
  { href: "/farmaceutico/messages", icon: MessageSquare, labelKey: "nav.messages" },
  { href: "/farmaceutico/shared", icon: Inbox, labelKey: "nav.sharedWithMe" },
  { href: "/farmaceutico/financeiro", icon: TrendingUp, labelKey: "nav.financeiro" },
  { href: "/farmaceutico/settings", icon: UserCog, labelKey: "nav.myProfile" },
  { href: "/farmaceutico/settings/availability", icon: Video, labelKey: "nav.availability" },
] as const;

export default async function PharmacistDashboard() {
  const session = await auth();
  if (!session?.user) redirect(PHARMACIST_LOGIN);
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
  if (!professional) redirect("/onboarding?portal=pharmacist");

  await audit.viewRecord(userId, "ProfessionalProfile", professional.id);

  const patientCount = await db.patientRecord.count({
    where: { professionalId: professional.id },
  });

  const professionLabel = getProfessionLabel(lang, professional.specialty) || t("role.pharmacist");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center shrink-0">
          <Pill size={28} className="text-teal-600" />
        </div>
        <div>
          <p className="text-slate-500 text-sm">{t(greetingKey())}</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {professional.firstName} {professional.lastName}
          </h1>
          <p className="text-teal-700 text-sm font-medium mt-1">{professionLabel}</p>
          <p className="text-slate-500 text-sm mt-1">{t("pharma.dashboard.subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PHARMA_MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-teal-300 transition group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${mod.color}`}>
                <Icon size={20} />
              </div>
              <p className="font-semibold text-slate-900 text-sm">{t(mod.labelKey)}</p>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t(`${mod.labelKey}.desc`)}</p>
              <ChevronRight size={14} className="mt-3 text-slate-300 group-hover:text-teal-500 transition" />
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">{t("pharma.dashboard.upcoming")}</h2>
            <Link href="/farmaceutico/appointments" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
              {t("pharma.dashboard.viewAll")}
            </Link>
          </div>
          {professional.appointments.length === 0 ? (
            <p className="text-sm text-slate-500">{t("pharma.dashboard.noAppointments")}</p>
          ) : (
            <ul className="space-y-3">
              {professional.appointments.map((apt) => (
                <li key={apt.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <Calendar size={16} className="text-teal-600 shrink-0" />
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
            <p className="text-sm text-slate-500">{t("pharma.dashboard.patientCharts")}</p>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-1">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 py-2 text-sm text-slate-600 hover:text-teal-700 transition"
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
