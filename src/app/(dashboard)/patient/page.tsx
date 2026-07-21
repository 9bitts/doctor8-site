// src/app/(dashboard)/patient/page.tsx
// Patient home dashboard — redesigned panel.

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
  Heart, Video, MapPin, FileText, FlaskConical, Inbox, ClipboardList, ScrollText,
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
import ChartLinkNoticeBanner from "@/components/patient/ChartLinkNoticeBanner";
import PatientEmissionAlertsPanel from "@/components/patient/PatientEmissionAlertsPanel";
import PatientSendToProfessionalsBanner from "@/components/patient/PatientSendToProfessionalsBanner";
import PatientQuickAccess from "@/components/patient/PatientQuickAccess";
import PatientHealthSnapshot from "@/components/patient/PatientHealthSnapshot";
import PatientCareToolsChips from "@/components/patient/PatientCareToolsChips";
import ScheduledVolunteerBanner from "@/components/patient/ScheduledVolunteerBanner";
import { getPendingChartLinkNotices } from "@/lib/chart-link-notices";
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

function parseNotifData(data: unknown): Record<string, unknown> | null {
  if (!data) return null;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof data === "object") return data as Record<string, unknown>;
  return null;
}

function isPrescriptionNotification(data: unknown): boolean {
  const d = parseNotifData(data);
  if (!d) return false;
  return typeof d.prescriptionId === "string" || d.titleKey === "notif.prescription.title";
}

function isExamNotification(data: unknown): boolean {
  const d = parseNotifData(data);
  if (!d) return false;
  return d.titleKey === "notif.exam.title" || d.type === "EXAM_REQUEST";
}

function isDocumentNotification(data: unknown, type?: string): boolean {
  const d = parseNotifData(data);
  if (!d) return false;
  if (type === "DOCUMENT_SHARED") return true;
  if (d.titleKey === "notif.document.title" || d.titleKey === "notif.newResource.title") return true;
  if (typeof d.documentId === "string" && !isPrescriptionNotification(data) && !isExamNotification(data)) {
    return true;
  }
  return false;
}

function sharedDocHref(data: unknown, type?: string): string {
  const d = parseNotifData(data);
  if (!d) return "/patient/documents";
  if (typeof d.url === "string" && d.url.startsWith("/")) return d.url;
  if (isPrescriptionNotification(data)) return "/patient/prescriptions";
  if (isExamNotification(data)) return "/patient/exam-requests";
  if (type === "DOCUMENT_SHARED" || d.titleKey === "notif.newResource.title") {
    return "/patient/resources";
  }
  if (typeof d.documentId === "string") {
    return `/patient/documents?documentId=${encodeURIComponent(d.documentId)}`;
  }
  return "/patient/documents";
}

function sharedDocTitleKey(data: unknown, type?: string): string {
  const d = parseNotifData(data);
  if (isPrescriptionNotification(data)) return "notif.prescription.title";
  if (isExamNotification(data)) return "notif.exam.title";
  if (type === "DOCUMENT_SHARED" || d?.titleKey === "notif.newResource.title") {
    return "notif.newResource.title";
  }
  if (typeof d?.titleKey === "string") return d.titleKey;
  return "notif.document.title";
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

  const cancelledSince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

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

  const [
    cancelledAppointments,
    unreadMessages,
    onlineDoctors,
    activeQueue,
    subscription,
    userRow,
    unreadNotifications,
    chartLinkNotices,
    recentPrescriptions,
    recentExams,
    hasPsychLink,
    pharmacyOrderCount,
    nursingLinkCount,
    nutritionLinkCount,
    integrativeApptCount,
  ] = await Promise.all([
    db.appointment.findMany({
      where: {
        patientId: patient.id,
        status: "CANCELLED",
        OR: [
          { cancelledAt: { gte: cancelledSince } },
          { cancelledAt: null, scheduledAt: { gte: cancelledSince } },
        ],
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
    db.notification.findMany({
      where: { userId, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    getPendingChartLinkNotices(userId),
    db.prescription.findMany({
      where: { document: { patientId: patient.id } },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        professional: { select: { firstName: true, lastName: true } },
      },
    }),
    db.medicalDocument.findMany({
      where: { patientId: patient.id, type: "EXAM_REQUEST" },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        professional: { select: { firstName: true, lastName: true } },
      },
    }),
    db.appointment.count({
      where: {
        patientId: patient.id,
        psychoanalystId: { not: null },
        status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] },
      },
    }).then((n) => n > 0),
    db.pharmacyOrder.count({ where: { patientUserId: userId } }).catch(() => 0),
    db.patientRecord.count({
      where: {
        linkedUserId: userId,
        professional: { specialty: { in: ["Nurse", "Nurse Practitioner", "Midwife", "Obstetric Nurse"] } },
      },
    }).catch(() => 0),
    db.patientRecord.count({
      where: { linkedUserId: userId, professional: { specialty: "Nutrition" } },
    }).catch(() => 0),
    db.appointment.count({
      where: {
        patientId: patient.id,
        integrativeTherapistId: { not: null },
        status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] },
      },
    }).catch(() => 0),
  ]);

  await audit.viewRecord(userId, "PatientProfile", patient.id);

  const decrypted = decryptPatientFields(
    { firstName: patient.firstName, lastName: patient.lastName },
    ["firstName", "lastName"]
  );

  const allergies = patient.allergies ? safeDecrypt(patient.allergies) : "";
  const emergencyContactName = patient.emergencyContactName
    ? safeDecrypt(patient.emergencyContactName)
    : "";
  const emergencyContactPhone = patient.emergencyContactPhone
    ? safeDecrypt(patient.emergencyContactPhone)
    : "";

  const patientRegistration = computePatientRegistrationStatus({
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth,
    addressLine1: patient.addressLine1,
    city: patient.city,
  });
  const profileIncomplete = !patientRegistration.complete;
  const historyIncomplete = !isPatientHistoryFilled(patient.notes);

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

  const sharedDocNotifs = unreadNotifications
    .filter((n) =>
      isDocumentNotification(n.data, n.type)
      || isExamNotification(n.data)
      || isPrescriptionNotification(n.data)
    )
    .slice(0, 3);

  const unreadRxCount = unreadNotifications.filter((n) => isPrescriptionNotification(n.data)).length;
  const unreadExamCount = unreadNotifications.filter((n) => isExamNotification(n.data)).length;
  const unreadDocCount = unreadNotifications.filter((n) =>
    isDocumentNotification(n.data, n.type) && !isPrescriptionNotification(n.data) && !isExamNotification(n.data)
  ).length;
  const unreadResourceCount = unreadNotifications.filter((n) => {
    const d = parseNotifData(n.data);
    return n.type === "DOCUMENT_SHARED" || d?.titleKey === "notif.newResource.title";
  }).length;

  const queueActive = !!activeQueue;
  const queueCalled = activeQueue?.status === "CALLED";
  const queueInProgress = activeQueue?.status === "IN_PROGRESS";
  const queueWaiting = activeQueue?.status === "WAITING";

  const showQueueCompact = queueActive;
  const showSoonConsult = !showQueueCompact && !!soonConsultProps;
  // When in queue, demote the urgent CTA — second slot becomes Find instead of duplicating urgent.
  const showUrgentPrimaryCta = !queueActive;

  const pendingClinicalCount = unreadRxCount + unreadExamCount + unreadDocCount + unreadResourceCount;
  const attentionCount =
    (unreadMessages > 0 ? 1 : 0)
    + (unreadRxCount > 0 ? 1 : 0)
    + (unreadExamCount > 0 ? 1 : 0)
    + (unreadDocCount > 0 ? 1 : 0)
    + (unreadResourceCount > 0 ? 1 : 0)
    + (profileIncomplete ? 1 : 0)
    + (historyIncomplete ? 1 : 0)
    + (hasPsychLink ? 1 : 0);

  const careChips: {
    href: string;
    labelKey: string;
    icon: "pharmacy" | "orders" | "import" | "nursing" | "nutrition" | "integrative";
  }[] = [];
  if (recentPrescriptions.length > 0 || pharmacyOrderCount > 0) {
    careChips.push({ href: "/patient/pharmacy", labelKey: "nav.pharmacy", icon: "pharmacy" });
    careChips.push({ href: "/patient/pharmacy/orders", labelKey: "nav.pharmacyOrders", icon: "orders" });
  }
  if (pharmacyOrderCount > 0 || recentPrescriptions.length > 0) {
    careChips.push({ href: "/patient/importacao", labelKey: "nav.importOrders", icon: "import" });
  }
  if (nursingLinkCount > 0) {
    careChips.push({ href: "/patient/nursing", labelKey: "nav.nursing", icon: "nursing" });
  }
  if (nutritionLinkCount > 0) {
    careChips.push({ href: "/patient/nutrition", labelKey: "nav.nutrition", icon: "nutrition" });
  }
  if (integrativeApptCount > 0) {
    careChips.push({ href: "/patient/integrative-care", labelKey: "nav.integrativeCare", icon: "integrative" });
  }

  const clinicalItems: {
    id: string;
    kind: "rx" | "exam";
    title: string;
    subtitle: string;
    href: string;
    at: Date;
  }[] = [
    ...recentPrescriptions.map((p) => ({
      id: `rx-${p.id}`,
      kind: "rx" as const,
      title: t("pdash.clinical.rx"),
      subtitle: p.professional
        ? `Dr. ${p.professional.firstName} ${p.professional.lastName}`.trim()
        : "",
      href: "/patient/prescriptions",
      at: p.createdAt,
    })),
    ...recentExams.map((e) => ({
      id: `ex-${e.id}`,
      kind: "exam" as const,
      title: safeDecrypt(e.title) || t("pdash.clinical.exam"),
      subtitle: e.professional
        ? `Dr. ${e.professional.firstName} ${e.professional.lastName}`.trim()
        : t("pdash.clinical.exam"),
      href: "/patient/exam-requests",
      at: e.createdAt,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 4);

  const showCancelled = patient.appointments.length === 0
    ? cancelledAppointments
    : cancelledAppointments.slice(0, 2);

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* 1 — Greeting */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
          {t(greetingKey())}, {decrypted.firstName}
        </h1>
      </div>

      {/* 2 — Shared document / clinical notification banners */}
      {sharedDocNotifs.length > 0 && (
        <div className="space-y-3" role="region" aria-label={t("pdash.sharedDocs.region")}>
          {sharedDocNotifs.map((n) => {
            const href = sharedDocHref(n.data, n.type);
            const titleKey = sharedDocTitleKey(n.data, n.type);
            return (
              <Link
                key={n.id}
                href={href}
                className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4 hover:bg-indigo-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <FileText size={20} className="text-indigo-600 shrink-0 mt-0.5" aria-hidden />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-indigo-900">{t(titleKey)}</p>
                  <p className="text-xs text-indigo-700 mt-0.5 line-clamp-2">{n.body}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-900">
                    {t("pdash.sharedDocs.cta")} <ChevronRight size={13} aria-hidden />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* 3 — Compact active states (queue / soon consult) — not the old urgent hero */}
      {showQueueCompact && (
        <Link
          href="/urgent"
          className="block rounded-2xl border border-brand-200 bg-brand-50 shadow-sm overflow-hidden transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <div className="p-4 sm:p-5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
              <Radio size={22} className="text-brand-600" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-brand-900">{t("nav.urgent")}</p>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                  {queueInProgress
                    ? t("pdash.urgent.status.inProgress")
                    : queueCalled
                      ? t("pdash.urgent.status.called")
                      : t("pdash.urgent.status.waiting")}
                </span>
              </div>
              <p className="text-xs sm:text-sm mt-0.5 text-brand-700">
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
            <span className="flex items-center gap-1 text-xs sm:text-sm font-semibold shrink-0 text-brand-700">
              {t("pdash.activeQueue.action")}
              <ChevronRight size={16} aria-hidden />
            </span>
          </div>
        </Link>
      )}

      {showSoonConsult && soonConsultProps && (
        <PatientUpcomingConsultBanner appointment={soonConsultProps} />
      )}

      {/* 4 — Two primary CTAs (both brand blue) */}
      <div className="grid gap-4 sm:grid-cols-2">
        {showUrgentPrimaryCta ? (
          <Link
            href="/urgent"
            className="flex items-center gap-4 rounded-2xl border border-brand-200 bg-brand-500 text-white shadow-sm p-5 sm:p-6 transition hover:bg-brand-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Radio size={24} aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base">{t("nav.urgent")}</p>
              <p className="text-sm text-white/80 mt-0.5">
                {onlineDoctors > 0
                  ? t("pdash.urgent.desc.available")
                  : t("pdash.urgent.desc.offline")}
              </p>
              {onlineDoctors > 0 && (
                <p className="text-xs text-white/90 mt-1 font-medium">
                  {onlineDoctors}{" "}
                  {onlineDoctors === 1 ? t("pdash.urgent.doctorOnline") : t("pdash.urgent.doctorsOnline")}
                </p>
              )}
            </div>
            <ChevronRight size={18} className="shrink-0 opacity-80" aria-hidden />
          </Link>
        ) : (
          <Link
            href="/patient/find"
            className="flex items-center gap-4 rounded-2xl border border-brand-200 bg-brand-500 text-white shadow-sm p-5 sm:p-6 transition hover:bg-brand-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <MapPin size={24} aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base">{t("pdash.find.title")}</p>
              <p className="text-sm text-white/80 mt-0.5">{t("pdash.find.desc")}</p>
            </div>
            <ChevronRight size={18} className="shrink-0 opacity-80" aria-hidden />
          </Link>
        )}

        <div className="flex flex-col rounded-2xl border border-brand-200 bg-brand-500 text-white shadow-sm overflow-hidden transition hover:shadow-md">
          <Link
            href="/patient/appointments"
            className="flex items-center gap-4 p-5 sm:p-6 transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Calendar size={24} aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base">{t("pdash.quick.book")}</p>
              <p className="text-sm text-white/80 mt-0.5">{t("pdash.upcoming.action")}</p>
            </div>
            <ChevronRight size={18} className="shrink-0 opacity-80" aria-hidden />
          </Link>
          <Link
            href="/patient/find"
            className="px-5 sm:px-6 pb-4 pt-0 text-xs text-white/90 inline-flex items-center gap-1 underline underline-offset-2 hover:text-white"
          >
            <MapPin size={12} aria-hidden />
            {t("pdash.schedule.mapLink")}
          </Link>
        </div>
      </div>

      {/* 5 — Send documents / terms banner */}
      <PatientSendToProfessionalsBanner t={t} />

      {/* 6 — Chart-link + emission safety */}
      {chartLinkNotices.length > 0 && (
        <ChartLinkNoticeBanner
          notices={chartLinkNotices.map((n) => ({
            id: n.id,
            doctorName: n.doctorName,
            body: n.body,
          }))}
        />
      )}
      <PatientEmissionAlertsPanel />

      {/* 7 — Mini stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          href="/patient/appointments"
          icon={<Calendar className="text-brand-500" size={18} />}
          label={t("pdash.stat.upcoming")}
          value={patient.appointments.length}
          bg="bg-brand-50"
        />
        <StatCard
          href="/patient/messages"
          icon={<MessageSquare className="text-sky-500" size={18} />}
          label={t("pdash.stat.messages")}
          value={unreadMessages}
          bg="bg-sky-50"
        />
        <StatCard
          href="/patient/documents"
          icon={<Stethoscope className="text-indigo-500" size={18} />}
          label={t("pdash.stat.pendingClinical")}
          value={pendingClinicalCount}
          bg="bg-indigo-50"
        />
        <StatCard
          href="/patient/medications"
          icon={<Pill className="text-emerald-600" size={18} />}
          label={t("pdash.stat.medications")}
          value={patient.medications.length}
          bg="bg-emerald-50"
        />
      </div>

      {/* 8 — Multi-item attention */}
      <Section
        title={t("pdash.attention.title")}
        icon={<Inbox size={16} />}
        viewAllLabel={t("common.viewAll")}
      >
        <div className="space-y-3">
          <AttentionRow
            href="/patient/messages"
            icon={<MessageSquare size={18} className={unreadMessages > 0 ? "text-sky-600" : "text-slate-400"} />}
            label={t("pdash.attention.messages")}
            count={unreadMessages}
            emptyLabel={t("pdash.attention.none")}
            pendingLabel={t("pdash.attention.pending").replace("{{count}}", String(unreadMessages))}
          />
          <AttentionRow
            href="/patient/prescriptions"
            icon={<Stethoscope size={18} className={unreadRxCount > 0 ? "text-indigo-600" : "text-slate-400"} />}
            label={t("pdash.attention.prescriptions")}
            count={unreadRxCount}
            emptyLabel={t("pdash.attention.none")}
            pendingLabel={t("pdash.attention.pending").replace("{{count}}", String(unreadRxCount))}
          />
          <AttentionRow
            href="/patient/exam-requests"
            icon={<FlaskConical size={18} className={unreadExamCount > 0 ? "text-amber-600" : "text-slate-400"} />}
            label={t("pdash.attention.exams")}
            count={unreadExamCount}
            emptyLabel={t("pdash.attention.none")}
            pendingLabel={t("pdash.attention.pending").replace("{{count}}", String(unreadExamCount))}
          />
          <AttentionRow
            href="/patient/documents"
            icon={<ClipboardList size={18} className={unreadDocCount > 0 ? "text-indigo-600" : "text-slate-400"} />}
            label={t("pdash.attention.documents")}
            count={unreadDocCount}
            emptyLabel={t("pdash.attention.none")}
            pendingLabel={t("pdash.attention.pending").replace("{{count}}", String(unreadDocCount))}
          />
          <AttentionRow
            href="/patient/resources"
            icon={<FileText size={18} className={unreadResourceCount > 0 ? "text-brand-600" : "text-slate-400"} />}
            label={t("pdash.attention.resources")}
            count={unreadResourceCount}
            emptyLabel={t("pdash.attention.none")}
            pendingLabel={t("pdash.attention.pending").replace("{{count}}", String(unreadResourceCount))}
          />
          {hasPsychLink && (
            <AttentionRow
              href="/patient/assinar-termos"
              icon={<ScrollText size={18} className="text-violet-600" />}
              label={t("pdash.attention.terms")}
              detail={t("pdash.attention.termsHint")}
            />
          )}
          {profileIncomplete && (
            <div className="pt-1">
              <PatientIncompleteRegistrationCard
                checklist={patientRegistration.checklist}
                missing={patientRegistration.missing}
              />
            </div>
          )}
          {historyIncomplete && (
            <AttentionRow
              href="/patient/history"
              icon={<Heart size={18} className="text-rose-500" />}
              label={t("pdash.historyPrompt.title")}
              detail={t("pdash.historyPrompt.text")}
            />
          )}
          {attentionCount === 0 && !profileIncomplete && !historyIncomplete && (
            <p className="text-sm text-slate-500 py-2">{t("pdash.attention.none")}</p>
          )}
        </div>
      </Section>

      {!hasActiveClub && (
        <ClubDoctorBanner
          subscribed={hasActiveClub}
          defaultRegion={userMeta?.region || session.user.region}
        />
      )}

      {/* 9 — Quick actions */}
      <PatientQuickAccess
        t={t}
        badges={{
          messages: unreadMessages,
          prescriptions: unreadRxCount,
          exams: unreadExamCount,
          documents: unreadDocCount,
          resources: unreadResourceCount,
          terms: hasPsychLink ? 1 : undefined,
        }}
      />

      {/* 10 — Health snapshot */}
      <PatientHealthSnapshot
        t={t}
        allergies={allergies || null}
        emergencyContactName={emergencyContactName || null}
        emergencyContactPhone={emergencyContactPhone || null}
      />

      {/* 11 — Contextual care tools */}
      <PatientCareToolsChips t={t} chips={careChips} />

      {/* 12 — Volunteer soft entry */}
      <ScheduledVolunteerBanner lang={lang} />

      <PatientChecklistWrapper />
      <PatientTourWrapper lang={lang} />

      {/* 13 — Appointments + meds + clinical recent */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Section
          title={t("pdash.upcoming.title")}
          href="/patient/appointments"
          icon={<Calendar size={16} />}
          viewAllLabel={t("common.viewAll")}
        >
          {patient.appointments.length === 0 && showCancelled.length === 0 ? (
            <EmptyState
              icon={<Calendar size={28} className="text-slate-300" />}
              message={t("pdash.upcoming.empty")}
              action={t("pdash.upcoming.action")}
              href="/patient/appointments"
              secondary={[
                { href: "/patient/find", label: t("pdash.upcoming.emptyHint.find") },
                { href: "/urgent", label: t("pdash.upcoming.emptyHint.urgent") },
                { href: "/patient/volunteer-appointments", label: t("pdash.upcoming.emptyHint.volunteer") },
              ]}
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
                        <Clock size={10} aria-hidden />
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
                        <Video size={12} aria-hidden /> <span className="inline">{t("pdash.join")}</span>
                      </a>
                    )}
                  </div>
                </div>
                );
              })}
              {showCancelled.length > 0 && (
                <>
                  {patient.appointments.length > 0 && (
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide pt-1">
                      {t("pdash.cancelled.title")}
                    </p>
                  )}
                  {showCancelled.map((apt) => {
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
                              <Clock size={10} aria-hidden />
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
                </>
              )}
            </div>
          )}
        </Section>

        <div className="space-y-6">
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
                secondary={[
                  { href: "/patient/prescriptions", label: t("pdash.meds.emptyHint.rx") },
                  { href: "/patient/pharmacy", label: t("pdash.meds.emptyHint.pharmacy") },
                ]}
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
                        <Pill size={18} className="text-emerald-600" aria-hidden />
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

          <Section
            title={t("pdash.clinical.title")}
            href="/patient/prescriptions"
            icon={<Stethoscope size={16} />}
            viewAllLabel={t("common.viewAll")}
          >
            {clinicalItems.length === 0 ? (
              <EmptyState
                icon={<Stethoscope size={28} className="text-slate-300" />}
                message={t("pdash.clinical.empty")}
                action={t("pdash.docs.action")}
                href="/patient/documents"
              />
            ) : (
              <div className="space-y-3">
                {clinicalItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      item.kind === "rx" ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-700"
                    }`}>
                      {item.kind === "rx" ? <Stethoscope size={16} aria-hidden /> : <FlaskConical size={16} aria-hidden />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {item.subtitle}
                        {item.subtitle ? " · " : ""}
                        {formatShortDate(item.at, userTz, locale)}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 shrink-0" aria-hidden />
                  </Link>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      <PatientPostConsultReview />

      {/* 14 — Privacy footer with action */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-blue-700">
            <strong>{t("pdash.privacy.bold")}</strong> {t("pdash.privacy.text")}
          </p>
          <Link
            href="/patient/providers"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-800 hover:text-blue-950 underline underline-offset-2"
          >
            {t("pdash.privacy.action")}
            <ChevronRight size={12} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg, href }: {
  icon: React.ReactNode; label: string; value: number; bg: string; href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 hover:shadow-md transition block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    >
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-2`}>{icon}</div>
      <p className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug">{label}</p>
    </Link>
  );
}

function AttentionRow({
  href, icon, label, count, emptyLabel, pendingLabel, detail,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  emptyLabel?: string;
  pendingLabel?: string;
  detail?: string;
}) {
  const pending = typeof count === "number" ? count > 0 : Boolean(detail);
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    >
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className={`text-xs mt-0.5 ${pending ? "text-amber-700 font-medium" : "text-slate-400"}`}>
          {detail ?? (pending ? pendingLabel : emptyLabel)}
        </p>
      </div>
      <ChevronRight size={14} className="text-slate-300 shrink-0" aria-hidden />
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
          <Link href={href} className="text-xs text-brand-500 hover:text-brand-400 font-medium flex items-center gap-1">
            {viewAllLabel} <ChevronRight size={14} aria-hidden />
          </Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyState({ icon, message, action, href, secondary }: {
  icon: React.ReactNode;
  message: string;
  action: string;
  href: string;
  secondary?: { href: string; label: string }[];
}) {
  return (
    <div className="text-center py-6">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-sm text-slate-500 mb-3">{message}</p>
      <Link href={href} className="text-xs text-brand-500 hover:underline font-medium">{action} →</Link>
      {secondary && secondary.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {secondary.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="text-[11px] font-medium text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50"
            >
              {s.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
