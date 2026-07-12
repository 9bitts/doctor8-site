import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { translate, localeOf, greetingKey, Lang } from "@/lib/i18n/translations";
import { getUserLang } from "@/lib/i18n/server-lang";
import { DENTIST_LOGIN } from "@/lib/dentist-portal";
import { resolveRoleHome } from "@/lib/role-home";
import IncompleteLicenseBanner from "@/components/professional/IncompleteLicenseBanner";
import { getProfessionLabel } from "@/lib/professions";
import {
  Calendar, Users, ChevronRight, Video, UserCog, FileText,
  ClipboardList, BarChart3, MessageSquare, Inbox, TrendingUp, Smile,
  FileSpreadsheet, Package, Layers, Sparkles, Building2,
} from "lucide-react";
import Link from "next/link";

const DENTAL_MODULES = [
  { href: "/odontologo/anamnese", icon: ClipboardList, labelKey: "dental.mod.anamnesis.title", color: "bg-sky-100 text-sky-700" },
  { href: "/odontologo/odontograma", icon: FileText, labelKey: "dental.mod.odontogram.title", color: "bg-cyan-100 text-cyan-700" },
  { href: "/odontologo/periodontograma", icon: BarChart3, labelKey: "dental.mod.periodontogram.title", color: "bg-rose-100 text-rose-700" },
  { href: "/odontologo/plano-tratamento", icon: FileSpreadsheet, labelKey: "dental.mod.treatmentPlan.title", color: "bg-emerald-100 text-emerald-700" },
  { href: "/odontologo/protese", icon: Package, labelKey: "dental.mod.prosthetic.title", color: "bg-amber-100 text-amber-700" },
  { href: "/odontologo/ortodontia", icon: Layers, labelKey: "dental.mod.orthodontics.title", color: "bg-violet-100 text-violet-700" },
  { href: "/odontologo/fotos", icon: Sparkles, labelKey: "dental.mod.photos.title", color: "bg-fuchsia-100 text-fuchsia-700" },
  { href: "/odontologo/cadeiras", icon: Building2, labelKey: "dental.mod.chairs.title", color: "bg-slate-100 text-slate-700" },
] as const;

const QUICK_LINKS = [
  { href: "/odontologo/patients", icon: Users, labelKey: "nav.patients" },
  { href: "/odontologo/appointments", icon: Calendar, labelKey: "nav.appointments" },
  { href: "/odontologo/messages", icon: MessageSquare, labelKey: "nav.messages" },
  { href: "/odontologo/shared", icon: Inbox, labelKey: "nav.sharedWithMe" },
  { href: "/odontologo/financeiro", icon: TrendingUp, labelKey: "nav.financeiro" },
  { href: "/odontologo/settings", icon: UserCog, labelKey: "nav.myProfile" },
  { href: "/odontologo/settings/availability", icon: Video, labelKey: "nav.availability" },
] as const;

export default async function DentistDashboard() {
  const session = await auth();
  if (!session?.user) redirect(DENTIST_LOGIN);
  if (session.user.role !== "PROFESSIONAL" && session.user.role !== "ADMIN") {
    redirect(resolveRoleHome(session.user.role));
  }

  if (session.user.role === "ADMIN") {
    const lang: Lang = await getUserLang(session.user.id);
    const t = (key: string) => translate(lang, key);
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-fuchsia-100 flex items-center justify-center shrink-0">
            <Smile size={28} className="text-fuchsia-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("dental.dashboard.subtitle")}</h1>
            <p className="text-slate-500 text-sm mt-1">{t("role.dentist")}</p>
          </div>
        </div>
      </div>
    );
  }

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
  if (!professional) redirect("/onboarding?portal=dentist");

  await audit.viewRecord(userId, "ProfessionalProfile", professional.id);

  const patientCount = await db.patientRecord.count({
    where: { professionalId: professional.id },
  });

  const pendingQuoteCount = await db.dentalTreatmentPlan.count({
    where: {
      professionalId: professional.id,
      patientApproved: false,
      status: { in: ["DRAFT", "PRESENTED"] },
    },
  });

  const professionLabel = getProfessionLabel(lang, professional.specialty) || t("role.dentist");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {!professional.licenseNumber?.trim() && (
        <IncompleteLicenseBanner
          lang={lang}
          specialty={professional.specialty}
          settingsHref="/odontologo/settings"
        />
      )}

      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-fuchsia-100 flex items-center justify-center shrink-0">
          <Smile size={28} className="text-fuchsia-600" />
        </div>
        <div>
          <p className="text-slate-500 text-sm">{t(greetingKey())}</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {professional.firstName} {professional.lastName}
          </h1>
          <p className="text-fuchsia-700 text-sm font-medium mt-1">{professionLabel}</p>
          <p className="text-slate-500 text-sm mt-1">{t("dental.dashboard.subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DENTAL_MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-fuchsia-300 transition group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${mod.color}`}>
                <Icon size={20} />
              </div>
              <p className="font-semibold text-slate-900 text-sm">{t(mod.labelKey)}</p>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t(`${mod.labelKey}.desc`)}</p>
              <ChevronRight size={14} className="mt-3 text-slate-300 group-hover:text-fuchsia-500 transition" />
            </Link>
          );
        })}
      </div>

      {pendingQuoteCount > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-semibold text-amber-900">{t("dental.dashboard.pendingQuotes")}</p>
            <p className="text-sm text-amber-800 mt-1">
              {pendingQuoteCount} — {t("dental.dashboard.pendingQuotesDesc")}
            </p>
          </div>
          <Link
            href="/odontologo/plano-tratamento"
            className="inline-flex items-center justify-center rounded-xl bg-amber-600 text-white px-4 py-2 text-sm font-medium hover:bg-amber-700 transition shrink-0"
          >
            {t("dental.dashboard.viewPlans")}
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">{t("dental.dashboard.upcoming")}</h2>
            <Link href="/odontologo/appointments" className="text-sm text-fuchsia-600 hover:text-fuchsia-700 font-medium">
              {t("dental.dashboard.viewAll")}
            </Link>
          </div>
          {professional.appointments.length === 0 ? (
            <p className="text-sm text-slate-500">{t("dental.dashboard.noAppointments")}</p>
          ) : (
            <ul className="space-y-3">
              {professional.appointments.map((apt) => (
                <li key={apt.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <Calendar size={16} className="text-fuchsia-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {apt.patient.firstName} {apt.patient.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {apt.scheduledAt.toLocaleString(locale, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
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
            <p className="text-3xl font-bold text-fuchsia-600">{patientCount}</p>
            <p className="text-sm text-slate-500">{t("dental.dashboard.patients")}</p>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-2">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-fuchsia-700 transition"
                >
                  <Icon size={14} />
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
