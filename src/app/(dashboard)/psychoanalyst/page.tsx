import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { translate, localeOf, greetingKey, Lang } from "@/lib/i18n/translations";
import { getUserLang } from "@/lib/i18n/server-lang";
import { decryptPsychoanalystNameFields, safeDecrypt } from "@/lib/psychoanalyst-api";
import { Calendar, Users, ChevronRight, Video, Settings, FileText } from "lucide-react";
import Link from "next/link";
import HumanitarianVolunteerBanner from "@/components/humanitarian/HumanitarianVolunteerBanner";
import DoctorConnectionBanner from "@/components/professional/DoctorConnectionBanner";
import { getActiveCampaignForRegion } from "@/lib/humanitarian/notify";
import { getVolunteerDashboardState } from "@/lib/humanitarian/volunteer-dashboard";

export default async function PsychoanalystDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PSYCHOANALYST") redirect("/patient");

  const userId = session.user.id;
  const lang: Lang = await getUserLang(userId);
  const t = (key: string) => translate(lang, key);
  const locale = localeOf(lang);

  const profile = await db.psychoanalystProfile.findUnique({
    where: { userId },
  });
  if (!profile) redirect("/psychoanalyst/settings");

  const displayProfile = decryptPsychoanalystNameFields(profile);

  await audit.viewRecord(userId, "PsychoanalystProfile", profile.id);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [todayCount, analysandCount, upcoming, humanitarianCampaign, humanitarianVolunteer, subscription, userRow] = await Promise.all([
    db.appointment.count({
      where: {
        psychoanalystId: profile.id,
        scheduledAt: { gte: todayStart, lte: todayEnd },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
    }),
    db.analysandRecord.count({ where: { psychoanalystId: profile.id } }),
    db.appointment.findMany({
      where: {
        psychoanalystId: profile.id,
        status: { in: ["CONFIRMED", "PENDING"] },
        scheduledAt: { gte: new Date() },
      },
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
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
  ]);

  const hasActiveSubscription =
    !!subscription && ["active", "trialing"].includes(subscription.status);

  const hour = new Date().getHours();
  void hour;
  const greet = t(greetingKey());

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      <HumanitarianVolunteerBanner
        lang={lang}
        campaignActive={!!humanitarianCampaign?.active}
        volunteer={humanitarianVolunteer}
      />

      <DoctorConnectionBanner
        subscribed={hasActiveSubscription}
        defaultRegion={userRow?.region || session.user.region}
      />

      <div>
        <p className="text-slate-500 text-sm">{greet}</p>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
          {displayProfile.firstName} {displayProfile.lastName}
        </h1>
        <p className="text-violet-600 text-sm font-medium mt-1">{t("pa.dash.subtitle")}</p>
      </div>

      {!profile.verified && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          {t("pa.dash.completeProfile")}{" "}
          <Link href="/psychoanalyst/settings" className="font-semibold underline">
            {t("nav.myProfile")}
          </Link>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs text-slate-500">{t("pa.dash.today")}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{todayCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs text-slate-500">{t("pa.dash.analysands")}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{analysandCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs text-slate-500">{t("pa.dash.institution")}</p>
          <p className="text-sm font-semibold text-slate-800 mt-2 line-clamp-2">{profile.trainingInstitution || "?"}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { href: "/psychoanalyst/analysands", icon: Users, label: t("pa.nav.analysands") },
          { href: "/psychoanalyst/appointments", icon: Calendar, label: t("nav.appointments") },
          { href: "/psychoanalyst/settings", icon: Settings, label: t("nav.myProfile") },
          { href: "/psychoanalyst/settings/availability", icon: Video, label: t("nav.availability") },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-5 hover:border-violet-300 hover:shadow-md transition"
          >
            <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
              <item.icon size={20} />
            </div>
            <span className="font-semibold text-slate-800 flex-1">{item.label}</span>
            <ChevronRight size={18} className="text-slate-400" />
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <FileText size={18} className="text-violet-500" />
          <h2 className="font-semibold text-slate-800">{t("pa.dash.upcoming")}</h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-10">{t("proappt.empty")}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcoming.map((apt) => (
              <div key={apt.id} className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">
                    {safeDecrypt(apt.patient.firstName)} {safeDecrypt(apt.patient.lastName)}
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
    </div>
  );
}
