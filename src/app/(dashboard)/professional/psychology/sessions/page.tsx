"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf, type Lang } from "@/lib/i18n/translations";
import { SESSION_FORMATS, type SessionFormat } from "@/lib/psychology-templates";
import {
  ArrowLeft, ClipboardList, Loader2, Save, User, Search, Clock, CheckCircle2,
} from "lucide-react";

interface Chart { id: string; firstName: string; lastName: string; }
interface SessionNote {
  id: string; title: string; format: SessionFormat; renderedBody: string;
  patientName: string; createdAt: string; signatureStatus: string | null;
}

export default function PsychologySessionsPage() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang as Lang);

  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create">("list");

  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(null);
  const [format, setFormat] = useState<SessionFormat>("DAP");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [duration, setDuration] = useState(50);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const formatDef = SESSION_FORMATS.find((f) => f.id === format)!;

  useEffect(() => {
    (async () => {
      try {
        const [notesRes, chartsRes] = await Promise.all([
          fetch("/api/professional/psychology/session-notes"),
          fetch("/api/professional/records"),
        ]);
        const notesData = await notesRes.json();
        const chartsData = await chartsRes.json();
        setNotes(notesData.notes || []);
        setCharts(chartsData.records || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const empty: Record<string, string> = {};
    formatDef.fields.forEach((f) => { empty[f.key] = ""; });
    setFields(empty);
  }, [format, formatDef.fields]);

  const filteredCharts = patientQuery.trim()
    ? charts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(patientQuery.toLowerCase()))
    : charts.slice(0, 8);

  function fieldLabel(key: string) {
    const f = formatDef.fields.find((x) => x.key === key);
    if (!f) return key;
    if (lang === "en") return f.labelEn;
    if (lang === "es") return f.labelEs;
    return f.labelPt;
  }

  function fieldPlaceholder(key: string) {
    return formatDef.fields.find((x) => x.key === key)?.placeholderPt || "";
  }

  async function handleSave() {
    setError("");
    if (!selectedPatient) { setError(t("psy.sessions.needPatient")); return; }
    const hasContent = Object.values(fields).some((v) => v.trim());
    if (!hasContent) { setError(t("psy.sessions.needContent")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/professional/psychology/session-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientRecordId: selectedPatient.id,
          format,
          fields,
          sessionDurationMins: duration,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotes((prev) => [{
          id: data.id,
          title: data.title,
          format: data.format,
          renderedBody: data.renderedBody,
          patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
          createdAt: data.createdAt,
          signatureStatus: null,
        }, ...prev]);
        setView("list");
        setSelectedPatient(null);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(typeof d.error === "string" ? d.error : t("psy.sessions.saveError"));
      }
    } finally { setSaving(false); }
  }

  if (view === "create") {
    return (
      <div className="max-w-3xl mx-auto space-y-5 pb-24">
        <button onClick={() => setView("list")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 font-medium">
          <ArrowLeft size={16} /> {t("psy.sessions.back")}
        </button>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("psy.sessions.createTitle")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("psy.sessions.createSubtitle")}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <label className="text-sm font-semibold text-slate-800">{t("psy.sessions.selectPatient")}</label>
          {selectedPatient ? (
            <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-xl p-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center font-bold text-violet-600 text-sm">
                {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800">{selectedPatient.firstName} {selectedPatient.lastName}</p>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="text-xs text-slate-500 hover:text-red-500">{t("common.cancel")}</button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  placeholder={t("psy.sessions.searchPatient")}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {filteredCharts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedPatient(c)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-violet-50 text-left text-sm"
                  >
                    <User size={16} className="text-slate-400" />
                    {c.firstName} {c.lastName}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <label className="text-sm font-semibold text-slate-800">{t("psy.sessions.format")}</label>
          <div className="grid sm:grid-cols-2 gap-2">
            {SESSION_FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition text-left ${
                  format === f.id ? "border-violet-300 bg-violet-50 text-violet-800" : "border-slate-200 text-slate-600 hover:border-violet-200"
                }`}
              >
                {lang === "en" ? f.labelEn : lang === "es" ? f.labelEs : f.labelPt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Clock size={16} className="text-slate-400" />
            <label className="text-sm text-slate-600">{t("psy.sessions.duration")}</label>
            <input
              type="number"
              min={15}
              max={180}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-20 px-2 py-1 rounded-lg border border-slate-200 text-sm"
            />
            <span className="text-sm text-slate-400">min</span>
          </div>

          {formatDef.fields.map((f) => (
            <div key={f.key}>
              <label className="text-sm font-semibold text-slate-700">{fieldLabel(f.key)}</label>
              <textarea
                value={fields[f.key] || ""}
                onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={fieldPlaceholder(f.key)}
                rows={4}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-y"
              />
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-60"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {t("psy.sessions.save")}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href="/professional/psychology" className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 font-medium mb-2">
            <ArrowLeft size={16} /> {t("psy.backToHub")}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList size={24} className="text-violet-600" />
            {t("psy.mod.sessions.title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("psy.mod.sessions.desc")}</p>
        </div>
        <button
          onClick={() => setView("create")}
          className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700"
        >
          {t("psy.sessions.new")}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-violet-500" size={28} /></div>
      ) : notes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">{t("psy.sessions.empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{n.patientName}</p>
                    <span className="text-xs font-medium bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{n.format}</span>
                    {n.signatureStatus === "SIGNED" && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={11} /> {t("psy.sessions.signed")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(n.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <pre className="mt-3 text-sm text-slate-600 whitespace-pre-wrap font-sans line-clamp-4">{n.renderedBody}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
