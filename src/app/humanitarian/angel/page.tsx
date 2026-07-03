"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart, Loader2, Phone, MessageCircle, ChevronRight, AlertCircle, Clock, User, BookOpen,
} from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { ANGEL_LOGIN } from "@/lib/auth-portals";
import { buildAuthHref } from "@/components/auth/login-shared";
import { translate, Lang } from "@/lib/i18n/translations";
import HumanitarianShell from "@/components/humanitarian/HumanitarianShell";
import { getHumanitarianLang } from "@/components/humanitarian/HumanitarianLangSwitcher";
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
import ProviderDashboardAlerts from "@/components/ProviderDashboardAlerts";

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
}

interface AvailableRow {
  patientUserId: string;
  firstName: string;
  priority: string;
  poolLabel: string;
  consultEndedAt: string | null;
  riskSummary: AngelRiskSummary;
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

function t(lang: Lang, key: string, params?: Record<string, string | number>) {
  let text = translate(lang, key);
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

export default function HumanitarianAngelPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("pt");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("LOADING");
  const [myPatients, setMyPatients] = useState<MyPatientRow[]>([]);
  const [available, setAvailable] = useState<AvailableRow[]>([]);
  const [pendencies, setPendencies] = useState<PendencyRow[]>([]);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [maxPatients, setMaxPatients] = useState(10);
  const [selected, setSelected] = useState<MyPatientRow | null>(null);
  const [detail, setDetail] = useState<{
    followUps: FollowUpRow[];
    riskSummary: AngelRiskSummary;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [channel, setChannel] = useState<"WHATSAPP" | "PHONE" | "SMS" | "OTHER">("WHATSAPP");
  const [outcome, setOutcome] = useState<
    "REACHED_OK" | "NEEDS_HELP" | "NO_ANSWER" | "WRONG_NUMBER" | "ESCALATED" | "OTHER"
  >("REACHED_OK");
  const [notes, setNotes] = useState("");
  const [remindInDays, setRemindInDays] = useState<"" | "3" | "7" | "15" | "30">("");
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");

  useEffect(() => { setLang(getHumanitarianLang()); }, []);

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
        router.push(buildAuthHref(ANGEL_LOGIN, { callbackUrl: "/humanitarian/angel" }));
        return;
      }
      const data = await res.json();
      setStatus(data.status || "UNKNOWN");
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
        setError(t(lang, "angel.portal.loadError"));
      }
    }
    setLoading(false);
  }, [lang, router, userId, cachePayload]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        if (s?.user?.id) setUserId(s.user.id);
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
          setError(t(lang, "angel.portal.limitReached", { max: maxPatients }));
        } else if (data.errorCode === "ALREADY_ASSIGNED") {
          setError(t(lang, "angel.portal.alreadyAssigned"));
        } else {
          setError(t(lang, "angel.portal.claimError"));
        }
        return;
      }
      await load();
    } catch {
      setError(t(lang, "angel.portal.claimError"));
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
      setError(t(lang, "angel.portal.saveError"));
    }
    setSaving(false);
  }

  async function openPatientFromPendency(row: PendencyRow) {
    const match = myPatients.find((p) => p.patientUserId === row.patientUserId);
    if (match) {
      await openPatient(match);
      return;
    }
    setError(t(lang, "angel.portal.pendencyOpenError"));
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
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setNotes("");
      setRemindInDays("");
      setSelected(null);
      setDetail(null);
      await load();
    } catch {
      setError(t(lang, "angel.portal.saveError"));
    }
    setSaving(false);
  }

  const waMessage = t(lang, "angel.portal.waTemplate");
  const sep = t(lang, "angel.portal.listSeparator");

  if (loading && status === "LOADING") {
    return (
      <HumanitarianShell lang={lang} onLangChange={setLang} dark>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
        </div>
      </HumanitarianShell>
    );
  }

  if (status === "PENDING" || status === "EMAIL_UNVERIFIED") {
    return (
      <HumanitarianShell lang={lang} onLangChange={setLang} dark>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <ProviderDashboardAlerts role="ANGEL" />
          {status === "EMAIL_UNVERIFIED" && (
            <div className="max-w-lg mx-auto text-center py-8">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-400" />
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                {t(lang, "angel.portal.verifyEmail")}
              </p>
            </div>
          )}
          {status === "PENDING" && (
            <div className="mt-2 text-left space-y-4">
              <div className="text-center max-w-lg mx-auto">
                <h2 className="text-lg font-semibold text-white mb-2">
                  {t(lang, "angel.portal.pendingTitle")}
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {t(lang, "angel.portal.pendingDesc")}
                </p>
              </div>
              <p className="text-sm text-slate-400">{t(lang, "angel.portal.pendingCertificate")}</p>
              <div className="bg-white rounded-2xl p-4">
                <LicenseDocumentsUpload />
              </div>
            </div>
          )}
        </div>
      </HumanitarianShell>
    );
  }

  if (status === "REJECTED") {
    return (
      <HumanitarianShell lang={lang} onLangChange={setLang} dark>
        <div className="max-w-lg mx-auto text-center py-16 px-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">{t(lang, "angel.portal.rejectedTitle")}</h1>
          <p className="text-slate-400 text-sm">{t(lang, "angel.portal.rejectedDesc")}</p>
        </div>
      </HumanitarianShell>
    );
  }

  if (status === "NOT_ENROLLED") {
    return (
      <HumanitarianShell lang={lang} onLangChange={setLang} dark>
        <div className="max-w-lg mx-auto text-center py-16 px-4">
          <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">{t(lang, "angel.portal.notEnrolledTitle")}</h1>
          <p className="text-slate-400 text-sm leading-relaxed">{t(lang, "angel.portal.notEnrolledDesc")}</p>
        </div>
      </HumanitarianShell>
    );
  }

  return (
    <HumanitarianShell lang={lang} onLangChange={setLang} dark>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <ProviderDashboardAlerts role="ANGEL" />
        <HumanitarianOfflineBanner lang={lang} />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
            <Heart className="w-6 h-6 text-rose-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-rose-300/80 font-semibold">
              {t(lang, "angel.portal.eyebrow")}
            </p>
            <h1 className="text-xl font-bold text-white">{t(lang, "angel.portal.title")}</h1>
            <p className="text-slate-400 text-sm">{t(lang, "angel.portal.subtitle")}</p>
          </div>
          <p className="text-xs font-semibold text-rose-200 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-full">
            {t(lang, "angel.portal.assignmentCount", { current: assignmentCount, max: maxPatients })}
          </p>
        </div>

        <div className="mb-4 flex justify-end">
          <Link
            href="/humanitarian/angel/guide"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-300 hover:text-white"
          >
            <BookOpen className="w-4 h-4" />
            {t(lang, "angel.guide.link")}
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        {!selected ? (
          <div className="space-y-8">
            {pendencies.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-white">{t(lang, "angel.portal.pendencies")}</h2>
                  <span className="text-xs font-bold bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded-full">
                    {pendencies.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {pendencies.map((p) => (
                    <button
                      key={`${p.kind}-${p.patientUserId}`}
                      type="button"
                      onClick={() => openPatientFromPendency(p)}
                      className="w-full text-left p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 transition"
                    >
                      <p className="text-sm font-semibold text-white">{p.patientName}</p>
                      <p className="text-xs text-amber-100/80 mt-0.5">
                        {t(lang, `angel.pendency.${p.kind}`)} {sep} {t(lang, `angel.priority.${p.priority}`)}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-sm font-semibold text-white mb-3">{t(lang, "angel.portal.myPatients")}</h2>
              {myPatients.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">{t(lang, "angel.portal.emptyMy")}</p>
              ) : (
                <div className="space-y-3">
                  {myPatients.map((p) => (
                    <button
                      key={p.patientUserId}
                      onClick={() => openPatient(p)}
                      className="w-full text-left p-4 rounded-2xl border border-white/10 bg-white/5 hover:border-rose-500/40 hover:bg-rose-500/5 transition flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{p.patientName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {p.poolLabel} {sep} {t(lang, `angel.priority.${p.priority}`)}
                          {p.lastFollowUp ? ` ${sep} ${t(lang, "angel.portal.contacted")}` : ""}
                        </p>
                        <div className="mt-2">
                          <AngelRiskBadge summary={p.riskSummary} lang={lang} dark compact />
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold text-white mb-3">{t(lang, "angel.portal.available")}</h2>
              {available.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">{t(lang, "angel.portal.emptyAvailable")}</p>
              ) : (
                <div className="space-y-3">
                  {available.map((p) => (
                    <div
                      key={p.patientUserId}
                      className="p-4 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{p.firstName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {p.poolLabel} {sep} {t(lang, `angel.priority.${p.priority}`)}
                        </p>
                        <div className="mt-2">
                          <AngelRiskBadge summary={p.riskSummary} lang={lang} dark compact />
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={claimingId === p.patientUserId || assignmentCount >= maxPatients}
                        onClick={() => claimPatient(p.patientUserId)}
                        className="shrink-0 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-semibold disabled:opacity-40"
                      >
                        {claimingId === p.patientUserId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          t(lang, "angel.portal.claim")
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
              className="text-sm text-slate-400 hover:text-white"
            >
              &larr; {t(lang, "reg.back")}
            </button>

            <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">{selected.patientName}</h2>
                  <p className="text-sm text-slate-400">
                    {selected.poolLabel} {sep} {t(lang, `angel.priority.${selected.priority}`)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => releasePatient(selected.patientUserId)}
                  disabled={saving}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/20 text-slate-300 hover:bg-white/5 disabled:opacity-50"
                >
                  {t(lang, "angel.portal.release")}
                </button>
              </div>

              <AngelRiskBadge summary={detail?.riskSummary ?? selected.riskSummary} lang={lang} dark />

              {selected.phone && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <a
                    href={`tel:${selected.phone.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                  >
                    <Phone className="w-4 h-4" /> {t(lang, "angel.portal.call")}
                  </a>
                  {buildWhatsAppUrl(selected.phone, waMessage) && (
                    <a
                      href={buildWhatsAppUrl(selected.phone, waMessage)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold"
                    >
                      <MessageCircle className="w-4 h-4" /> {t(lang, "angel.portal.whatsapp")}
                    </a>
                  )}
                </div>
              )}
            </div>

            {detail && detail.followUps.length > 0 && (
              <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                <h3 className="text-sm font-semibold text-white mb-3">{t(lang, "angel.portal.history")}</h3>
                <div className="space-y-2">
                  {detail.followUps.map((f) => (
                    <div key={f.id} className="text-xs text-slate-400 border-l-2 border-rose-500/30 pl-3 py-1">
                      <p className="text-slate-300">
                        {new Date(f.contactedAt).toLocaleString()} {sep}{" "}
                        {t(lang, `angel.channel.${f.channel}`)} {sep}{" "}
                        {t(lang, `angel.outcome.${f.outcome}`)}
                      </p>
                      {f.notes && <p className="mt-1">{f.notes}</p>}
                      <p className="text-slate-500 mt-0.5">{f.angelName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5">
              <h3 className="text-sm font-semibold text-white mb-3">{t(lang, "angel.portal.recordTitle")}</h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(["WHATSAPP", "PHONE", "SMS", "OTHER"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setChannel(c)}
                    className={`py-2 rounded-lg text-xs font-medium border ${
                      channel === c
                        ? "border-rose-400 bg-rose-500/20 text-white"
                        : "border-white/10 text-slate-400"
                    }`}
                  >
                    {t(lang, `angel.channel.${c}`)}
                  </button>
                ))}
              </div>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as typeof outcome)}
                className="w-full mb-3 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
              >
                {(
                  ["REACHED_OK", "NEEDS_HELP", "NO_ANSWER", "WRONG_NUMBER", "ESCALATED", "OTHER"] as const
                ).map((o) => (
                  <option key={o} value={o}>{t(lang, `angel.outcome.${o}`)}</option>
                ))}
              </select>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder={t(lang, "angel.portal.notesPlaceholder")}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm resize-none mb-3"
              />
              <label className="block text-xs text-slate-400 mb-1">{t(lang, "angel.portal.remindLabel")}</label>
              <select
                value={remindInDays}
                onChange={(e) => setRemindInDays(e.target.value as typeof remindInDays)}
                className="w-full mb-3 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
              >
                <option value="">{t(lang, "angel.portal.remindNone")}</option>
                <option value="3">{t(lang, "angel.portal.remindDays", { n: 3 })}</option>
                <option value="7">{t(lang, "angel.portal.remindDays", { n: 7 })}</option>
                <option value="15">{t(lang, "angel.portal.remindDays", { n: 15 })}</option>
                <option value="30">{t(lang, "angel.portal.remindDays", { n: 30 })}</option>
              </select>
              <button
                onClick={saveFollowUp}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {t(lang, "angel.portal.save")}
              </button>
            </div>
          </div>
        )}
      </div>
    </HumanitarianShell>
  );
}
