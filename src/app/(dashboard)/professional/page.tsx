// src/app/(dashboard)/professional/page.tsx
// Professional home dashboard — reorganized with JIT priority, clickable stats,
// grouped quick actions, and verified navigation targets.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { translate, localeOf, greetingKey, Lang } from "@/lib/i18n/translations";
import { getUserLang } from "@/lib/i18n/server-lang";
import {
  Calendar, Users, DollarSign, Clock, ChevronRight, Video, Radio,
  Inbox, MessageSquare, Stethoscope, BookOpen, UserCog, Settings,
  TrendingUp, Activity, Sparkles, FileSignature,
} from "lucide-react";
import Link from "next/link";
import MarketPricingCard from "@/components/professional/MarketPricingCard";
import DoctorConnectionBanner from "@/components/professional/DoctorConnectionBanner";
import HumanitarianVolunteerBanner from "@/components/humanitarian/HumanitarianVolunteerBanner";
import AcuraVolunteerOptIn from "@/components/acura/AcuraVolunteerOptIn";
import ProfessionalInsightsBanner from "@/components/professional/ProfessionalInsightsBanner";
import { getActiveCampaignForRegion } from "@/lib/humanitarian/notify";
import { getVolunteerDashboardState } from "@/lib/humanitarian/volunteer-dashboard";
import { getProfessionalDashboardInsights } from "@/lib/professional-dashboard-insights";
import { decrypt } from "@/lib/encryption";
import { getProfessionLabel } from "@/lib/professions";
import { resolveRoleHome } from "@/lib/role-home";
import { isWithinAppointmentJoinWindow } from "@/lib/appointment-join-window";
import { providerDayBounds } from "@/lib/provider-day-bounds";
import { buildProviderFinanceiroReport } from "@/lib/provider-financeiro";
import ProfessionalTourWrapper from "./ProfessionalTourWrapper";
import IncompleteLicenseBanner from "@/components/professional/IncompleteLicenseBanner";
import ProfessionalChecklistWrapper from "./ProfessionalChecklistWrapper";
import { formatMoneyCents } from "@/lib/safe-format-currency";
import { initialsOf } from "@/lib/format-name";
import {
  DEFAULT_TIME_ZONE,
  formatShortDate,
  formatAppointmentTimeWithLabel,
} from "@/lib/timezone";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export default async function ProfessionalDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROFESSIONAL") redirect(resolveRoleHome(session.user.role));

  const userId = session.user.id;
  const lang: Lang = await getUserLang(userId);
  const t = (key: string) => translate(lang, key);
  const locale = localeOf(lang);

  const [professional, userRow] = await Promise.all([
    db.professionalProfile.findUnique({
      where: { userId },
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
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { region: true },
    }),
  ]);

  if (!professional) redirect("/onboarding");

  const providerTz = professional.timezone || DEFAULT_TIME_ZONE;
  const { start: todayStart, end: todayEnd } = providerDayBounds(providerTz);
  const regionForCampaign = userRow?.region ?? session.user.region ?? null;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    completedToday,
    remainingToday,
    patientCount,
    upcomingCount,
    pendingApprovalCount,
    awaitingSignatureCount,
    jitSession,
    sharedPending,
    unreadMessages,
    subscription,
    humanitarianCampaign,
    humanitarianVolunteer,
    dashboardInsights,
    monthFinanceReport,
  ] = await Promise.all([
    db.appointment.count({
      where: {
        professionalId: professional.id,
        scheduledAt: { gte: todayStart, lte: todayEnd },
        status: "COMPLETED",
      },
    }),
    db.appointment.count({
      where: {
        professionalId: professional.id,
        scheduledAt: { gte: new Date(), lte: todayEnd },
        status: "CONFIRMED",
      },
    }),
    db.patientRecord.count({ where: { professionalId: professional.id } }),
    db.appointment.count({
      where: {
        professionalId: professional.id,
        status: { in: ["CONFIRMED", "PENDING"] },
        scheduledAt: { gte: new Date() },
      },
    }),
    db.appointment.count({
      where: {
        professionalId: professional.id,
        status: "PENDING",
        scheduledAt: { gte: new Date() },
      },
    }),
    Promise.all([
      db.prescription.count({
        where: {
          professionalId: professional.id,
          signatureStatus: "PENDING",
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      db.medicalDocument.count({
        where: {
          professionalId: professional.id,
          signatureStatus: "PENDING",
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]).then(([rx, docs]) => rx + docs),
    db.jitSession.findFirst({
      where: { professionalId: professional.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            queue: { where: { status: { in: ["WAITING", "CALLED"] } } },
          },
        },
      },
    }),
    db.sharedRecord.count({
      where: {
        sharedWithProfessionalId: professional.id,
        viewedAt: null,
      },
    }),
    db.message.count({
      where: {
        receiverId: userId,
        readAt: null,
        deletedAt: null,
      },
    }),
    db.subscription.findUnique({
      where: { userId },
      select: { status: true },
    }),
    getActiveCampaignForRegion(regionForCampaign),
    getVolunteerDashboardState(userId),
    getProfessionalDashboardInsights(professional.id),
    buildProviderFinanceiroReport({
      providerId: professional.id,
      providerField: "professionalId",
      currency: professional.currency,
      period: "this_month",
      includeJit: true,
    }),
    audit.viewRecord(userId, "ProfessionalProfile", professional.id),
  ]);

  const hasActiveSubscription =
    !!subscription && ["active", "trialing"].includes(subscription.status);

  const monthEarningsTotal = monthFinanceReport.totalNetCents;
  const jitOnline = jitSession?.status === "ONLINE";
  const jitPaused = jitSession?.status === "PAUSED";
  const jitWaiting = jitSession?._count.queue ?? 0;

  const jitStyles = jitOnline
    ? {
        card: "bg-brand-50 border-brand-200 hover:border-brand-200",
        iconWrap: "bg-brand-100", icon: "text-brand-500",
        title: "text-brand-900", desc: "text-brand-600", action: "text-brand-600",
        badge: "bg-brand-100 text-brand-700",
      }
    : jitPaused
      ? {
          card: "bg-amber-50 border-amber-200 hover:border-amber-300",
          iconWrap: "bg-amber-100", icon: "text-amber-600",
          title: "text-amber-900", desc: "text-amber-700", action: "text-amber-700",
          badge: "bg-amber-100 text-amber-800",
        }
      : {
          card: "bg-white border-slate-200 hover:border-brand-200",
          iconWrap: "bg-brand-50", icon: "text-brand-500",
          title: "text-slate-900", desc: "text-slate-500", action: "text-brand-500",
          badge: "bg-slate-100 text-slate-600",
        };

  const fmtCurrency = (cents: number) =>
    formatMoneyCents(cents, professional.currency, locale);

  const quickGroups = [
    {
      title: t("prodash.quick.group.attend"),
      items: [
        { href: "/professional/jit", labelKey: "nav.jit", icon: <Radio size={20} />, accent: "bg-brand-50 hover:bg-brand-100 text-brand-600 border-brand-200" },
        { href: "/professional/appointments", labelKey: "nav.appointments", icon: <Calendar size={20} />, accent: "bg-brand-50 hover:bg-brand-100 text-brand-600 border-brand-200" },
        { href: "/professional/settings/availability", labelKey: "nav.availability", icon: <Clock size={20} />, accent: "bg-brand-50 hover:bg-brand-100 text-brand-600 border-brand-200" },
      ],
    },
    {
      title: t("prodash.quick.group.patients"),
      items: [
        { href: "/professional/patients", labelKey: "nav.patients", icon: <Users size={20} />, accent: "bg-brand-50 hover:bg-brand-100 text-brand-600 border-brand-200" },
        { href: "/professional/shared", labelKey: "nav.sharedWithMe", icon: <Inbox size={20} />, accent: "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200", badge: sharedPending || undefined },
      ],
    },
    {
      title: t("prodash.quick.group.clinical"),
      items: [
        { href: "/professional/prescriptions", labelKey: "nav.prescriptions", icon: <Stethoscope size={20} />, accent: "bg-accent-50 hover:bg-accent-100 text-accent-600 border-accent-100" },
        { href: "/professional/resources", labelKey: "nav.library", icon: <BookOpen size={20} />, accent: "bg-brand-50 hover:bg-brand-100 text-brand-600 border-brand-200" },
      ],
    },
    {
      title: t("prodash.quick.group.manage"),
      items: [
        { href: "/professional/financeiro", labelKey: "nav.financeiro", icon: <TrendingUp size={20} />, accent: "bg-brand-50 hover:bg-brand-100 text-brand-600 border-brand-200" },
        { href: "/professional/doctor-connection", labelKey: "nav.doctorConnection", icon: <Sparkles size={20} />, accent: "bg-brand-50 hover:bg-brand-100 text-brand-600 border-brand-200" },
        { href: "/professional/messages", labelKey: "nav.messages", icon: <MessageSquare size={20} />, accent: "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200", badge: unreadMessages || undefined },
        { href: "/professional/settings", labelKey: "nav.myProfile", icon: <UserCog size={20} />, accent: "bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200" },
        { href: "/professional/account", labelKey: "nav.account", icon: <Settings size={20} />, accent: "bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200" },
      ],
    },
  ];

  const displayName = `${professional.firstName} ${professional.lastName}`.trim();
  const greetingText = t("prodash.greetingName")
    .replace("{{greeting}}", t(greetingKey()))
    .replace("{{name}}", displayName);

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {!professional.licenseNumber?.trim() && (
        <IncompleteLicenseBanner
          lang={lang}
          specialty={professional.specialty}
          settingsHref="/professional/settings"
        />
      )}

      <HumanitarianVolunteerBanner
        lang={lang}
        campaignActive={!!humanitarianCampaign?.active}
        volunteer={humanitarianVolunteer}
      />

      <AcuraVolunteerOptIn
        initialChecked={professional.acuraVolunteer}
        verified={professional.verified}
      />

      <DoctorConnectionBanner
        subscribed={hasActiveSubscription}
        defaultRegion={userRow?.region || session.user.region}
      />

      <ProfessionalChecklistWrapper />
      <ProfessionalTourWrapper lang={lang} />

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
          {greetingText} 👋
        </h1>
        <p className="text-slate-500 mt-1">{getProfessionLabel(lang, professional.specialty) || t("prodash.subtitle")}</p>
      </div>

      {/* Plantão Online — priority hero */}
      <Link
        href="/professional/jit"
        className={`block rounded-2xl border shadow-sm overflow-hidden transition hover:shadow-md ${jitStyles.card}`}
      >
        <div className="p-5 sm:p-6 flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${jitStyles.iconWrap}`}>
            <Radio size={28} className={jitStyles.icon} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-lg font-bold ${jitStyles.title}`}>
                {t("nav.jit")}
              </p>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${jitStyles.badge}`}>
                {jitOnline
                  ? t("prodash.jit.status.online")
                  : jitPaused
                    ? t("prodash.jit.status.paused")
                    : t("prodash.jit.status.offline")}
              </span>
            </div>
            <p className={`text-sm mt-1 ${jitStyles.desc}`}>
              {jitOnline
                ? t("prodash.jit.desc.online").replace("{{count}}", String(jitWaiting))
                : jitPaused
                  ? t("prodash.jit.desc.paused")
                  : t("prodash.jit.desc.offline")}
            </p>
          </div>
          <div className={`hidden sm:flex items-center gap-1 text-sm font-semibold shrink-0 ${jitStyles.action}`}>
            {jitOnline || jitPaused ? t("prodash.jit.action.manage") : t("prodash.jit.action.start")}
            <ChevronRight size={16} />
          </div>
        </div>
      </Link>

      <ProfessionalInsightsBanner insights={dashboardInsights} />

      {/* Clickable stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Calendar className="text-brand-500" size={20} />}
          label={t("prodash.stat.today")}
          value={completedToday}
          subtext={
            remainingToday > 0
              ? t("prodash.stat.todayRemaining").replace("{{count}}", String(remainingToday))
              : undefined
          }
          bg="bg-brand-50"
          href="/professional/appointments"
        />
        <StatCard
          icon={<Clock className="text-rose-500" size={20} />}
          label={t("prodash.stat.upcoming")}
          value={upcomingCount}
          bg="bg-rose-50"
          href="/professional/appointments"
        />
        <StatCard
          icon={<Users className="text-brand-500" size={20} />}
          label={t("prodash.stat.patients")}
          value={patientCount}
          bg="bg-brand-50"
          href="/professional/patients"
        />
        <StatCard
          icon={<DollarSign className="text-brand-500" size={20} />}
          label={t("prodash.stat.monthEarningsNet")}
          value={fmtCurrency(monthEarningsTotal)}
          bg="bg-brand-50"
          href="/professional/financeiro"
        />
      </div>

      <MarketPricingCard />

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Upcoming appointments */}
        <Section
          title={t("prodash.upcoming.title")}
          href="/professional/appointments"
          icon={<Calendar size={16} />}
          viewAllLabel={t("common.viewAll")}
        >
          {professional.appointments.length === 0 ? (
            <EmptyState
              icon={<Calendar size={28} className="text-slate-300" />}
              message={t("prodash.upcoming.empty")}
              action={t("prodash.upcoming.action")}
              href="/professional/appointments"
            />
          ) : (
            <div className="space-y-3">
              {professional.appointments.map((apt) => {
                const firstName = safeDecrypt(apt.patient.firstName);
                const lastName = safeDecrypt(apt.patient.lastName);
                const canJoinVideo =
                  apt.type === "TELECONSULT" &&
                  apt.status === "CONFIRMED" &&
                  isWithinAppointmentJoinWindow(apt.scheduledAt, apt.durationMins);
                return (
                <div
                  key={apt.id}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center font-bold text-brand-500 text-sm shrink-0">
                      {initialsOf(firstName, lastName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">
                        {firstName} {lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {apt.type === "TELECONSULT" ? t("prodash.type.teleconsult") : t("prodash.type.inPerson")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-semibold text-slate-700">
                        {formatShortDate(new Date(apt.scheduledAt), providerTz, locale)}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 sm:justify-end">
                        <Clock size={10} />
                        {formatAppointmentTimeWithLabel(new Date(apt.scheduledAt), providerTz, locale)}
                      </p>
                    </div>
                    {canJoinVideo && (
                      <a
                        href={`/video/${apt.id}`}
                        className="shrink-0 bg-brand-500 text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-center gap-1 hover:bg-brand-400 transition min-h-[44px] min-w-[44px]"
                      >
                        <Video size={12} /> <span className="sr-only sm:not-sr-only sm:inline">{t("prodash.join")}</span>
                      </a>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </Section>

        {/* Attention items */}
        <Section
          title={t("prodash.attention.title")}
          icon={<Inbox size={16} />}
          viewAllLabel={t("common.viewAll")}
        >
          <div className="space-y-3">
            <AttentionRow
              href="/professional/appointments"
              icon={<Calendar size={18} className={pendingApprovalCount > 0 ? "text-amber-600" : "text-slate-400"} />}
              label={t("prodash.attention.pendingApproval")}
              count={pendingApprovalCount}
              emptyLabel={t("prodash.attention.none")}
              pendingLabel={t("prodash.attention.pending").replace("{{count}}", String(pendingApprovalCount))}
              pendingTone="amber"
            />
            <AttentionRow
              href="/professional/prescriptions"
              icon={<FileSignature size={18} className={awaitingSignatureCount > 0 ? "text-amber-600" : "text-slate-400"} />}
              label={t("prodash.attention.awaitingSignature")}
              count={awaitingSignatureCount}
              emptyLabel={t("prodash.attention.none")}
              pendingLabel={t("prodash.attention.pending").replace("{{count}}", String(awaitingSignatureCount))}
              pendingTone="amber"
            />
            <AttentionRow
              href="/professional/shared"
              icon={<Inbox size={18} className="text-amber-600" />}
              label={t("prodash.attention.shared")}
              count={sharedPending}
              emptyLabel={t("prodash.attention.none")}
              pendingLabel={t("prodash.attention.pending").replace("{{count}}", String(sharedPending))}
            />
            <AttentionRow
              href="/professional/messages"
              icon={<MessageSquare size={18} className="text-brand-500" />}
              label={t("prodash.attention.messages")}
              count={unreadMessages}
              emptyLabel={t("prodash.attention.none")}
              pendingLabel={t("prodash.attention.pending").replace("{{count}}", String(unreadMessages))}
            />
            <AttentionRow
              href="/professional/financeiro"
              icon={<TrendingUp size={18} className="text-brand-500" />}
              label={t("prodash.attention.earnings")}
              detail={fmtCurrency(monthEarningsTotal)}
            />
          </div>
        </Section>

        {/* Quick actions — grouped */}
        <div className="lg:col-span-2">
          <Section title={t("prodash.quick.title")} icon={<Activity size={16} />} viewAllLabel={t("common.viewAll")}>
            <div className="space-y-6">
              {quickGroups.map((group) => (
                <div key={group.title}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{group.title}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-xl text-center transition font-medium text-sm border ${item.accent}`}
                      >
                        {item.badge ? (
                          <span className="absolute top-2 right-2 min-w-[1.25rem] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {item.badge > 9 ? "9+" : item.badge}
                          </span>
                        ) : null}
                        {item.icon}
                        <span className="leading-tight">{t(item.labelKey)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtext, bg, href }: {
  icon: React.ReactNode; label: string; value: string | number; subtext?: string; bg: string; href: string;
}) {
  return (
    <Link href={href} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition block min-w-0">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      {subtext ? <p className="text-[10px] text-slate-400 mt-0.5">{subtext}</p> : null}
    </Link>
  );
}

function Section({ title, href, icon, children, viewAllLabel }: {
  title: string; href?: string; icon: React.ReactNode; children: React.ReactNode; viewAllLabel: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
          {icon}
          {title}
        </div>
        {href && (
          <Link href={href} className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
            {viewAllLabel} <ChevronRight size={14} />
          </Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyState({ icon, message, action, href }: {
  icon: React.ReactNode; message: string; action: string; href: string;
}) {
  return (
    <div className="text-center py-6">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-sm text-slate-500 mb-3">{message}</p>
      <Link href={href} className="text-xs text-brand-500 hover:underline font-medium">{action} →</Link>
    </div>
  );
}

function AttentionRow({ href, icon, label, count, detail, emptyLabel, pendingLabel, pendingTone = "rose" }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  detail?: string;
  emptyLabel?: string;
  pendingLabel?: string;
  pendingTone?: "rose" | "amber";
}) {
  const pendingClass = pendingTone === "amber" ? "text-amber-600" : "text-rose-600";
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
    >
      <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm">{label}</p>
        {detail ? (
          <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
        ) : count && count > 0 ? (
          <p className={`text-xs font-medium mt-0.5 ${pendingClass}`}>{pendingLabel}</p>
        ) : (
          <p className="text-xs text-slate-400 mt-0.5">{emptyLabel}</p>
        )}
      </div>
      <ChevronRight size={16} className="text-slate-400 shrink-0" />
    </Link>
  );
}
