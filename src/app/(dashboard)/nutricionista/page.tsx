import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { translate, localeOf, greetingKey, Lang } from "@/lib/i18n/translations";
import { getUserLang } from "@/lib/i18n/server-lang";
import { NUTRITIONIST_LOGIN } from "@/lib/nutritionist-portal";
import { resolveRoleHome } from "@/lib/role-home";
import IncompleteLicenseBanner from "@/components/professional/IncompleteLicenseBanner";
import { getProfessionLabel } from "@/lib/professions";
import {
  Calendar, Users, ChevronRight, Video, UserCog, FileText,
  ClipboardList, BarChart3, BookOpen, MessageSquare, Inbox, TrendingUp, Utensils,
} from "lucide-react";
import Link from "next/link";

const NUTRI_MODULES = [
  { href: "/nutricionista/anamnese", icon: ClipboardList, labelKey: "nutri.mod.anamnese.title", color: "bg-amber-100 text-amber-700" },
  { href: "/nutricionista/antropometria", icon: BarChart3, labelKey: "nutri.mod.anthropometry.title", color: "bg-orange-100 text-orange-700" },
  { href: "/nutricionista/planos", icon: FileText, labelKey: "nutri.mod.mealPlans.title", color: "bg-lime-100 text-lime-700" },
  { href: "/nutricionista/diario", icon: BookOpen, labelKey: "nutri.mod.foodDiary.title", color: "bg-yellow-100 text-yellow-700" },
] as const;

const QUICK_LINKS = [
  { href: "/nutricionista/patients", icon: Users, labelKey: "nav.patients" },
  { href: "/nutricionista/appointments", icon: Calendar, labelKey: "nav.appointments" },
  { href: "/nutricionista/messages", icon: MessageSquare, labelKey: "nav.messages" },
  { href: "/nutricionista/shared", icon: Inbox, labelKey: "nav.sharedWithMe" },
  { href: "/nutricionista/financeiro", icon: TrendingUp, labelKey: "nav.financeiro" },
  { href: "/nutricionista/settings", icon: UserCog, labelKey: "nav.myProfile" },
  { href: "/nutricionista/settings/availability", icon: Video, labelKey: "nav.availability" },
] as const;

export default async function NutritionistDashboard() {
  const session = await auth();
  if (!session?.user) redirect(NUTRITIONIST_LOGIN);
  if (session.user.role !== "PROFESSIONAL" && session.user.role !== "ADMIN") {
    redirect(resolveRoleHome(session.user.role));
  }

  if (session.user.role === "ADMIN") {
    const lang: Lang = await getUserLang(session.user.id);
    const t = (key: string) => translate(lang, key);
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
            <Utensils size={28} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("nutri.dashboard.subtitle")}</h1>
            <p className="text-slate-500 text-sm mt-1">{t("role.nutritionist")}</p>
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
  if (!professional) redirect("/onboarding?portal=nutritionist");

  await audit.viewRecord(userId, "ProfessionalProfile", professional.id);

  const patientCount = await db.patientRecord.count({
    where: { professionalId: professional.id },
  });

  const professionLabel = getProfessionLabel(lang, professional.specialty) || t("role.nutritionist");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {!professional.licenseNumber?.trim() && (
        <IncompleteLicenseBanner
          lang={lang}
          specialty={professional.specialty}
          settingsHref="/nutricionista/settings"
        />
      )}

      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
          <Utensils size={28} className="text-amber-600" />
        </div>
        <div>
          <p className="text-slate-500 text-sm">{t(greetingKey())}</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {professional.firstName} {professional.lastName}
          </h1>
          <p className="text-amber-700 text-sm font-medium mt-1">{professionLabel}</p>
          <p className="text-slate-500 text-sm mt-1">{t("nutri.dashboard.subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {NUTRI_MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-amber-300 transition group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${mod.color}`}>
                <Icon size={20} />
              </div>
              <p className="font-semibold text-slate-900 text-sm">{t(mod.labelKey)}</p>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t(`${mod.labelKey}.desc`)}</p>
              <ChevronRight size={14} className="mt-3 text-slate-300 group-hover:text-amber-500 transition" />
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">{t("nutri.dashboard.upcoming")}</h2>
            <Link href="/nutricionista/appointments" className="text-sm text-amber-600 hover:text-amber-700 font-medium">
              {t("nutri.dashboard.viewAll")}
            </Link>
          </div>
          {professional.appointments.length === 0 ? (
            <p className="text-sm text-slate-500">{t("nutri.dashboard.noAppointments")}</p>
          ) : (
            <ul className="space-y-3">
              {professional.appointments.map((apt) => (
                <li key={apt.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <Calendar size={16} className="text-amber-600 shrink-0" />
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
            <p className="text-sm text-slate-500">{t("nutri.dashboard.patientCharts")}</p>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-1">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 py-2 text-sm text-slate-600 hover:text-amber-700 transition"
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
