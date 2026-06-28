import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { translate, localeOf, greetingKey, Lang } from "@/lib/i18n/translations";
import { getUserLang } from "@/lib/i18n/server-lang";
import { decryptIntegrativeNameFields, safeDecrypt } from "@/lib/integrative-therapist-api";
import { picBySlug, picLabel } from "@/lib/pics/practices";
import { Calendar, Users, ChevronRight, Video, Settings, FileText, Leaf } from "lucide-react";
import Link from "next/link";
import HumanitarianVolunteerBanner from "@/components/humanitarian/HumanitarianVolunteerBanner";
import AcuraVolunteerOptIn from "@/components/acura/AcuraVolunteerOptIn";
import ProviderVerificationBanner from "@/components/ProviderVerificationBanner";
import { getActiveCampaignForRegion } from "@/lib/humanitarian/notify";
import { getVolunteerDashboardState } from "@/lib/humanitarian/volunteer-dashboard";

export default async function IntegrativeTherapistDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "INTEGRATIVE_THERAPIST") redirect("/patient");

  const userId = session.user.id;
  const lang: Lang = await getUserLang(userId);
  const t = (key: string) => translate(lang, key);
  const locale = localeOf(lang);

  const profile = await db.integrativeTherapistProfile.findUnique({ where: { userId } });
  if (!profile) redirect("/integrative-therapist/settings");

  const displayProfile = decryptIntegrativeNameFields(profile);
  await audit.viewRecord(userId, "IntegrativeTherapistProfile", profile.id);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

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
        include: { patient: { select: { firstName: true, lastName: true } } },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      }),
      getActiveCampaignForRegion(null),
      getVolunteerDashboardState(userId),
    ]);

  const practiceLabels = profile.picsPractices
    .slice(0, 3)
    .map((slug) => {
      const p = picBySlug(slug);
      return p ? picLabel(p, lang) : slug;
    })
    .join(", ");

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

      {!profile.verified && (
        <ProviderVerificationBanner settingsHref="/integrative-therapist/settings" />
      )}

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
        {upcoming.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-10">{t("proappt.empty")}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcoming.map((apt) => (
              <div
                key={apt.id}
                className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
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
                    className="w-full sm:w-auto text-center text-xs font-bold bg-teal-500 text-white px-3 py-2.5 rounded-xl hover:bg-teal-600 min-h-[44px] inline-flex items-center justify-center shrink-0"
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
