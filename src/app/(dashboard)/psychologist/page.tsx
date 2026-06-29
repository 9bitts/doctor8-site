import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { translate, localeOf, greetingKey, Lang } from "@/lib/i18n/translations";
import { getUserLang } from "@/lib/i18n/server-lang";
import { PSYCHOLOGIST_LOGIN } from "@/lib/psychologist-portal";
import {
  Calendar, Users, ChevronRight, Video, Settings, FileText,
  ClipboardList, BarChart3, Shield, MessageSquare, BookOpen,
  Inbox, TrendingUp, UserCog, Brain, Radio, Sparkles,
} from "lucide-react";
import Link from "next/link";
import HumanitarianVolunteerBanner from "@/components/humanitarian/HumanitarianVolunteerBanner";
import AcuraVolunteerOptIn from "@/components/acura/AcuraVolunteerOptIn";
import DoctorConnectionBanner from "@/components/professional/DoctorConnectionBanner";
import ProfessionalChecklist from "@/components/ProfessionalChecklist";
import ProfessionalInsightsBanner from "@/components/professional/ProfessionalInsightsBanner";
import PsychologistTourWrapper from "./PsychologistTourWrapper";
import { getActiveCampaignForRegion } from "@/lib/humanitarian/notify";
import { getVolunteerDashboardState } from "@/lib/humanitarian/volunteer-dashboard";
import { getProfessionalDashboardInsights } from "@/lib/professional-dashboard-insights";
import { getProfessionLabel } from "@/lib/professions";

const PSY_MODULES = [
  { href: "/psychologist/sessions", icon: ClipboardList, labelKey: "psy.mod.sessions.title", color: "bg-violet-100 text-violet-600" },
  { href: "/psychologist/scales", icon: BarChart3, labelKey: "psy.mod.scales.title", color: "bg-indigo-100 text-indigo-600" },
  { href: "/psychologist/documents", icon: FileText, labelKey: "psy.mod.documents.title", color: "bg-sky-100 text-sky-600" },
  { href: "/psychologist/compliance", icon: Shield, labelKey: "psy.mod.compliance.title", color: "bg-emerald-100 text-emerald-600" },
] as const;

const QUICK_LINKS = [
  { href: "/psychologist/patients", icon: Users, labelKey: "nav.patients" },
  { href: "/psychologist/appointments", icon: Calendar, labelKey: "nav.appointments" },
  { href: "/psychologist/messages", icon: MessageSquare, labelKey: "nav.messages" },
  { href: "/psychologist/resources", icon: BookOpen, labelKey: "nav.library" },
  { href: "/psychologist/shared", icon: Inbox, labelKey: "nav.sharedWithMe" },
  { href: "/psychologist/financeiro", icon: TrendingUp, labelKey: "nav.financeiro" },
  { href: "/psychologist/jit", icon: Radio, labelKey: "nav.jit" },
  { href: "/psychologist/doctor-connection", icon: Sparkles, labelKey: "nav.doctorConnection" },
  { href: "/psychologist/settings", icon: UserCog, labelKey: "nav.myProfile" },
  { href: "/psychologist/settings/availability", icon: Video, labelKey: "nav.availability" },
] as const;

export default async function PsychologistDashboard() {
  const session = await auth();
  if (!session?.user) redirect(PSYCHOLOGIST_LOGIN);
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
        include: { patient: { select: { firstName: true, lastName: true } } },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      },
    },
  });

  if (!professional) redirect("/onboarding?portal=psychologist");

  await audit.viewRecord(userId, "ProfessionalProfile", professional.id);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    todayCount,
    patientCount,
    humanitarianCampaign,
    humanitarianVolunteer,
    subscription,
    userRow,
    dashboardInsights,
  ] = await Promise.all([
    db.appointment.count({
      where: {
        professionalId: professional.id,
        scheduledAt: { gte: todayStart, lte: todayEnd },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
    }),
    db.patientRecord.count({ where: { professionalId: professional.id } }),
    getActiveCampaignForRegion(null),
    getVolunteerDashboardState(userId),
    db.subscription.findUnique({
      where: { userId },
      select: { status: true },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { region: true },
    }),
    getProfessionalDashboardInsights(professional.id),
  ]);

  const hasActiveSubscription =
    !!subscription && ["active", "trialing"].includes(subscription.status);

  const professionLabel = getProfessionLabel(lang, professional.specialty) || t("role.psychologist");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <HumanitarianVolunteerBanner
        lang={lang}
        campaignActive={!!humanitarianCampaign?.active}
        volunteer={humanitarianVolunteer}
        psychologyPortal
      />

      <AcuraVolunteerOptIn
        initialChecked={professional.acuraVolunteer}
        verified={professional.verified}
      />

      <DoctorConnectionBanner
        subscribed={hasActiveSubscription}
        defaultRegion={userRow?.region || session.user.region}
        accountHref="/psychologist/account"
      />

      <ProfessionalChecklist />

      <ProfessionalInsightsBanner insights={dashboardInsights} />

      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
          <Brain size={28} className="text-violet-600" />
        </div>
        <div>
          <p className="text-slate-500 text-sm">{t(greetingKey())}</p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
            {professional.firstName} {professional.lastName}
          </h1>
          <p className="text-violet-600 text-sm font-medium mt-1">{professionLabel}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs text-slate-500">{t("psy.dash.today")}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{todayCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs text-slate-500">{t("nav.patients")}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{patientCount}</p>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {t("psy.hub.modulesTitle")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {PSY_MODULES.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-5 hover:border-violet-200 hover:shadow-md transition"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${m.color}`}>
                <m.icon size={20} />
              </div>
              <span className="font-semibold text-slate-800 flex-1">{t(m.labelKey)}</span>
              <ChevronRight size={18} className="text-slate-400" />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {t("psy.dash.practiceTitle")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-violet-200 transition text-sm font-medium text-slate-700"
            >
              <item.icon size={18} className="text-violet-500 shrink-0" />
              {t(item.labelKey)}
            </Link>
          ))}
        </div>
      </section>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Calendar size={18} className="text-violet-500" />
          <h2 className="font-semibold text-slate-800">{t("psy.dash.upcoming")}</h2>
        </div>
        {professional.appointments.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-10">{t("proappt.empty")}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {professional.appointments.map((apt) => (
              <div key={apt.id} className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">
                    {apt.patient.firstName} {apt.patient.lastName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(apt.scheduledAt).toLocaleString(locale)}
                  </p>
                </div>
                {apt.type === "TELECONSULT" && (
                  <a
                    href={`/video/${apt.id}`}
                    className="w-full sm:w-auto text-center text-xs font-bold bg-violet-500 text-white px-3 py-2.5 rounded-xl hover:bg-violet-600 min-h-[44px] inline-flex items-center justify-center shrink-0"
                  >
                    {t("proappt.join")}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <PsychologistTourWrapper lang={lang} />
    </div>
  );
}
