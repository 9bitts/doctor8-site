import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { translate, localeOf, greetingKey, Lang } from "@/lib/i18n/translations";
import { getUserLang } from "@/lib/i18n/server-lang";
import { decryptPsychoanalystNameFields, safeDecrypt } from "@/lib/psychoanalyst-api";
import { Calendar, Users, ChevronRight, Video, Brain, TrendingUp } from "lucide-react";
import Link from "next/link";
import HumanitarianVolunteerBanner from "@/components/humanitarian/HumanitarianVolunteerBanner";
import DoctorConnectionBanner from "@/components/professional/DoctorConnectionBanner";
import PsychoanalystOnboardingCard from "@/components/psychoanalyst/PsychoanalystOnboardingCard";
import { getActiveCampaignForRegion } from "@/lib/humanitarian/notify";
import { getVolunteerDashboardState } from "@/lib/humanitarian/volunteer-dashboard";
import { providerDayBounds } from "@/lib/provider-day-bounds";
import {
  DEFAULT_TIME_ZONE,
  formatShortDate,
  formatAppointmentTimeWithLabel,
} from "@/lib/timezone";

const statusColors: Record<string, string> = {
  CONFIRMED: "bg-violet-100 text-violet-700",
  PENDING: "bg-amber-100 text-amber-700",
};

export default async function PsychoanalystDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PSYCHOANALYST") redirect("/patient");

  const userId = session.user.id;
  const lang: Lang = await getUserLang(userId);
  const t = (key: string) => translate(lang, key);
  const locale = localeOf(lang);

  const [profile, userRow] = await Promise.all([
    db.psychoanalystProfile.findUnique({ where: { userId } }),
    db.user.findUnique({
      where: { id: userId },
      select: { region: true, timezone: true },
    }),
  ]);
  if (!profile) redirect("/psychoanalyst/settings");

  const displayProfile = decryptPsychoanalystNameFields(profile);

  void audit.viewRecord(userId, "PsychoanalystProfile", profile.id).catch(() => {});

  const providerTz = userRow?.timezone || DEFAULT_TIME_ZONE;
  const region = userRow?.region ?? session.user.region ?? null;
  const { start: todayStart, end: todayEnd } = providerDayBounds(providerTz);
  const now = new Date();

  const [todayCount, analysandCount, pendingCount, upcoming, humanitarianCampaign, humanitarianVolunteer, subscription] =
    await Promise.all([
      db.appointment.count({
        where: {
          psychoanalystId: profile.id,
          scheduledAt: { gte: todayStart, lte: todayEnd },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
      }),
      db.analysandRecord.count({ where: { psychoanalystId: profile.id } }),
      db.appointment.count({
        where: {
          psychoanalystId: profile.id,
          status: "PENDING",
          scheduledAt: { gte: now },
        },
      }),
      db.appointment.findMany({
        where: {
          psychoanalystId: profile.id,
          status: { in: ["CONFIRMED", "PENDING"] },
          scheduledAt: { gte: now },
        },
        include: { patient: { select: { firstName: true, lastName: true } } },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      }),
      getActiveCampaignForRegion(region),
      getVolunteerDashboardState(userId),
      db.subscription.findUnique({
        where: { userId },
        select: { status: true },
      }),
    ]);

  const hasActiveSubscription =
    !!subscription && ["active", "trialing"].includes(subscription.status);

  const greet = t(greetingKey());

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      <PsychoanalystOnboardingCard />

      <HumanitarianVolunteerBanner
        lang={lang}
        campaignActive={!!humanitarianCampaign?.active}
        volunteer={humanitarianVolunteer}
      />

      <DoctorConnectionBanner
        subscribed={hasActiveSubscription}
        defaultRegion={userRow?.region || session.user.region}
        accountHref="/psychoanalyst/account"
      />

      <div>
        <p className="text-slate-500 text-sm">{greet}</p>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
          {displayProfile.firstName} {displayProfile.lastName}
        </h1>
        <p className="text-violet-600 text-sm font-medium mt-1">{t("pa.dash.subtitle")}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Link
          href="/psychoanalyst/appointments"
          className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:border-violet-300 hover:shadow-md transition"
        >
          <p className="text-xs text-slate-500">{t("pa.dash.today")}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{todayCount}</p>
        </Link>
        <Link
          href="/psychoanalyst/analysands"
          className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:border-violet-300 hover:shadow-md transition"
        >
          <p className="text-xs text-slate-500">{t("pa.dash.analysands")}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{analysandCount}</p>
        </Link>
        <Link
          href="/psychoanalyst/appointments"
          className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:border-violet-300 hover:shadow-md transition"
        >
          <p className="text-xs text-slate-500">{t("pa.dash.pending")}</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{pendingCount}</p>
        </Link>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        {[
          { href: "/psychoanalyst/analysands", icon: Users, label: t("pa.nav.analysands") },
          { href: "/psychoanalyst/appointments", icon: Calendar, label: t("nav.appointments") },
          { href: "/psychoanalyst/freud", icon: Brain, label: t("pa.freud.nav") },
          { href: "/psychoanalyst/financeiro", icon: TrendingUp, label: t("nav.financeiro") },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-2 bg-white rounded-xl border border-slate-100 p-4 hover:border-violet-300 hover:shadow-md transition text-center"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600">
              <item.icon size={18} />
            </div>
            <span className="font-semibold text-slate-800 text-xs leading-tight">{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-800">{t("pa.dash.upcoming")}</h2>
          <Link
            href="/psychoanalyst/appointments"
            className="text-xs font-semibold text-violet-600 hover:text-violet-800 inline-flex items-center gap-0.5"
          >
            {t("pa.dash.viewAll")} <ChevronRight size={14} />
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-10">{t("proappt.empty")}</p>
        ) : (
          <div className="p-3 sm:p-4 space-y-3 bg-slate-50/60">
            {upcoming.map((apt) => (
              <div key={apt.id} className="px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-800 text-sm truncate">
                      {safeDecrypt(apt.patient.firstName)} {safeDecrypt(apt.patient.lastName)}
                    </p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        statusColors[apt.status] || "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {t(`status.${apt.status}`)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatShortDate(new Date(apt.scheduledAt), providerTz, locale)}{" "}
                    {formatAppointmentTimeWithLabel(new Date(apt.scheduledAt), providerTz, locale)}
                  </p>
                </div>
                {apt.type === "TELECONSULT" && apt.status === "CONFIRMED" && (
                  <a
                    href={`/video/${apt.id}`}
                    className="w-full sm:w-auto text-center text-xs font-bold bg-violet-500 text-white px-3 py-2.5 rounded-xl hover:bg-violet-600 min-h-[44px] inline-flex items-center justify-center shrink-0 gap-1"
                  >
                    <Video size={12} /> {t("proappt.join")}
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
