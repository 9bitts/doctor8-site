"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Heart, Loader2, CheckCircle2, XCircle, Mail, AlertTriangle, Pause, Play,
} from "lucide-react";
import AdminViewPhoneButton from "@/components/admin/AdminViewPhoneButton";
import AdminViewLicenseDocsButton from "@/components/admin/AdminViewLicenseDocsButton";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";

interface AngelRow {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  profession: string | null;
  volunteerHelp: string | null;
  languages: string[];
  motivation: string | null;
  preferredCampaignSlug: string | null;
  approvalStatus: string;
  screeningStatus?: string;
  screeningReviewedAt?: string | null;
  trackEnrollments?: { track: string; status: string; approvedAt: string | null }[];
  licenseDocCount: number;
  enrollmentActive: boolean;
  createdAt: string;
}

interface EscalationRow {
  id: string;
  patientUserId: string;
  patientName: string;
  priority: string | null;
  triageFlagLabels: string[];
  angelName: string;
  contactedAt: string;
  campaignName: string;
}

interface OverviewAngel {
  userId: string;
  firstName: string;
  lastName: string;
  approvalStatus: string;
  enrollmentActive: boolean;
  activeAssignments: number;
  maxPatients: number;
  followUpsLast30Days: number;
  openEscalations: number;
  lastFollowUpAt: string | null;
}

interface UncoveredPatient {
  patientUserId: string;
  firstName: string;
  priority: string | null;
  poolLabel: string;
  consultEndedAt: string | null;
}

interface AssignmentRow {
  assignmentId: string;
  angelUserId: string;
  angelName: string;
  patientUserId: string;
  patientFirstName: string;
}

function tp(
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

export default function HumanitarianAngelsAdminPanel() {
  const { lang, t } = useI18n();
  const locale = localeOf(lang);
  const [angels, setAngels] = useState<AngelRow[]>([]);
  const [escalations, setEscalations] = useState<EscalationRow[]>([]);
  const [overviewAngels, setOverviewAngels] = useState<OverviewAngel[]>([]);
  const [uncovered, setUncovered] = useState<UncoveredPatient[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [angelsRes, escRes, overviewRes] = await Promise.all([
        fetch("/api/admin/humanitarian/angels"),
        fetch("/api/admin/humanitarian/angels/escalations"),
        fetch("/api/admin/humanitarian/angels/overview"),
      ]);
      const angelsData = await angelsRes.json();
      const escData = await escRes.json();
      const overviewData = await overviewRes.json();
      if (angelsRes.ok) setAngels(angelsData.angels || []);
      if (escRes.ok) setEscalations(escData.escalations || []);
      if (overviewRes.ok) {
        setOverviewAngels(overviewData.angels || []);
        setUncovered(overviewData.uncoveredPatients || []);
        setAssignments(overviewData.assignments || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(
    userId: string,
    action: "approve" | "reject" | "pause" | "reactivate",
  ) {
    setActing(userId);
    try {
      await fetch("/api/admin/humanitarian/angels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      await load();
    } catch { /* ignore */ }
    setActing(null);
  }

  async function actTrack(
    userId: string,
    track: string,
    action: "approveTrack" | "pauseTrack" | "revokeTrack",
  ) {
    const key = `${userId}:${track}:${action}`;
    setActing(key);
    try {
      await fetch("/api/admin/humanitarian/angels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, track }),
      });
      await load();
    } catch { /* ignore */ }
    setActing(null);
  }

  async function setScreening(
    userId: string,
    screeningStatus: "NOT_SUBMITTED" | "SUBMITTED" | "IN_REVIEW" | "VERIFIED" | "REJECTED",
  ) {
    const key = `${userId}:screening:${screeningStatus}`;
    setActing(key);
    try {
      await fetch("/api/admin/humanitarian/angels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "setScreening", screeningStatus }),
      });
      await load();
    } catch { /* ignore */ }
    setActing(null);
  }

  async function adminReleasePatient(angelUserId: string, patientUserId: string) {
    const key = `${angelUserId}:${patientUserId}`;
    setReleasing(key);
    try {
      await fetch(`/api/humanitarian/angel/patients/${patientUserId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ angelUserId }),
      });
      await load();
    } catch { /* ignore */ }
    setReleasing(null);
  }

  async function resolveEscalation(followUpId: string) {
    setResolvingId(followUpId);
    try {
      await fetch("/api/admin/humanitarian/angels/escalations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpId }),
      });
      await load();
    } catch { /* ignore */ }
    setResolvingId(null);
  }

  const pending = angels.filter((a) => a.approvalStatus === "PENDING");

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-slate-200 pt-8 space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">{t("admin.providers.angelActivityTitle")}</h2>
        {overviewAngels.length === 0 ? (
          <p className="text-sm text-slate-500">{t("admin.providers.emptyAngels")}</p>
        ) : (
          <div className="space-y-2">
            {overviewAngels.map((a) => (
              <div key={a.userId} className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-sm">
                <p className="font-semibold text-slate-900">
                  {a.firstName} {a.lastName}
                  {!a.enrollmentActive && (
                    <span className="ml-2 text-xs text-amber-700">{t("admin.providers.angelPaused")}</span>
                  )}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {tp(t, "admin.providers.angelStatsPatients", {
                    current: a.activeAssignments,
                    max: a.maxPatients,
                  })}
                  {" · "}
                  {tp(t, "admin.providers.angelStatsFollowUps", { n: a.followUpsLast30Days })}
                  {" · "}
                  {tp(t, "admin.providers.angelStatsEscalations", { n: a.openEscalations })}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {a.lastFollowUpAt
                    ? tp(t, "admin.providers.angelStatsLastContact", {
                        date: new Date(a.lastFollowUpAt).toLocaleDateString(locale),
                      })
                    : t("admin.providers.angelStatsNoContact")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">{t("admin.providers.uncoveredTitle")}</h2>
        {uncovered.length === 0 ? (
          <p className="text-sm text-slate-500">{t("admin.providers.uncoveredEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {uncovered.map((p) => (
              <div
                key={p.patientUserId}
                className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 rounded-xl p-3 bg-white text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{p.firstName}</p>
                  <p className="text-xs text-slate-500">
                    {p.poolLabel} · {p.priority || "ROUTINE"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">{t("admin.providers.reassignTitle")}</h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">{t("admin.providers.reassignEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {assignments.map((row) => {
              const key = `${row.angelUserId}:${row.patientUserId}`;
              return (
                <div
                  key={row.assignmentId}
                  className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 rounded-xl p-3 bg-white text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {row.patientFirstName} <span className="text-slate-400 font-normal">/</span> {row.angelName}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={releasing === key}
                    onClick={() => adminReleasePatient(row.angelUserId, row.patientUserId)}
                    className="text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {releasing === key ? (
                      <Loader2 className="w-3 h-3 animate-spin inline" />
                    ) : (
                      t("admin.providers.reassignAction")
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-900">{t("admin.providers.escalationsTitle")}</h2>
          {escalations.length > 0 && (
            <span className="text-xs font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
              {escalations.length}
            </span>
          )}
        </div>
        {escalations.length === 0 ? (
          <p className="text-sm text-slate-500">{t("admin.providers.escalationsEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {escalations.map((e) => (
              <div
                key={e.id}
                className="border border-amber-200 rounded-xl p-3 bg-amber-50/50 flex flex-wrap items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{e.patientName}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {e.priority || "ROUTINE"} · {e.campaignName} · {e.angelName}
                  </p>
                  {e.triageFlagLabels.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">{e.triageFlagLabels.join(" · ")}</p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    {new Date(e.contactedAt).toLocaleString(locale)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={resolvingId === e.id}
                  onClick={() => resolveEscalation(e.id)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
                >
                  {resolvingId === e.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    t("admin.providers.escalationResolve")
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-rose-500" />
          <h2 className="text-lg font-bold text-slate-900">
            {t("admin.providers.tab.anjos")} — {t("admin.providers.angelSectionSubtitle")}
          </h2>
          {pending.length > 0 && (
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {pending.length} {t("admin.providers.angelPending").toLowerCase()}
            </span>
          )}
        </div>

        {angels.length === 0 ? (
          <p className="text-sm text-slate-500">{t("admin.providers.emptyAngels")}</p>
        ) : (
          <div className="space-y-3">
            {angels.map((a) => (
              <div key={a.userId} className="border border-slate-200 rounded-xl p-4 bg-white">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {a.firstName} {a.lastName}
                    </p>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3.5 h-3.5" />
                      {a.email}
                      {!a.emailVerified && (
                        <span className="text-amber-600 text-xs font-medium">
                          {t("admin.providers.emailUnverified")}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {t("admin.providers.languages")} {a.languages.join(", ").toUpperCase()} ·{" "}
                      {new Date(a.createdAt).toLocaleDateString(locale)}
                    </p>
                    {a.profession && (
                      <p className="text-xs text-slate-600 mt-1">
                        <span className="font-medium text-slate-500">
                          {t("admin.providers.angelProfession")}
                        </span>{" "}
                        {a.profession}
                      </p>
                    )}
                    {a.volunteerHelp && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg p-2">
                        <span className="font-medium text-slate-500 block mb-0.5">
                          {t("admin.providers.angelVolunteerHelp")}
                        </span>
                        {a.volunteerHelp}
                      </p>
                    )}
                    {a.motivation && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg p-2">
                        <span className="font-medium text-slate-500 block mb-0.5">
                          {t("admin.providers.angelMotivation")}
                        </span>
                        {a.motivation}
                      </p>
                    )}

                    {(a.screeningStatus || (a.trackEnrollments && a.trackEnrollments.length > 0)) && (
                      <div className="mt-3 space-y-2">
                        {a.screeningStatus && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-600">Screening:</span>
                            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {a.screeningStatus}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {(["SUBMITTED", "IN_REVIEW", "VERIFIED", "REJECTED"] as const).map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  disabled={acting === `${a.userId}:screening:${s}`}
                                  onClick={() => setScreening(a.userId, s)}
                                  className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {a.trackEnrollments && a.trackEnrollments.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold text-slate-600">Trilhas:</p>
                            {a.trackEnrollments.map((e) => (
                              <div
                                key={`${a.userId}:${e.track}`}
                                className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                              >
                                <div className="text-xs">
                                  <span className="font-semibold text-slate-900">{e.track}</span>
                                  <span className="text-slate-500"> · {e.status}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  <button
                                    type="button"
                                    disabled={acting === `${a.userId}:${e.track}:approveTrack`}
                                    onClick={() => actTrack(a.userId, e.track, "approveTrack")}
                                    className="text-[11px] px-2 py-1 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50"
                                  >
                                    Aprovar
                                  </button>
                                  <button
                                    type="button"
                                    disabled={acting === `${a.userId}:${e.track}:pauseTrack`}
                                    onClick={() => actTrack(a.userId, e.track, "pauseTrack")}
                                    className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold disabled:opacity-50"
                                  >
                                    Pausar
                                  </button>
                                  <button
                                    type="button"
                                    disabled={acting === `${a.userId}:${e.track}:revokeTrack`}
                                    onClick={() => actTrack(a.userId, e.track, "revokeTrack")}
                                    className="text-[11px] px-2 py-1 rounded-lg border border-red-200 text-red-700 font-semibold disabled:opacity-50"
                                  >
                                    Revogar
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <AdminViewPhoneButton userId={a.userId} />
                    {a.licenseDocCount > 0 ? (
                      <AdminViewLicenseDocsButton userId={a.userId} licenseDocCount={a.licenseDocCount} />
                    ) : (
                      <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded-lg text-center">
                        {t("admin.providers.angelNoCertificate")}
                      </span>
                    )}
                    {a.approvalStatus === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          disabled={acting === a.userId || !a.emailVerified}
                          onClick={() => act(a.userId, "approve")}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-40"
                        >
                          {acting === a.userId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {t("admin.providers.approve")}
                        </button>
                        <button
                          disabled={acting === a.userId}
                          onClick={() => act(a.userId, "reject")}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold"
                        >
                          <XCircle className="w-3.5 h-3.5" /> {t("admin.providers.reject")}
                        </button>
                      </div>
                    )}
                    {a.approvalStatus === "APPROVED" && a.enrollmentActive && (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-center">
                        {t("admin.providers.angelApproved")}
                      </span>
                    )}
                    {a.approvalStatus === "APPROVED" && !a.enrollmentActive && (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full text-center">
                        {t("admin.providers.angelPaused")}
                      </span>
                    )}
                    {a.approvalStatus === "APPROVED" && (
                      <button
                        type="button"
                        disabled={acting === a.userId}
                        onClick={() => act(a.userId, a.enrollmentActive ? "pause" : "reactivate")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold"
                      >
                        {acting === a.userId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : a.enrollmentActive ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                        {a.enrollmentActive
                          ? t("admin.providers.angelPause")
                          : t("admin.providers.angelReactivate")}
                      </button>
                    )}
                    {a.approvalStatus === "REJECTED" && (
                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full text-center">
                        {t("admin.providers.angelRejected")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
