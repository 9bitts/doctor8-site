"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart, Loader2, Phone, MessageCircle, ChevronRight, AlertCircle, Clock, User, BookOpen,
  Stethoscope, ArrowRightLeft, Calendar,
} from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { ANGEL_LOGIN } from "@/lib/auth-portals";
import { buildAuthHref } from "@/components/auth/login-shared";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import AngelRiskBadge from "@/components/humanitarian/AngelRiskBadge";
import HumanitarianOfflineBanner from "@/components/humanitarian/HumanitarianOfflineBanner";
import {
  cacheAngelDashboard,
  loadCachedAngelDashboard,
  type AngelDashboardCachePayload,
} from "@/lib/humanitarian/offline-draft";
import { buildWhatsAppUrl } from "@/lib/humanitarian/angel-utils";
import type { AngelRiskSummary } from "@/lib/humanitarian/angel-risk-summary";
import LicenseDocumentsUpload from "@/components/LicenseDocumentsUpload";
import AngelOnboardingTimeline from "@/components/humanitarian/AngelOnboardingTimeline";
import AngelWellbeingPrompt from "@/components/humanitarian/AngelWellbeingPrompt";
import type { AngelOnboardingStep } from "@/lib/humanitarian/angel-onboarding";
import HumanitarianFlowStepper from "@/components/humanitarian/HumanitarianFlowStepper";
import { isHumanitarianPhoneGateEnabled } from "@/lib/humanitarian/feature-flags";
import type { HumanitarianFlowStep } from "@/lib/humanitarian/patient-flow";
import type {
  AngelAppointmentRow,
  AngelConsultationRow,
  AngelPatientFlow,
  AngelReferralRow,
} from "@/lib/humanitarian/angel-patient-journey";

interface MyPatientRow {
  patientUserId: string;
  patientName: string;
  phone: string;
  priority: string;
  poolLabel: string;
  consultEndedAt: string | null;
  riskSummary: AngelRiskSummary;
  lastFollowUp: { contactedAt: string; outcome: string } | null;
  queueEntryId: string;
  flow: AngelPatientFlow;
}

interface AvailableRow {
  patientUserId: string;
  firstName: string;
  priority: string;
  poolLabel: string;
  consultEndedAt: string | null;
  riskSummary: AngelRiskSummary;
  flow: AngelPatientFlow;
}

type PendencyRow = {
  kind: "OVERDUE_REMINDER" | "NO_FIRST_CONTACT" | "HIGH_RISK_STALE";
  patientUserId: string;
  patientName: string;
  priority: string;
  poolLabel: string;
  dueAt: string | null;
  riskSummary: AngelRiskSummary;
  queueEntryId: string;
};

type FollowUpRow = {
  id: string;
  contactedAt: string;
  outcome: string;
  channel: string;
  notes?: string | null;
  angelName: string;
};

function tParams(
  t: (key: string) => string,
  key: string,
  params?: Record<string, string | number>,
): string {
  let text = t(key);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
    }
  }
  return text;
}

function firstNameFromFull(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function formatShortDateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function flowStepLabel(t: (key: string) => string, step: HumanitarianFlowStep): string {
  if (step === "waiting") return t("angel.flow.waiting");
  if (step === "consult") return t("angel.flow.consult");
  return t(`hum.flow.${step}`);
}

function AngelFlowBadges({
  flow,
  t,
  locale,
}: {
  flow: AngelPatientFlow;
  t: (key: string) => string;
  locale: string;
}) {
  const badges: string[] = [];
  if (flow.consultationCount > 0) {
    badges.push(tParams(t, "angel.portal.badge.consultDone", { n: flow.consultationCount }));
  }
  if (flow.hasReferral) badges.push(t("angel.portal.badge.referred"));
  if (flow.hasUpcomingAppointment && flow.nextAppointmentAt) {
    badges.push(
      tParams(t, "angel.portal.badge.scheduled", {
        date: formatShortDateTime(flow.nextAppointmentAt, locale),
      }),
    );
  }
  if (flow.activeQueueStatus === "IN_PROGRESS") {
    badges.push(t("angel.portal.badge.inConsult"));
  } else if (flow.activeQueueStatus) {
    badges.push(t("angel.portal.badge.inQueue"));
  }
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {badges.map((label) => (
        <span
          key={label}
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function AngelPatientJourneyPanel({
  flow,
  consultations,
  referrals,
  appointments,
  t,
  lang,
  locale,
  sep,
}: {
  flow: AngelPatientFlow;
  consultations: AngelConsultationRow[];
  referrals: AngelReferralRow[];
  appointments: AngelAppointmentRow[];
  t: (key: string) => string;
  lang: "pt" | "en" | "es";
  locale: string;
  sep: string;
}) {
  const phoneGate = isHumanitarianPhoneGateEnabled();
  const upcoming = appointments.filter(
    (a) => ["CONFIRMED", "PENDING"].includes(a.status) && new Date(a.scheduledAt) >= new Date(),
  );
  const past = appointments.filter(
    (a) => !upcoming.some((u) => u.id === a.id),
  );

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">{t("angel.portal.journeyTitle")}</h3>
        <HumanitarianFlowStepper
          lang={lang}
          current={flow.currentStep}
          phoneGateEnabled={phoneGate}
        />
        <p className="text-xs text-slate-500 mt-3">
          {t("angel.portal.listSeparator")} {flowStepLabel(t, flow.currentStep)}
          {flow.activeQueueStatus
            ? ` ${sep} ${t(`angel.queueStatus.${flow.activeQueueStatus}`)}`
            : ""}
        </p>
      </div>

      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-rose-500" />
          {t("angel.portal.consultationsTitle")}
        </h3>
        {consultations.length === 0 ? (
          <p className="text-xs text-slate-400">{t("angel.portal.noConsultations")}</p>
        ) : (
          <div className="space-y-2">
            {consultations.map((c) => (
              <div key={c.id} className="text-xs border-l-2 border-emerald-300 pl-3 py-1">
                <p className="text-slate-800 font-medium">
                  {c.poolLabel} {sep} {t(`angel.queueStatus.${c.status}`)}
                </p>
                {c.professionalName && (
                  <p className="text-slate-600 mt-0.5">
                    {tParams(t, "angel.portal.consultWith", { name: c.professionalName })}
                  </p>
                )}
                <p className="text-slate-400 mt-0.5">
                  {c.endedAt
                    ? formatShortDateTime(c.endedAt, locale)
                    : c.startedAt
                      ? formatShortDateTime(c.startedAt, locale)
                      : formatShortDateTime(c.enteredAt, locale)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-rose-500" />
          {t("angel.portal.referralsTitle")}
        </h3>
        {referrals.length === 0 ? (
          <p className="text-xs text-slate-400">{t("angel.portal.noReferrals")}</p>
        ) : (
          <div className="space-y-2">
            {referrals.map((r) => (
              <div key={r.id} className="text-xs border-l-2 border-blue-300 pl-3 py-1">
                <p className="text-slate-800 font-medium">{r.specialty}</p>
                {r.fromDoctor && (
                  <p className="text-slate-600 mt-0.5">
                    {tParams(t, "angel.portal.referralFrom", { name: r.fromDoctor })}
                    {r.targetDoctor
                      ? ` ${tParams(t, "angel.portal.referralTo", { name: r.targetDoctor })}`
                      : ""}
                  </p>
                )}
                <p className="text-slate-400 mt-0.5">{formatShortDateTime(r.createdAt, locale)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-rose-500" />
          {t("angel.portal.appointmentsTitle")}
        </h3>
        {appointments.length === 0 ? (
          <p className="text-xs text-slate-400">{t("angel.portal.noAppointments")}</p>
        ) : (
          <div className="space-y-2">
            {[...upcoming, ...past].map((a) => (
              <div key={a.id} className="text-xs border-l-2 border-violet-300 pl-3 py-1">
                <p className="text-slate-800 font-medium">
                  {a.providerName}
                  {a.specialty ? ` (${a.specialty})` : ""}
                </p>
                <p className="text-slate-600 mt-0.5">
                  {formatShortDateTime(a.scheduledAt, locale)} {sep}{" "}
                  {t(`angel.apptStatus.${a.status}`)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AngelFollowUpClient() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("LOADING");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<AngelOnboardingStep>("REGISTERED");
  const [emailVerified, setEmailVerified] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [pendingCourseIds, setPendingCourseIds] = useState<string[]>([]);
  const [myPatients, setMyPatients] = useState<MyPatientRow[]>([]);
  const [available, setAvailable] = useState<AvailableRow[]>([]);
  const [pendencies, setPendencies] = useState<PendencyRow[]>([]);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [maxPatients, setMaxPatients] = useState(10);
  const [selected, setSelected] = useState<MyPatientRow | null>(null);
  const [detail, setDetail] = useState<{
    followUps: FollowUpRow[];
    riskSummary: AngelRiskSummary;
    flow: AngelPatientFlow;
    consultations: AngelConsultationRow[];
    referrals: AngelReferralRow[];
    appointments: AngelAppointmentRow[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [channel, setChannel] = useState<"WHATSAPP" | "PHONE" | "SMS" | "OTHER">("WHATSAPP");
  const [outcome, setOutcome] = useState<
    "REACHED_OK" | "NEEDS_HELP" | "NO_ANSWER" | "WRONG_NUMBER" | "ESCALATED" | "OTHER"
  >("REACHED_OK");
  const [notes, setNotes] = useState("");
  const [remindInDays, setRemindInDays] = useState<"" | "3" | "7" | "15" | "30">("");
  const [minutesSpent, setMinutesSpent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");

  const cachePayload = useCallback(
    (
      data: {
        status: string;
        myPatients: MyPatientRow[];
        available: AvailableRow[];
        assignmentCount: number;
        maxPatients: number;
      },
    ): AngelDashboardCachePayload => ({
      status: data.status,
      assignmentCount: data.assignmentCount,
      maxPatients: data.maxPatients,
      myPatients: data.myPatients.map((p) => ({
        firstName: firstNameFromFull(p.patientName),
        priority: p.priority,
        poolLabel: p.poolLabel,
        consultEndedAt: p.consultEndedAt,
      })),
      availableCount: data.available.length,
    }),
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/humanitarian/angel?campaignSlug=${VENEZUELA_CAMPAIGN_SLUG}&lang=${lang}`,
      );
      if (res.status === 401) {
        router.push(buildAuthHref(ANGEL_LOGIN, { callbackUrl: "/admin/angel" }));
        return;
      }
      const data = await res.json();
      setStatus(data.status || "UNKNOWN");
      setRejectionReason(data?.profile?.rejectionReason ?? null);
      setOnboardingStep(data.onboardingStep || "REGISTERED");
      setEmailVerified(data.emailVerified === true);
      setPendingCourseIds(data.pendingCourseIds || []);
      setMyPatients(data.myPatients || []);
      setAvailable(data.available || []);
      setPendencies(data.pendencies || []);
      setAssignmentCount(data.assignmentCount ?? 0);
      setMaxPatients(data.maxPatients ?? 10);
      if (userId) {
        cacheAngelDashboard(userId, cachePayload(data));
      }
    } catch {
      const cached = userId ? loadCachedAngelDashboard(userId) : null;
      if (cached) {
        setStatus(cached.status);
        setAssignmentCount(cached.assignmentCount);
        setMaxPatients(cached.maxPatients);
        setMyPatients([]);
        setAvailable([]);
      } else {
        setError(t("angel.portal.loadError"));
      }
    }
    setLoading(false);
  }, [lang, router, userId, cachePayload, t]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        if (s?.user?.id) setUserId(s.user.id);
        if (s?.user?.email) setUserEmail(s.user.email);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function fetchDetail(patientUserId: string) {
    const res = await fetch(
      `/api/humanitarian/angel/patients/${patientUserId}?campaignSlug=${VENEZUELA_CAMPAIGN_SLUG}&lang=${lang}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.patient as {
      followUps: FollowUpRow[];
      riskSummary: AngelRiskSummary;
      flow: AngelPatientFlow;
      consultations: AngelConsultationRow[];
      referrals: AngelReferralRow[];
      appointments: AngelAppointmentRow[];
    };
  }

  async function openPatient(row: MyPatientRow) {
    setSelected(row);
    setDetail(null);
    const d = await fetchDetail(row.patientUserId);
    setDetail(d);
  }

  async function claimPatient(patientUserId: string) {
    setClaimingId(patientUserId);
    setError(null);
    try {
      const res = await fetch(
        `/api/humanitarian/angel/patients/${patientUserId}/claim?campaignSlug=${VENEZUELA_CAMPAIGN_SLUG}`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.errorCode === "LIMIT_REACHED") {
          setError(tParams(t, "angel.portal.limitReached", { max: maxPatients }));
        } else if (data.errorCode === "ALREADY_ASSIGNED") {
          setError(t("angel.portal.alreadyAssigned"));
        } else if (data.errorCode === "TRAINING_REQUIRED") {
          const n = Array.isArray(data.requiredCourseIds) ? data.requiredCourseIds.length : 0;
          setError(tParams(t, "angel.portal.trainingRequired", { n }));
        } else if (data.errorCode === "PAUSED") {
          setError(t("angel.portal.pausedClaim"));
        } else {
          setError(t("angel.portal.claimError"));
        }
        return;
      }
      await load();
    } catch {
      setError(t("angel.portal.claimError"));
    }
    setClaimingId(null);
  }

  async function releasePatient(patientUserId: string) {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/humanitarian/angel/patients/${patientUserId}/release?campaignSlug=${VENEZUELA_CAMPAIGN_SLUG}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("release failed");
      setSelected(null);
      setDetail(null);
      await load();
    } catch {
      setError(t("angel.portal.saveError"));
    }
    setSaving(false);
  }

  async function openPatientFromPendency(row: PendencyRow) {
    const match = myPatients.find((p) => p.patientUserId === row.patientUserId);
    if (match) {
      await openPatient(match);
      return;
    }
    setError(t("angel.portal.pendencyOpenError"));
  }

  async function saveFollowUp() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/humanitarian/angel/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientUserId: selected.patientUserId,
          queueEntryId: selected.queueEntryId,
          channel,
          outcome,
          notes: notes || undefined,
          escalated: outcome === "ESCALATED",
          ...(remindInDays
            ? { remindInDays: Number(remindInDays) as 3 | 7 | 15 | 30 }
            : {}),
          ...(minutesSpent.trim()
            ? { minutesSpent: Number(minutesSpent) }
            : {}),
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setNotes("");
      setRemindInDays("");
      setSelected(null);
      setDetail(null);
      await load();
    } catch {
      setError(t("angel.portal.saveError"));
    }
    setSaving(false);
  }

  const waMessage = t("angel.portal.waTemplate");
  const sep = t("angel.portal.listSeparator");

  if (loading && status === "LOADING") {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
      </div>
    );
  }

  if (status === "PENDING" || status === "EMAIL_UNVERIFIED") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-10">
        <AngelOnboardingTimeline
          currentStep={onboardingStep}
          email={userEmail}
          emailVerified={emailVerified}
          pendingCourseIds={pendingCourseIds}
          t={t}
        />
        {status === "EMAIL_UNVERIFIED" && (
          <div className="max-w-lg mx-auto text-center py-8 bg-white border border-slate-200 rounded-2xl p-6">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              {t("angel.portal.verifyEmail")}
            </p>
          </div>
        )}
        {status === "PENDING" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="text-center max-w-lg mx-auto">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                {t("angel.portal.pendingTitle")}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                {t("angel.portal.pendingDesc")}
              </p>
            </div>
            <p className="text-sm text-slate-500">{t("angel.portal.pendingCertificate")}</p>
            <LicenseDocumentsUpload />
          </div>
        )}
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-10">
        <AngelOnboardingTimeline
          currentStep={onboardingStep}
          email={userEmail}
          emailVerified={emailVerified}
          pendingCourseIds={pendingCourseIds}
          t={t}
        />
        <div className="max-w-lg mx-auto text-center py-16 px-4 bg-white border border-slate-200 rounded-2xl">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">{t("angel.portal.rejectedTitle")}</h1>
        <p className="text-slate-500 text-sm">{t("angel.portal.rejectedDesc")}</p>
        {rejectionReason && (
          <div className="mt-5 text-left bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-700 mb-1">
              {t("angel.portal.rejectedReasonTitle")}
            </p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{rejectionReason}</p>
          </div>
        )}
        </div>
      </div>
    );
  }

  if (status === "NOT_ENROLLED") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-10">
        <AngelOnboardingTimeline
          currentStep={onboardingStep}
          email={userEmail}
          emailVerified={emailVerified}
          pendingCourseIds={pendingCourseIds}
          t={t}
        />
        <div className="max-w-lg mx-auto text-center py-16 px-4 bg-white border border-slate-200 rounded-2xl">
        <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">{t("angel.portal.notEnrolledTitle")}</h1>
        <p className="text-slate-500 text-sm leading-relaxed">{t("angel.portal.notEnrolledDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <HumanitarianOfflineBanner lang={lang} />

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
          <Heart className="w-6 h-6 text-rose-500" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-rose-600 font-semibold">
            {t("angel.portal.eyebrow")}
          </p>
          <h1 className="text-xl font-bold text-slate-900">{t("angel.portal.title")}</h1>
          <p className="text-slate-500 text-sm">{t("angel.portal.subtitle")}</p>
        </div>
        <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-full">
          {tParams(t, "angel.portal.assignmentCount", { current: assignmentCount, max: maxPatients })}
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <Link
          href="/admin/angel/missoes"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-800"
        >
          <Calendar className="w-4 h-4" />
          {t("angel.nav.missions")}
        </Link>
        <Link
          href="/admin/angel/guide"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-800"
        >
          <BookOpen className="w-4 h-4" />
          {t("angel.guide.link")}
        </Link>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!selected ? (
        <div className="space-y-8">
          {pendencies.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-slate-900">{t("angel.portal.pendencies")}</h2>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  {pendencies.length}
                </span>
              </div>
              <div className="space-y-2">
                {pendencies.map((p) => (
                  <button
                    key={`${p.kind}-${p.patientUserId}`}
                    type="button"
                    onClick={() => openPatientFromPendency(p)}
                    className="w-full text-left p-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100/80 transition"
                  >
                    <p className="text-sm font-semibold text-slate-900">{p.patientName}</p>
                    <p className="text-xs text-amber-800 mt-0.5">
                      {t(`angel.pendency.${p.kind}`)} {sep} {t(`angel.priority.${p.priority}`)}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-sm font-semibold text-slate-900 mb-3">{t("angel.portal.myPatients")}</h2>
            {myPatients.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm bg-white border border-slate-200 rounded-2xl">
                {t("angel.portal.emptyMy")}
              </p>
            ) : (
              <div className="space-y-3">
                {myPatients.map((p) => (
                  <button
                    key={p.patientUserId}
                    onClick={() => openPatient(p)}
                    className="w-full text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/40 transition flex items-center gap-4 shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{p.patientName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.poolLabel} {sep} {t(`angel.priority.${p.priority}`)}
                        {p.lastFollowUp ? ` ${sep} ${t("angel.portal.contacted")}` : ""}
                      </p>
                      <div className="mt-2">
                        <AngelRiskBadge summary={p.riskSummary} lang={lang} compact />
                      </div>
                      <AngelFlowBadges flow={p.flow} t={t} locale={locale} />
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-900 mb-3">{t("angel.portal.available")}</h2>
            {available.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm bg-white border border-slate-200 rounded-2xl">
                {t("angel.portal.emptyAvailable")}
              </p>
            ) : (
              <div className="space-y-3">
                {available.map((p) => (
                  <div
                    key={p.patientUserId}
                    className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center gap-4 shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{p.firstName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.poolLabel} {sep} {t(`angel.priority.${p.priority}`)}
                      </p>
                      <div className="mt-2">
                        <AngelRiskBadge summary={p.riskSummary} lang={lang} compact />
                      </div>
                      <AngelFlowBadges flow={p.flow} t={t} locale={locale} />
                    </div>
                    <button
                      type="button"
                      disabled={claimingId === p.patientUserId || assignmentCount >= maxPatients}
                      onClick={() => claimPatient(p.patientUserId)}
                      className="shrink-0 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold disabled:opacity-40"
                    >
                      {claimingId === p.patientUserId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        t("angel.portal.claim")
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => { setSelected(null); setDetail(null); }}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            &larr; {t("reg.back")}
          </button>

          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">{selected.patientName}</h2>
                <p className="text-sm text-slate-500">
                  {selected.poolLabel} {sep} {t(`angel.priority.${selected.priority}`)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => releasePatient(selected.patientUserId)}
                disabled={saving}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {t("angel.portal.release")}
              </button>
            </div>

            <AngelRiskBadge summary={detail?.riskSummary ?? selected.riskSummary} lang={lang} />

            {selected.phone && (
              <div className="flex flex-wrap gap-2 mt-4">
                <a
                  href={`tel:${selected.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                >
                  <Phone className="w-4 h-4" /> {t("angel.portal.call")}
                </a>
                {buildWhatsAppUrl(selected.phone, waMessage) && (
                  <a
                    href={buildWhatsAppUrl(selected.phone, waMessage)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold"
                  >
                    <MessageCircle className="w-4 h-4" /> {t("angel.portal.whatsapp")}
                  </a>
                )}
              </div>
            )}
          </div>

          {(detail || selected.flow) && (
            <AngelPatientJourneyPanel
              flow={detail?.flow ?? selected.flow}
              consultations={detail?.consultations ?? []}
              referrals={detail?.referrals ?? []}
              appointments={detail?.appointments ?? []}
              t={t}
              lang={lang}
              locale={locale}
              sep={sep}
            />
          )}

          {detail && detail.followUps.length > 0 && (
            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">{t("angel.portal.history")}</h3>
              <div className="space-y-2">
                {detail.followUps.map((f) => (
                  <div key={f.id} className="text-xs text-slate-500 border-l-2 border-rose-300 pl-3 py-1">
                    <p className="text-slate-700">
                      {new Date(f.contactedAt).toLocaleString()} {sep}{" "}
                      {t(`angel.channel.${f.channel}`)} {sep}{" "}
                      {t(`angel.outcome.${f.outcome}`)}
                    </p>
                    {f.notes && <p className="mt-1">{f.notes}</p>}
                    <p className="text-slate-400 mt-0.5">{f.angelName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">{t("angel.portal.recordTitle")}</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(["WHATSAPP", "PHONE", "SMS", "OTHER"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={`py-2 rounded-lg text-xs font-medium border ${
                    channel === c
                      ? "border-rose-400 bg-rose-100 text-rose-900"
                      : "border-slate-200 text-slate-600 bg-white"
                  }`}
                >
                  {t(`angel.channel.${c}`)}
                </button>
              ))}
            </div>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as typeof outcome)}
              className="w-full mb-3 bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm"
            >
              {(
                ["REACHED_OK", "NEEDS_HELP", "NO_ANSWER", "WRONG_NUMBER", "ESCALATED", "OTHER"] as const
              ).map((o) => (
                <option key={o} value={o}>{t(`angel.outcome.${o}`)}</option>
              ))}
            </select>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder={t("angel.portal.notesPlaceholder")}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm resize-none mb-3"
            />
            <label className="block text-xs text-slate-500 mb-1">{t("angel.portal.minutesSpentLabel")}</label>
            <input
              type="number"
              min={1}
              max={480}
              value={minutesSpent}
              onChange={(e) => setMinutesSpent(e.target.value)}
              placeholder={t("angel.portal.minutesSpentPlaceholder")}
              className="w-full mb-3 bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm"
            />
            <label className="block text-xs text-slate-500 mb-1">{t("angel.portal.remindLabel")}</label>
            <select
              value={remindInDays}
              onChange={(e) => setRemindInDays(e.target.value as typeof remindInDays)}
              className="w-full mb-3 bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm"
            >
              <option value="">{t("angel.portal.remindNone")}</option>
              <option value="3">{tParams(t, "angel.portal.remindDays", { n: 3 })}</option>
              <option value="7">{tParams(t, "angel.portal.remindDays", { n: 7 })}</option>
              <option value="15">{tParams(t, "angel.portal.remindDays", { n: 15 })}</option>
              <option value="30">{tParams(t, "angel.portal.remindDays", { n: 30 })}</option>
            </select>
            <button
              onClick={saveFollowUp}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("angel.portal.save")}
            </button>
          </div>
        </div>
      )}
      <AngelWellbeingPrompt />
    </div>
  );
}
