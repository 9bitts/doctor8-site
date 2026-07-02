// src/app/(dashboard)/patient/page.tsx
// Patient home dashboard — reorganized with immediate care priority, clickable stats,
// grouped quick actions, and verified navigation targets.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { decryptPatientFields, decrypt } from "@/lib/encryption";
import { translate, localeOf, greetingKey, Lang } from "@/lib/i18n/translations";
import { getUserLang } from "@/lib/i18n/server-lang";
import { getProfessionLabel } from "@/lib/professions";
import {
  Calendar, FileText, Pill, AlertCircle, Radio, Stethoscope,
  Clock, ChevronRight, Activity, AlertTriangle, MessageSquare,
  ClipboardList, Settings, Heart, Video, MapPin, Sparkles,
} from "lucide-react";
import Link from "next/link";
import PatientChecklistWrapper from "./PatientChecklistWrapper";
import PatientTourWrapper from "./PatientTourWrapper";
import { isPatientHistoryFilled } from "@/lib/patient-history-status";
import { activeOnlineJitSessionWhere } from "@/lib/jit-session-lifecycle";
import { isWithinAppointmentJoinWindow } from "@/lib/appointment-join-window";
import ClubDoctorBanner from "@/components/patient/ClubDoctorBanner";
import ChartLinkNoticeBanner from "@/components/patient/ChartLinkNoticeBanner";
import PatientUpcomingConsultBanner from "@/components/patient/PatientUpcomingConsultBanner";
import HumanitarianBanner from "@/components/humanitarian/HumanitarianBanner";
import HumanitarianAnamneseReminder from "@/components/humanitarian/HumanitarianAnamneseReminder";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import {
  getActiveCampaignForRegion,
  getPatientActiveHumanitarianEntry,
} from "@/lib/humanitarian/notify";
import { getPatientIntakeStatusBySlug } from "@/lib/humanitarian/intake";
import { resolveRoleHome } from "@/lib/role-home";
import { getPendingChartLinkNotices } from "@/lib/chart-link-notices";
import { parseAppointmentIntake } from "@/lib/appointment-intake";
import {
  DEFAULT_TIME_ZONE,
  formatShortDate,
  formatShortDateWithYear,
  formatAppointmentTimeWithLabel,
} from "@/lib/timezone";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export default async function PatientDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PATIENT") redirect(resolveRoleHome(session.user.role));

  const userId = session.user.id;

  const lang: Lang = await getUserLang(userId);
  const t = (key: string) => translate(lang, key);
  const locale = localeOf(lang);

  const patient = await db.patientProfile.findUnique({
    where: { userId },
    include: {
      medications: {
        where: { active: true, flow: "CLINICAL" },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      appointments: {
        where: {
          scheduledAt: { gte: new Date() },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        include: {
          professional: {
            select: { firstName: true, lastName: true, specialty: true },
          },
          psychoanalyst: {
            select: { firstName: true, lastName: true },
          },
          integrativeTherapist: {
            select: { firstName: true, lastName: true },
          },
        },
      },
      medicalDocuments: {
        orderBy: { createdAt: "desc" },
        take: 4,
      },
    },
  });

  if (!patient) redirect("/onboarding");

  await audit.viewRecord(userId, "PatientProfile", patient.id);

  const decrypted = decryptPatientFields(
    { firstName: patient.firstName, lastName: patient.lastName },
    ["firstName", "lastName"]
  );

  const hasName = !!(decrypted.firstName && decrypted.lastName);
  const hasDob = !!patient.dateOfBirth;
  const hasAddress = !!(safeDecrypt(patient.addressLine1) || (patient.city || ""));
  const profileIncomplete = !hasName || !hasDob || !hasAddress;
  const historyIncomplete = !isPatientHistoryFilled(patient.notes);

  const [
    prescriptionCount,
    upcomingCount,
    medicationCount,
    documentCount,
    unreadMessages,
    onlineDoctors,
    activeQueue,
    subscription,
    userRow,
    humanitarianCampaign,
    humanitarianEntry,
    humanitarianIntake,
    chartLinkNotices,
  ] = await Promise.all([
    db.prescription.count({
      where: { document: { patientId: patient.id } },
    }),
    // Real totals for the stat cards — the lists above are capped by take.
    db.appointment.count({
      where: {
        patientId: patient.id,
        scheduledAt: { gte: new Date() },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
    }),
    db.medication.count({
      where: { patientId: patient.id, active: true, flow: "CLINICAL" },
    }),
    db.medicalDocument.count({
      where: { patientId: patient.id },
    }),
    db.message.count({
      where: { receiverId: userId, readAt: null, deletedAt: null },
    }),
    db.jitSession.count({ where: activeOnlineJitSessionWhere() }),
    db.jitQueue.findFirst({
      where: {
        patientUserId: userId,
        status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] },
      },
      include: {
        session: {
          select: {
            specialty: true,
            professional: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { enteredAt: "desc" },
    }),
    db.subscription.findUnique({
      where: { userId },
      select: { status: true },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { region: true, timezone: true } as never,
    }),
    getActiveCampaignForRegion(session.user.region),
    getPatientActiveHumanitarianEntry(userId),
    getPatientIntakeStatusBySlug(VENEZUELA_CAMPAIGN_SLUG, userId),
    getPendingChartLinkNotices(userId),
  ]);

  const userMeta = userRow as { region?: string | null; timezone?: string } | null;

  const hasActiveClub =
    !!subscription && ["active", "trialing"].includes(subscription.status);

  const userTz = userMeta?.timezone ?? DEFAULT_TIME_ZONE;

  const soonAppointment = patient.appointments.find((apt) => {
    const ms = new Date(apt.scheduledAt).getTime() - Date.now();
    return ms > 0 && ms <= 48 * 60 * 60 * 1000;
  });

  const soonConsultProps = soonAppointment
    ? (() => {
        const providerName = soonAppointment.professional
          ? `Dr. ${safeDecrypt(soonAppointment.professional.firstName)} ${safeDecrypt(soonAppointment.professional.lastName)}`.trim()
          : soonAppointment.psychoanalyst
            ? `${safeDecrypt(soonAppointment.psychoanalyst.firstName)} ${safeDecrypt(soonAppointment.psychoanalyst.lastName)}`.trim()
            : soonAppointment.integrativeTherapist
              ? `${safeDecrypt(soonAppointment.integrativeTherapist.firstName)} ${safeDecrypt(soonAppointment.integrativeTherapist.lastName)}`.trim()
              : t("chartLink.unknownDoctor");
        const intake = parseAppointmentIntake(soonAppointment.chiefComplaint);
        return {
          appointmentId: soonAppointment.id,
          scheduledAt: soonAppointment.scheduledAt.toISOString(),
          type: soonAppointment.type,
          providerName,
          hasPreConsult: Boolean(intake?.visitReason),
        };
      })()
    : null;

  const queueActive = !!activeQueue;
  const queueCalled = activeQueue?.status === "CALLED";
  const queueInProgress = activeQueue?.status === "IN_PROGRESS";

  type UrgentVariant = "inConsult" | "called" | "waiting" | "available" | "offline";
  const urgentVariant: UrgentVariant = queueInProgress
    ? "inConsult"
    : queueCalled
      ? "called"
      : queueActive
        ? "waiting"
        : onlineDoctors > 0
          ? "available"
          : "offline";

  const urgentStyles: Record<UrgentVariant, {
    card: string; iconWrap: string; icon: string; title: string; desc: string; action: string; badge: string;
  }> = {
    inConsult: {
      card:    "bg-blue-50 border-blue-200 hover:border-blue-300",
      iconWrap:"bg-blue-100",
      icon:    "text-blue-600",
      title:   "text-blue-900",
      desc:    "text-blue-700",
      action:  "text-blue-700",
      badge:   "bg-blue-100 text-blue-800",
    },
    called: {
      card:    "bg-blue-50 border-blue-300 hover:border-blue-400",
      iconWrap:"bg-blue-100",
      icon:    "text-blue-600",
      title:   "text-blue-900",
      desc:    "text-blue-700",
      action:  "text-blue-700",
      badge:   "bg-blue-200 text-blue-900",
    },
    waiting: {
      card:    "bg-emerald-50 border-emerald-200 hover:border-emerald-300",
      iconWrap:"bg-emerald-100",
      icon:    "text-emerald-600",
      title:   "text-emerald-900",
      desc:    "text-emerald-700",
      action:  "text-emerald-700",
      badge:   "bg-emerald-100 text-emerald-800",
    },
    available: {
      card:    "bg-emerald-50 border-emerald-200 hover:border-emerald-300",
      iconWrap:"bg-emerald-100",
      icon:    "text-emerald-600",
      title:   "text-slate-900",
      desc:    "text-emerald-700",
      action:  "text-emerald-700",
      badge:   "bg-emerald-100 text-emerald-700",
    },
    offline: {
      card:    "bg-white border-slate-200 hover:border-emerald-300",
      iconWrap:"bg-emerald-50",
      icon:    "text-emerald-600",
      title:   "text-slate-900",
      desc:    "text-slate-500",
      action:  "text-emerald-600",
      badge:   "bg-slate-100 text-slate-600",
    },
  };
  const urgent = urgentStyles[urgentVariant];

  const quickGroups = [
    {
      title: t("pdash.quick.group.attend"),
      items: [
        { href: "/humanitarian/venezuela-terremoto-2026", labelKey: "nav.humanitarian", icon: <Heart size={20} />, accent: "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200" },
        { href: "/urgent", labelKey: "nav.urgent", icon: <Radio size={20} />, accent: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200" },
        { href: "/patient/find", labelKey: "nav.find", icon: <MapPin size={20} />, accent: "bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200" },
        { href: "/patient/appointments", labelKey: "nav.appointments", icon: <Calendar size={20} />, accent: "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200" },
      ],
    },
    {
      title: t("pdash.quick.group.health"),
      items: [
        { href: "/patient/history", labelKey: "nav.medicalHistory", icon: <Heart size={20} />, accent: "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200" },
        { href: "/patient/medications", labelKey: "nav.medications", icon: <Pill size={20} />, accent: "bg-violet-50 hover:bg-violet-100 text-violet-700 border-violet-200" },
        { href: "/patient/prescriptions", labelKey: "nav.myPrescriptions", icon: <Stethoscope size={20} />, accent: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200" },
        { href: "/patient/documents", labelKey: "nav.documents", icon: <ClipboardList size={20} />, accent: "bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200" },
      ],
    },
    {
      title: t("pdash.quick.group.communicate"),
      items: [
        { href: "/patient/messages", labelKey: "nav.messages", icon: <MessageSquare size={20} />, accent: "bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200", badge: unreadMessages || undefined },
        { href: "/patient/history?share=1", labelKey: "pdash.quick.share", icon: <FileText size={20} />, accent: "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200" },
        { href: "/patient/history", labelKey: "pdash.quick.export", icon: <FileText size={20} />, accent: "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200" },
      ],
    },
    {
      title: t("pdash.quick.group.account"),
      items: [
        { href: "/patient/club-doctor", labelKey: "nav.clubDoctor", icon: <Sparkles size={20} />, accent: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200" },
        { href: "/patient/account", labelKey: "nav.account", icon: <Settings size={20} />, accent: "bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200" },
      ],
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {(humanitarianCampaign?.active || userMeta?.region === "VE") && (
        <>
          <HumanitarianBanner
            lang={lang}
            campaign={{
              slug: humanitarianCampaign?.slug ?? "venezuela-terremoto-2026",
              name: humanitarianCampaign?.name ?? translate(lang, "hum.banner.title"),
            }}
            entry={humanitarianEntry}
            triageValid={humanitarianIntake.triageValid}
            tcleAccepted={humanitarianIntake.tcleAccepted}
          />
          {humanitarianIntake.triageValid && !humanitarianIntake.anamneseComplete && (
            <HumanitarianAnamneseReminder
              lang={lang}
              campaignSlug={humanitarianCampaign?.slug ?? VENEZUELA_CAMPAIGN_SLUG}
            />
          )}
        </>
      )}

      <ClubDoctorBanner
        subscribed={hasActiveClub}
        defaultRegion={userMeta?.region || session.user.region}
      />

      <ChartLinkNoticeBanner notices={chartLinkNotices} />

      {soonConsultProps && (
        <PatientUpcomingConsultBanner appointment={soonConsultProps} />
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
          {t(greetingKey())}, {decrypted.firstName} 👋
        </h1>
        <p className="text-slate-500 mt-1">{t("pdash.subtitle")}</p>
      </div>

      {/* Encontrar profissionais no mapa */}
      <Link
        href="/patient/find"
        className="block rounded-2xl border border-teal-200 bg-teal-50 shadow-sm overflow-hidden transition hover:shadow-md hover:border-teal-300"
      >
        <div className="p-5 sm:p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-teal-100">
            <MapPin size={28} className="text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-slate-900">{t("pdash.find.title")}</p>
            <p className="text-sm mt-1 text-teal-700">{t("pdash.find.desc")}</p>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-sm font-semibold shrink-0 text-teal-700">
            {t("pdash.find.action")}
            <ChevronRight size={16} />
          </div>
        </div>
      </Link>

      {/* Atendimento imediato — priority hero */}
      <Link
        href="/urgent"
        className={`block rounded-2xl border shadow-sm overflow-hidden transition hover:shadow-md ${urgent.card}`}
      >
        <div className="p-5 sm:p-6 flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${urgent.iconWrap}`}>
            <Radio size={28} className={urgent.icon} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-lg font-bold ${urgent.title}`}>
                {t("nav.urgent")}
              </p>
              {queueActive && (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${urgent.badge}`}>
                  {queueInProgress
                    ? t("pdash.urgent.status.inProgress")
                    : queueCalled
                      ? t("pdash.urgent.status.called")
                      : t("pdash.urgent.status.waiting")}
                </span>
              )}
              {!queueActive && onlineDoctors > 0 && (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${urgent.badge}`}>
                  {onlineDoctors} {onlineDoctors === 1 ? t("pdash.urgent.doctorOnline") : t("pdash.urgent.doctorsOnline")}
                </span>
              )}
            </div>
            <p className={`text-sm mt-1 ${urgent.desc}`}>
              {queueInProgress
                ? t("pdash.urgent.desc.inProgress").replace(
                    "{{doctor}}",
                    activeQueue?.session.professional
                      ? `Dr. ${safeDecrypt(activeQueue.session.professional.firstName)} ${safeDecrypt(activeQueue.session.professional.lastName)}`.trim()
                      : ""
                  )
                : queueCalled
                  ? t("pdash.urgent.desc.called")
                  : queueActive
                    ? t("pdash.urgent.desc.waiting").replace("{{position}}", String(activeQueue?.position ?? ""))
                    : onlineDoctors > 0
                      ? t("pdash.urgent.desc.available")
                      : t("pdash.urgent.desc.offline")}
            </p>
          </div>
          <div className={`hidden sm:flex items-center gap-1 text-sm font-semibold shrink-0 ${urgent.action}`}>
            {queueActive ? t("pdash.urgent.action.manage") : t("pdash.urgent.action.start")}
            <ChevronRight size={16} />
          </div>
        </div>
      </Link>

      {/* Incomplete profile banner */}
      {profileIncomplete && (
        <Link
          href="/patient/account"
          className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition"
        >
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">{t("pdash.completeProfile.title")}</p>
            <p className="text-xs text-amber-700 mt-0.5">{t("pdash.completeProfile.text")}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-900">
              {t("pdash.completeProfile.action")} <ChevronRight size={13} />
            </span>
          </div>
        </Link>
      )}

      {!profileIncomplete && historyIncomplete && (
        <Link
          href="/patient/history"
          className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4 hover:bg-rose-100 transition"
        >
          <Heart size={20} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-rose-900">{t("pdash.historyPrompt.title")}</p>
            <p className="text-xs text-rose-700 mt-0.5">{t("pdash.historyPrompt.text")}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-900">
              {t("pdash.historyPrompt.action")} <ChevronRight size={13} />
            </span>
          </div>
        </Link>
      )}

      <PatientChecklistWrapper />
      <PatientTourWrapper lang={lang} />

      {/* Clickable stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Calendar className="text-blue-500" size={20} />}
          label={t("pdash.stat.upcoming")}
          value={upcomingCount}
          bg="bg-blue-50"
          href="/patient/appointments"
        />
        <StatCard
          icon={<Pill className="text-emerald-500" size={20} />}
          label={t("pdash.stat.medications")}
          value={medicationCount}
          bg="bg-emerald-50"
          href="/patient/medications"
        />
        <StatCard
          icon={<FileText className="text-violet-500" size={20} />}
          label={t("pdash.stat.documents")}
          value={documentCount}
          bg="bg-violet-50"
          href="/patient/documents"
        />
        <StatCard
          icon={<Stethoscope className="text-indigo-500" size={20} />}
          label={t("pdash.stat.prescriptions")}
          value={prescriptionCount}
          bg="bg-indigo-50"
          href="/patient/prescriptions"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Upcoming appointments */}
        <Section
          title={t("pdash.upcoming.title")}
          href="/patient/appointments"
          icon={<Calendar size={16} />}
          viewAllLabel={t("common.viewAll")}
        >
          {patient.appointments.length === 0 ? (
            <EmptyState
              icon={<Calendar size={28} className="text-slate-300" />}
              message={t("pdash.upcoming.empty")}
              action={t("pdash.upcoming.action")}
              href="/patient/appointments"
            />
          ) : (
            <div className="space-y-3">
              {patient.appointments.map((apt) => {
                const pro = apt.professional ?? apt.psychoanalyst ?? apt.integrativeTherapist;
                const specialtyLabel = apt.professional
                  ? getProfessionLabel(lang, apt.professional.specialty)
                  : apt.psychoanalyst
                    ? t("providers.typePsychoanalyst")
                    : t("providers.typeIntegrative");
                const prefix = apt.professional ? "Dr. " : "";
                if (!pro) return null;
                const proFirstName = safeDecrypt(pro.firstName);
                const proLastName = safeDecrypt(pro.lastName);
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
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                      {proFirstName.charAt(0)}{proLastName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">
                        {prefix}{proFirstName} {proLastName}
                      </p>
                      <p className="text-xs text-slate-500">{specialtyLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-semibold text-slate-700">
                        {formatShortDate(new Date(apt.scheduledAt), userTz, locale)}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 sm:justify-end">
                        <Clock size={10} />
                        {formatAppointmentTimeWithLabel(new Date(apt.scheduledAt), userTz, locale)}
                      </p>
                    </div>
                    {canJoinVideo && (
                      <a
                        href={`/video/${apt.id}`}
                        className="shrink-0 bg-emerald-500 text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-center gap-1 hover:bg-emerald-400 transition min-h-[44px] min-w-[44px]"
                      >
                        <Video size={12} /> <span className="sr-only sm:not-sr-only sm:inline">{t("pdash.join")}</span>
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
        <Section title={t("pdash.attention.title")} icon={<AlertCircle size={16} />} viewAllLabel={t("common.viewAll")}>
          <div className="space-y-3">
            <AttentionRow
              href="/urgent"
              icon={<Radio size={18} className="text-emerald-600" />}
              label={t("nav.urgent")}
              detail={queueActive
                ? t("pdash.urgent.desc.waiting").replace("{{position}}", String(activeQueue?.position ?? ""))
                : onlineDoctors > 0
                  ? `${onlineDoctors} ${t("pdash.urgent.doctorsOnline")}`
                  : t("pdash.attention.urgentNone")}
            />
            <AttentionRow
              href="/patient/messages"
              icon={<MessageSquare size={18} className="text-blue-600" />}
              label={t("pdash.attention.messages")}
              count={unreadMessages}
              emptyLabel={t("pdash.attention.none")}
              pendingLabel={t("pdash.attention.pending").replace("{{count}}", String(unreadMessages))}
            />
            <AttentionRow
              href="/patient/prescriptions"
              icon={<Stethoscope size={18} className="text-indigo-600" />}
              label={t("pdash.attention.prescriptions")}
              detail={prescriptionCount > 0
                ? `${prescriptionCount} ${prescriptionCount === 1 ? t("pdash.attention.rxOne") : t("pdash.attention.rxMany")}`
                : t("pdash.attention.rxNone")}
            />
          </div>
        </Section>

        {/* Active medications */}
        <Section
          title={t("pdash.meds.title")}
          href="/patient/medications"
          icon={<Pill size={16} />}
          viewAllLabel={t("common.viewAll")}
        >
          {patient.medications.length === 0 ? (
            <EmptyState
              icon={<Pill size={28} className="text-slate-300" />}
              message={t("pdash.meds.empty")}
              action={t("pdash.meds.action")}
              href="/patient/medications"
            />
          ) : (
            <div className="space-y-3">
              {patient.medications.map((med) => {
                const decryptedMed = decryptPatientFields(
                  { name: med.name, dosage: med.dosage || "", frequency: med.frequency || "" },
                  ["name", "dosage", "frequency"]
                );
                return (
                  <Link
                    key={med.id}
                    href="/patient/medications"
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <Pill size={18} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{decryptedMed.name}</p>
                      <p className="text-xs text-slate-500">
                        {decryptedMed.dosage} · {decryptedMed.frequency}
                      </p>
                    </div>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium shrink-0">
                      {t("common.active")}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Section>

        {/* Recent documents */}
        <Section
          title={t("pdash.docs.title")}
          href="/patient/documents"
          icon={<FileText size={16} />}
          viewAllLabel={t("common.viewAll")}
        >
          {patient.medicalDocuments.length === 0 ? (
            <EmptyState
              icon={<FileText size={28} className="text-slate-300" />}
              message={t("pdash.docs.empty")}
              action={t("pdash.docs.action")}
              href="/patient/documents"
            />
          ) : (
            <div className="space-y-3">
              {patient.medicalDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  href="/patient/documents"
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">
                      {doc.type.replace("_", " ")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatShortDateWithYear(new Date(doc.createdAt), userTz, locale)}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </Section>

        {/* Quick access — grouped */}
        <div className="lg:col-span-2">
          <Section title={t("pdash.quick.title")} icon={<Activity size={16} />} viewAllLabel={t("common.viewAll")}>
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
                        {"badge" in item && item.badge ? (
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

      {/* Privacy notice */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          <strong>{t("pdash.privacy.bold")}</strong> {t("pdash.privacy.text")}
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg, href }: {
  icon: React.ReactNode; label: string; value: string | number; bg: string; href: string;
}) {
  return (
    <Link href={href} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition block">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
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
          <Link href={href} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
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
      <Link href={href} className="text-xs text-emerald-600 hover:underline font-medium">{action} →</Link>
    </div>
  );
}

function AttentionRow({ href, icon, label, count, detail, emptyLabel, pendingLabel }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  detail?: string;
  emptyLabel?: string;
  pendingLabel?: string;
}) {
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
          <p className="text-xs text-rose-600 font-medium mt-0.5">{pendingLabel}</p>
        ) : (
          <p className="text-xs text-slate-400 mt-0.5">{emptyLabel}</p>
        )}
      </div>
      <ChevronRight size={16} className="text-slate-400 shrink-0" />
    </Link>
  );
}
