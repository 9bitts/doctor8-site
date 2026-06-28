"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Heart, Loader2, Phone, MessageCircle, ChevronRight, AlertCircle, Clock, User,
} from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { translate, Lang } from "@/lib/i18n/translations";
import HumanitarianShell from "@/components/humanitarian/HumanitarianShell";
import { getHumanitarianLang } from "@/components/humanitarian/HumanitarianLangSwitcher";
import HumanitarianIntakeSummary from "@/components/humanitarian/HumanitarianIntakeSummary";
import HumanitarianOfflineBanner from "@/components/humanitarian/HumanitarianOfflineBanner";
import { cacheAngelDashboard, loadCachedAngelDashboard } from "@/lib/humanitarian/offline-draft";
import { buildWhatsAppUrl } from "@/lib/humanitarian/angel";

interface PatientRow {
  patientUserId: string;
  patientName: string;
  phone: string;
  priority: string;
  poolLabel: string;
  consultEndedAt: string | null;
  intakeSummary: {
    priority: string | null;
    status: string;
    anamneseComplete: boolean;
    sections: { title: string; items: { label: string; value: string }[] }[];
  } | null;
  lastFollowUp: { contactedAt: string; outcome: string } | null;
  queueEntryId: string;
}

function t(lang: Lang, key: string) {
  return translate(lang, key);
}

export default function HumanitarianAngelPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("pt");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("LOADING");
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [selected, setSelected] = useState<PatientRow | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchDetail>> | null>(null);
  const [saving, setSaving] = useState(false);
  const [channel, setChannel] = useState<"WHATSAPP" | "PHONE" | "SMS" | "OTHER">("WHATSAPP");
  const [outcome, setOutcome] = useState<"REACHED_OK" | "NEEDS_HELP" | "NO_ANSWER" | "WRONG_NUMBER" | "ESCALATED" | "OTHER">("REACHED_OK");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setLang(getHumanitarianLang()); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/humanitarian/angel?campaignSlug=${VENEZUELA_CAMPAIGN_SLUG}&lang=${lang}`,
      );
      if (res.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent("/humanitarian/angel")}`);
        return;
      }
      const data = await res.json();
      setStatus(data.status || "UNKNOWN");
      setPatients(data.patients || []);
      cacheAngelDashboard({ status: data.status, patients: data.patients });
    } catch {
      const cached = loadCachedAngelDashboard<{ status: string; patients: PatientRow[] }>();
      if (cached) {
        setStatus(cached.status);
        setPatients(cached.patients);
      } else {
        setError(t(lang, "angel.portal.loadError"));
      }
    }
    setLoading(false);
  }, [lang, router]);

  useEffect(() => { load(); }, [load]);

  async function fetchDetail(patientUserId: string) {
    const res = await fetch(
      `/api/humanitarian/angel/patients/${patientUserId}?campaignSlug=${VENEZUELA_CAMPAIGN_SLUG}&lang=${lang}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.patient;
  }

  async function openPatient(row: PatientRow) {
    setSelected(row);
    setDetail(null);
    const d = await fetchDetail(row.patientUserId);
    setDetail(d);
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
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setNotes("");
      setSelected(null);
      setDetail(null);
      await load();
    } catch {
      setError(t(lang, "angel.portal.saveError"));
    }
    setSaving(false);
  }

  const waMessage = t(lang, "angel.portal.waTemplate");

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
        <div className="max-w-lg mx-auto text-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">{t(lang, "angel.portal.pendingTitle")}</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            {status === "EMAIL_UNVERIFIED"
              ? t(lang, "angel.portal.verifyEmail")
              : t(lang, "angel.portal.pendingDesc")}
          </p>
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

  return (
    <HumanitarianShell lang={lang} onLangChange={setLang} dark>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <HumanitarianOfflineBanner lang={lang} />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
            <Heart className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-rose-300/80 font-semibold">
              {t(lang, "angel.portal.eyebrow")}
            </p>
            <h1 className="text-xl font-bold text-white">{t(lang, "angel.portal.title")}</h1>
            <p className="text-slate-400 text-sm">{t(lang, "angel.portal.subtitle")}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        {!selected ? (
          <div className="space-y-3">
            {patients.length === 0 ? (
              <p className="text-center text-slate-500 py-12 text-sm">{t(lang, "angel.portal.empty")}</p>
            ) : (
              patients.map((p) => (
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
                      {p.poolLabel} ? {t(lang, `angel.priority.${p.priority}`)}
                      {p.lastFollowUp ? ` — ${t(lang, "angel.portal.contacted")}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => { setSelected(null); setDetail(null); }}
              className="text-sm text-slate-400 hover:text-white"
            >
              ? {t(lang, "reg.back")}
            </button>

            <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
              <h2 className="text-lg font-bold text-white mb-1">{selected.patientName}</h2>
              <p className="text-sm text-slate-400 mb-4">
                {selected.poolLabel} ? {t(lang, `angel.priority.${selected.priority}`)}
              </p>

              {selected.phone && (
                <div className="flex flex-wrap gap-2 mb-4">
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
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
                  )}
                </div>
              )}

              {selected.intakeSummary && (
                <HumanitarianIntakeSummary summary={selected.intakeSummary} lang={lang} dark />
              )}
            </div>

            {detail && detail.followUps.length > 0 && (
              <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                <h3 className="text-sm font-semibold text-white mb-3">{t(lang, "angel.portal.history")}</h3>
                <div className="space-y-2">
                  {detail.followUps.map((f: { id: string; contactedAt: string; outcome: string; channel: string; notes: string | null; angelName: string }) => (
                    <div key={f.id} className="text-xs text-slate-400 border-l-2 border-rose-500/30 pl-3 py-1">
                      <p className="text-slate-300">
                        {new Date(f.contactedAt).toLocaleString()} ? {f.channel} ? {t(lang, `angel.outcome.${f.outcome}`)}
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
                  <button key={c} type="button" onClick={() => setChannel(c)}
                    className={`py-2 rounded-lg text-xs font-medium border ${
                      channel === c ? "border-rose-400 bg-rose-500/20 text-white" : "border-white/10 text-slate-400"
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as typeof outcome)}
                className="w-full mb-3 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
              >
                {(["REACHED_OK", "NEEDS_HELP", "NO_ANSWER", "WRONG_NUMBER", "ESCALATED", "OTHER"] as const).map((o) => (
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
