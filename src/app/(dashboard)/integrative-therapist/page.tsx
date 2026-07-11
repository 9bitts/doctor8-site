import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { translate, greetingKey, Lang } from "@/lib/i18n/translations";
import IntegrativeUpcomingList from "@/components/integrative-therapist/IntegrativeUpcomingList";
import { getUserLang } from "@/lib/i18n/server-lang";
import { decryptIntegrativeNameFields, safeDecrypt } from "@/lib/integrative-therapist-api";
import { picBySlug, picLabel } from "@/lib/pics/practices";
import { Calendar, Users, ChevronRight, Video, Settings, FileText, Leaf, TrendingUp, Clock, BookOpen, ClipboardList, AlertCircle, Sprout } from "lucide-react";
import Link from "next/link";
import HumanitarianVolunteerBanner from "@/components/humanitarian/HumanitarianVolunteerBanner";
import AcuraVolunteerOptIn from "@/components/acura/AcuraVolunteerOptIn";
import { getActiveCampaignForRegion } from "@/lib/humanitarian/notify";
import { getIntegrativeVisitMetaByPatientUserIds } from "@/lib/integrative-appointment-meta";
import { getVolunteerDashboardState } from "@/lib/humanitarian/volunteer-dashboard";
import { hasAnyNaturalMedicinePractice } from "@/lib/natural-medicine/config";
import { providerDayBounds } from "@/lib/provider-day-bounds";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";

export default async function IntegrativeTherapistDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "INTEGRATIVE_THERAPIST") redirect("/patient");

  const userId = session.user.id;
  const lang: Lang = await getUserLang(userId);
  const t = (key: string) => translate(lang, key);

  const profile = await db.integrativeTherapistProfile.findUnique({ where: { userId } });
  if (!profile) redirect("/integrative-therapist/settings");

  const displayProfile = decryptIntegrativeNameFields(profile);
  await audit.viewRecord(userId, "IntegrativeTherapistProfile", profile.id);

  const userRow = await db.user.findUnique({
    where: { id: userId },
    select: { timezone: true, region: true },
  });
  const providerTz = userRow?.timezone || DEFAULT_TIME_ZONE;
  const regionForCampaign = userRow?.region ?? session.user.region ?? null;
  const { start: todayStart, end: todayEnd } = providerDayBounds(providerTz);

  const [todayCount, clientCount, upcoming, humanitarianCampaign, humanitarianVolunteer] =
    await Promise.all([
      db.appointment.count({
        where: {
          integrativeTherapistId: profile.id,
          scheduledAt: { gte: todayStart, lte: todayEnd },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
      }),
      db.integrativeClientRecord.count({ where: { integrativeTherapistId: profile.id } }),
      db.appointment.findMany({
        where: {
          integrativeTherapistId: profile.id,
          status: { in: ["CONFIRMED", "PENDING"] },
          scheduledAt: { gte: new Date() },
        },
        include: { patient: { select: { firstName: true, lastName: true, userId: true } } },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      }),
      getActiveCampaignForRegion(regionForCampaign),
      getVolunteerDashboardState(userId),
    ]);

  const practiceLabels = profile.picsPractices
    .slice(0, 3)
    .map((slug) => {
      const p = picBySlug(slug);
      return p ? picLabel(p, lang) : slug;
    })
    .join(", ");

  const needsPracticeSetup = profile.picsPractices.length === 0;
  const canStartConsult = clientCount > 0;
  const showNaturalMedicine = hasAnyNaturalMedicinePractice(profile.picsPractices);

  const visitMetaByUser = await getIntegrativeVisitMetaByPatientUserIds(
    profile.id,
    upcoming.map((a) => a.patient.userId),
  );

  const upcomingRows = upcoming.map((apt) => {
    const meta = visitMetaByUser.get(apt.patient.userId);
    const mainPractice = meta?.mainPractice ?? null;
    const p = mainPractice ? picBySlug(mainPractice) : undefined;
    return {
      id: apt.id,
      scheduledAt: apt.scheduledAt.toISOString(),
      status: apt.status,
      type: apt.type,
      patientName: `${safeDecrypt(apt.patient.firstName)} ${safeDecrypt(apt.patient.lastName)}`.trim(),
      visitLabel:
        meta?.visitType === "first" ? t("it.consult.firstVisit") : t("it.consult.returnVisit"),
      practiceLabel: p ? picLabel(p, lang) : mainPractice,
      durationMins: meta?.suggestedDurationMins ?? 60,
    };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <HumanitarianVolunteerBanner
        lang={lang}
        campaignActive={!!humanitarianCampaign?.active}
        volunteer={humanitarianVolunteer}
      />

      <AcuraVolunteerOptIn
        initialChecked={profile.acuraVolunteer}
        verified={profile.verified}
      />

      <div>
        <p className="text-slate-500 text-sm">{t(greetingKey())}</p>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
          {displayProfile.firstName} {displayProfile.lastName}
        </h1>
        <p className="text-teal-600 text-sm font-medium mt-1 flex items-center gap-1.5">
          <Leaf size={14} />
          {t("it.dash.subtitle")}
        </p>
      </div>

      {needsPracticeSetup && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 text-sm">{t("it.dash.setupPractices.title")}</p>
              <p className="text-amber-800/80 text-xs mt-1 leading-relaxed">{t("it.dash.setupPractices.desc")}</p>
            </div>
          </div>
          <Link
            href="/integrative-therapist/settings"
            className="shrink-0 text-center text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl"
          >
            {t("it.dash.setupPractices.action")}
          </Link>
        </div>
      )}

      <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-5 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex-1 min-w-0">
            <p className="text-teal-100 text-xs font-bold uppercase tracking-wide mb-1">
              {t("it.dash.consultMode.badge")}
            </p>
            <h2 className="text-lg sm:text-xl font-bold">{t("it.dash.consultMode.title")}</h2>
            <p className="text-teal-50/90 text-sm mt-2 leading-relaxed">{t("it.dash.consultMode.desc")}</p>
            <ul className="mt-4 grid sm:grid-cols-2 gap-2 text-xs text-teal-50/95">
              {[
                { icon: Clock, key: "it.dash.consultMode.f1" },
                { icon: ClipboardList, key: "it.dash.consultMode.f2" },
                { icon: BookOpen, key: "it.dash.consultMode.f3" },
                { icon: FileText, key: "it.dash.consultMode.f4" },
              ].map(({ icon: Icon, key }) => (
                <li key={key} className="flex items-center gap-2">
                  <Icon size={14} className="text-teal-200 shrink-0" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 w-full sm:w-auto">
            <Link
              href="/integrative-therapist/clients"
              className="text-center text-sm font-bold bg-white text-teal-800 hover:bg-teal-50 px-4 py-3 rounded-xl"
            >
              {canStartConsult ? t("it.dash.consultMode.ctaConsult") : t("it.dash.consultMode.ctaClients")}
            </Link>
            <Link
              href="/integrative-therapist/appointments"
              className="text-center text-sm font-semibold border border-white/40 text-white hover:bg-white/10 px-4 py-3 rounded-xl"
            >
              {t("it.dash.consultMode.ctaAppointments")}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs text-slate-500">{t("it.dash.today")}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{todayCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs text-slate-500">{t("it.dash.clients")}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{clientCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs text-slate-500">{t("it.dash.practices")}</p>
          <p className="text-sm font-semibold text-slate-800 mt-2 line-clamp-2">
            {practiceLabels || t("it.dash.noPractices")}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { href: "/integrative-therapist/clients", icon: Users, label: t("it.nav.clients") },
          { href: "/integrative-therapist/appointments", icon: Calendar, label: t("nav.appointments") },
          ...(showNaturalMedicine
            ? [{ href: "/integrative-therapist/medicina-natural", icon: Sprout, label: t("nav.naturalMedicine") }]
            : []),
          { href: "/integrative-therapist/financeiro", icon: TrendingUp, label: t("nav.financeiro") },
          { href: "/integrative-therapist/settings", icon: Settings, label: t("nav.myProfile") },
          { href: "/integrative-therapist/settings/availability", icon: Video, label: t("nav.availability") },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-5 hover:border-teal-300 hover:shadow-md transition"
          >
            <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
              <item.icon size={20} />
            </div>
            <span className="font-semibold text-slate-800 flex-1">{item.label}</span>
            <ChevronRight size={18} className="text-slate-400" />
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <FileText size={18} className="text-teal-500" />
          <h2 className="font-semibold text-slate-800">{t("it.dash.upcoming")}</h2>
        </div>
        <IntegrativeUpcomingList appointments={upcomingRows} timeZone={providerTz} />
      </div>
    </div>
  );
}
