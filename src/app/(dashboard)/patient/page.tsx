// src/app/(dashboard)/patient/page.tsx
// Patient home dashboard — reorganized hierarchy (Phase 6A).

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { decryptPatientFields, decrypt } from "@/lib/encryption";
import { translate, localeOf, greetingKey, Lang } from "@/lib/i18n/translations";
import { getUserLang } from "@/lib/i18n/server-lang";
import { getProfessionLabel } from "@/lib/professions";
import {
  Calendar, Pill, AlertCircle, Radio, Stethoscope,
  Clock, ChevronRight, MessageSquare,
  Heart, Video, MapPin,
} from "lucide-react";
import Link from "next/link";
import PatientChecklistWrapper from "./PatientChecklistWrapper";
import PatientTourWrapper from "./PatientTourWrapper";
import { isPatientHistoryFilled } from "@/lib/patient-history-status";
import { activeOnlineJitSessionWhere } from "@/lib/jit-session-lifecycle";
import { isWithinAppointmentJoinWindow } from "@/lib/appointment-join-window";
import ClubDoctorBanner from "@/components/patient/ClubDoctorBanner";
import PatientUpcomingConsultBanner from "@/components/patient/PatientUpcomingConsultBanner";
import ConfirmAttendanceButton from "@/components/patient/ConfirmAttendanceButton";
import PatientPostConsultReview from "@/components/patient/PatientPostConsultReview";
import PatientIncompleteRegistrationCard from "@/components/PatientIncompleteRegistrationCard";
import { computePatientRegistrationStatus } from "@/lib/patient-registration-complete";
import { resolveHumanitarianPatientFlag, HUMANITARIAN_PATIENT_HOME } from "@/lib/humanitarian/patient-identity";
import { resolveRoleHome } from "@/lib/role-home";
import { parseAppointmentIntake } from "@/lib/appointment-intake";
import {
  DEFAULT_TIME_ZONE,
  formatShortDate,
  formatAppointmentTimeWithLabel,
} from "@/lib/timezone";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

function isPrescriptionNotification(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return typeof d.prescriptionId === "string" || d.titleKey === "notif.prescription.title";
}

export default async function PatientDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PATIENT") redirect(resolveRoleHome(session.user.role));

  const userId = session.user.id;
  if (await resolveHumanitarianPatientFlag(userId)) {
    redirect(HUMANITARIAN_PATIENT_HOME);
  }

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
    },
  });

  if (!patient) redirect("/onboarding");

  const cancelledAppointments = await db.appointment.findMany({
    where: {
      patientId: patient.id,
      status: "CANCELLED",
    },
    orderBy: { cancelledAt: "desc" },
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
  });

  await audit.viewRecord(userId, "PatientProfile", patient.id);

  const decrypted = decryptPatientFields(
    { firstName: patient.firstName, lastName: patient.lastName },
    ["firstName", "lastName"]
  );

  const patientRegistration = computePatientRegistrationStatus({
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth,
    addressLine1: patient.addressLine1,
    city: patient.city,
  });
  const profileIncomplete = !patientRegistration.complete;
  const historyIncomplete = !isPatientHistoryFilled(patient.notes);

  const [
    unreadMessages,
    onlineDoctors,
    activeQueue,
    subscription,
    userRow,
    unreadNotifications,
  ] = await Promise.all([
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
    db.notification.findMany({
      where: { userId, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
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
          patientConfirmedAt: soonAppointment.patientConfirmedAt?.toISOString() ?? null,
        };
      })()
    : null;

  const unreadPrescriptionNotif = unreadNotifications.find((n) => isPrescriptionNotification(n.data));

  const queueActive = !!activeQueue;
  const queueCalled = activeQueue?.status === "CALLED";
  const queueInProgress = activeQueue?.status === "IN_PROGRESS";
  const queueWaiting = activeQueue?.status === "WAITING";

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
      card:    "bg-brand-50 border-brand-200 hover:border-brand-400",
      iconWrap:"bg-brand-100",
      icon:    "text-brand-500",
      title:   "text-brand-900",
      desc:    "text-brand-600",
      action:  "text-brand-600",
      badge:   "bg-brand-100 text-brand-700",
    },
    called: {
      card:    "bg-brand-50 border-brand-200 hover:border-brand-400",
      iconWrap:"bg-brand-100",
      icon:    "text-brand-500",
      title:   "text-brand-900",
      desc:    "text-brand-600",
      action:  "text-brand-600",
      badge:   "bg-brand-200 text-brand-700",
    },
    waiting: {
      card:    "bg-brand-50 border-brand-200 hover:border-brand-400",
      iconWrap:"bg-brand-100",
      icon:    "text-brand-500",
      title:   "text-brand-900",
      desc:    "text-brand-600",
      action:  "text-brand-600",
      badge:   "bg-brand-100 text-brand-700",
    },
    available: {
      card:    "bg-accent-50 border-accent-100 hover:border-accent-400",
      iconWrap:"bg-accent-50",
      icon:    "text-accent-500",
      title:   "text-slate-900",
      desc:    "text-accent-600",
      action:  "text-accent-600",
      badge:   "bg-accent-50 text-accent-700",
    },
    offline: {
      card:    "bg-white border-slate-200 hover:border-brand-200",
      iconWrap:"bg-brand-50",
      icon:    "text-brand-500",
      title:   "text-slate-900",
      desc:    "text-slate-500",
      action:  "text-brand-500",
      badge:   "bg-slate-100 text-slate-600",
    },
  };
  const urgent = urgentStyles[urgentVariant];

  type PendingBanner = "rx" | "messages" | "profile" | "history" | "club";
  let pendingBanner: PendingBanner | null = null;
  if (unreadPrescriptionNotif) pendingBanner = "rx";
  else if (unreadMessages > 0) pendingBanner = "messages";
  else if (profileIncomplete) pendingBanner = "profile";
  else if (historyIncomplete) pendingBanner = "history";
  else if (!hasActiveClub) pendingBanner = "club";

  const showActiveQueueCard = queueActive;
  const showSoonConsultCard = !showActiveQueueCard && !!soonConsultProps;
  const showUrgentHero = !showActiveQueueCard && !showSoonConsultCard;

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* 1 — Active state card (queue > 48h consult > urgent hero) */}
      {showActiveQueueCard && (
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
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${urgent.badge}`}>
                  {queueInProgress
                    ? t("pdash.urgent.status.inProgress")
                    : queueCalled
                      ? t("pdash.urgent.status.called")
                      : t("pdash.urgent.status.waiting")}
                </span>
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
                    : queueWaiting
                      ? t("pdash.urgent.desc.waiting").replace("{{position}}", String(activeQueue?.position ?? ""))
                      : t("pdash.urgent.desc.waiting")}
              </p>
            </div>
            <div className={`hidden sm:flex items-center gap-1 text-sm font-semibold shrink-0 ${urgent.action}`}>
              {t("pdash.activeQueue.action")}
              <ChevronRight size={16} />
            </div>
          </div>
        </Link>
      )}

      {showSoonConsultCard && soonConsultProps && (
        <PatientUpcomingConsultBanner appointment={soonConsultProps} />
      )}

      {showUrgentHero && (
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
                {onlineDoctors > 0 && (
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${urgent.badge}`}>
                    {onlineDoctors} {onlineDoctors === 1 ? t("pdash.urgent.doctorOnline") : t("pdash.urgent.doctorsOnline")}
                  </span>
                )}
              </div>
              <p className={`text-sm mt-1 ${urgent.desc}`}>
                {onlineDoctors > 0
                  ? t("pdash.urgent.desc.available")
                  : t("pdash.urgent.desc.offline")}
              </p>
            </div>
            <div className={`hidden sm:flex items-center gap-1 text-sm font-semibold shrink-0 ${urgent.action}`}>
              {t("pdash.urgent.action.start")}
              <ChevronRight size={16} />
            </div>
          </div>
        </Link>
      )}

      {/* 2 — Greeting */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
          {t(greetingKey())}, {decrypted.firstName} 👋
        </h1>
      </div>

      {/* 3 — Two primary actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/urgent"
          className="flex items-center gap-4 rounded-2xl border border-accent-500/20 bg-accent-500 text-white shadow-sm p-5 sm:p-6 transition hover:bg-accent-600 hover:shadow-md"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Radio size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base">{t("nav.urgent")}</p>
            <p className="text-sm text-white/80 mt-0.5">{t("pdash.urgent.desc.available")}</p>
          </div>
          <ChevronRight size={18} className="shrink-0 opacity-80" />
        </Link>

        <div className="flex flex-col rounded-2xl border border-brand-200 bg-brand-500 text-white shadow-sm overflow-hidden transition hover:shadow-md">
          <Link
            href="/patient/appointments"
            className="flex items-center gap-4 p-5 sm:p-6 transition hover:bg-brand-600"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Calendar size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base">{t("pdash.quick.book")}</p>
              <p className="text-sm text-white/80 mt-0.5">{t("pdash.upcoming.action")}</p>
            </div>
            <ChevronRight size={18} className="shrink-0 opacity-80" />
          </Link>
          <Link
            href="/patient/find"
            className="px-5 sm:px-6 pb-4 pt-0 text-xs text-white/90 inline-flex items-center gap-1 underline underline-offset-2 hover:text-white"
          >
            <MapPin size={12} />
            {t("pdash.schedule.mapLink")}
          </Link>
        </div>
      </div>

      {/* 4 — Single pending banner (priority order) */}
      {pendingBanner === "rx" && unreadPrescriptionNotif && (
        <Link
          href="/patient/prescriptions"
          className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4 hover:bg-indigo-100 transition"
        >
          <Stethoscope size={20} className="text-indigo-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-900">{t("notif.prescription.title")}</p>
            <p className="text-xs text-indigo-700 mt-0.5">{unreadPrescriptionNotif.body}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-900">
              {t("nav.myPrescriptions")} <ChevronRight size={13} />
            </span>
          </div>
        </Link>
      )}

      {pendingBanner === "messages" && (
        <Link
          href="/patient/messages"
          className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl p-4 hover:bg-sky-100 transition"
        >
          <MessageSquare size={20} className="text-sky-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sky-900">{t("pdash.attention.messages")}</p>
            <p className="text-xs text-sky-700 mt-0.5">
              {t("pdash.attention.pending").replace("{{count}}", String(unreadMessages))}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-900">
              {t("nav.messages")} <ChevronRight size={13} />
            </span>
          </div>
        </Link>
      )}

      {pendingBanner === "profile" && (
        <PatientIncompleteRegistrationCard
          checklist={patientRegistration.checklist}
          missing={patientRegistration.missing}
        />
      )}

      {pendingBanner === "history" && (
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

      {pendingBanner === "club" && (
        <ClubDoctorBanner
          subscribed={hasActiveClub}
          defaultRegion={userMeta?.region || session.user.region}
        />
      )}

      <PatientChecklistWrapper />
      <PatientTourWrapper lang={lang} />

      {/* 5 — Upcoming appointments + active medications */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Section
          title={t("pdash.upcoming.title")}
          href="/patient/appointments"
          icon={<Calendar size={16} />}
          viewAllLabel={t("common.viewAll")}
        >
          {patient.appointments.length === 0 && cancelledAppointments.length === 0 ? (
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
                    {(() => {
                      const msUntil = new Date(apt.scheduledAt).getTime() - Date.now();
                      const within48h = msUntil > 0 && msUntil <= 48 * 60 * 60 * 1000;
                      return (
                        <ConfirmAttendanceButton
                          appointmentId={apt.id}
                          confirmed={!!apt.patientConfirmedAt}
                          within48h={within48h}
                          compact
                        />
                      );
                    })()}
                    {canJoinVideo && (
                      <a
                        href={`/video/${apt.id}`}
                        className="shrink-0 bg-brand-500 text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-center gap-1 hover:bg-brand-400 transition min-h-[44px] min-w-[44px]"
                      >
                        <Video size={12} /> <span className="sr-only sm:not-sr-only sm:inline">{t("pdash.join")}</span>
                      </a>
                    )}
                  </div>
                </div>
                );
              })}
              {cancelledAppointments.map((apt) => {
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
                return (
                  <div
                    key={apt.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center p-4 bg-rose-50/60 border border-rose-100 rounded-xl"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-500 font-bold text-sm shrink-0 opacity-70">
                        {proFirstName.charAt(0)}{proLastName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-700 text-sm truncate flex items-center gap-2 flex-wrap">
                          {prefix}{proFirstName} {proLastName}
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                            {t("status.CANCELLED")}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">{specialtyLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-left sm:text-right">
                        <p className="text-xs font-semibold text-slate-600">
                          {formatShortDate(new Date(apt.scheduledAt), userTz, locale)}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 sm:justify-end">
                          <Clock size={10} />
                          {formatAppointmentTimeWithLabel(new Date(apt.scheduledAt), userTz, locale)}
                        </p>
                      </div>
                      <Link
                        href="/patient/appointments"
                        className="shrink-0 text-xs font-semibold text-brand-600 border border-brand-200 hover:bg-brand-50 px-3 py-2 rounded-lg transition"
                      >
                        {t("appt.rebookCta")}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

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
      </div>

      <PatientPostConsultReview />

      {/* 6 — Privacy footer */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          <strong>{t("pdash.privacy.bold")}</strong> {t("pdash.privacy.text")}
        </p>
      </div>
    </div>
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
          <Link href={href} className="text-xs text-brand-500 hover:text-brand-400 font-medium flex items-center gap-1">
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
