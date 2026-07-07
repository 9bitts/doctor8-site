"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { psychologistHubHref } from "@/lib/psychologist-portal";
import { localeOf, type Lang } from "@/lib/i18n/translations";
import { PSYCHOLOGY_SCALES, type ScaleId } from "@/lib/psychology-scales";
import VideoConsultReturnBanner from "@/components/professional/VideoConsultReturnBanner";
import { fetchChartById, readChartDeepLink } from "@/lib/video-chart-nav";
import {
  ArrowLeft, BarChart3, Loader2, Save, User, Search, CheckCircle2, AlertTriangle,
} from "lucide-react";

interface Chart { id: string; firstName: string; lastName: string; }
interface ScaleApp {
  id: string; scaleId: string; score: number; patientName: string; createdAt: string;
  interpretation: { levelPt: string; levelEn: string; levelEs: string };
  risk?: { level: string; messagePt: string; messageEn: string; messageEs: string } | null;
}

export default function PsychologyScalesPage() {
  const { t, lang } = useI18n();
  const pathname = usePathname();
  const hubHref = psychologistHubHref(pathname);
  const locale = localeOf(lang as Lang);

  const [applications, setApplications] = useState<ScaleApp[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "apply">("list");

  const [selectedScale, setSelectedScale] = useState<ScaleId>("PHQ9");
  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [responses, setResponses] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastRisk, setLastRisk] = useState<ScaleApp["risk"]>(null);
  const [consultReturnUrl, setConsultReturnUrl] = useState<string | null>(null);
  const [lockPatient, setLockPatient] = useState(false);

  const scale = PSYCHOLOGY_SCALES.find((s) => s.id === selectedScale)!;

  useEffect(() => {
    (async () => {
      try {
        const [scalesRes, chartsRes] = await Promise.all([
          fetch("/api/professional/psychology/scales"),
          fetch("/api/professional/records"),
        ]);
        const scalesData = await scalesRes.json();
        const chartsData = await chartsRes.json();
        setApplications(scalesData.applications || []);
        setCharts(chartsData.records || []);

        const { patientRecordId, returnUrl, view } = readChartDeepLink();
        if (returnUrl) setConsultReturnUrl(returnUrl);
        if (patientRecordId && returnUrl) {
          setLockPatient(true);
          const chart = (chartsData.records || []).find((c: Chart) => c.id === patientRecordId)
            || await fetchChartById(patientRecordId);
          if (chart) {
            setSelectedPatient(chart);
            if (view === "apply") setView("apply");
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    setResponses(scale.questions.map(() => -1));
  }, [selectedScale, scale.questions]);

  const filteredCharts = patientQuery.trim()
    ? charts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(patientQuery.toLowerCase()))
    : charts.slice(0, 8);

  const allAnswered = responses.every((r) => r >= 0);
  const previewScore = allAnswered ? responses.reduce((s, v) => s + v, 0) : null;

  function scaleName(s: typeof scale) {
    if (lang === "en") return s.nameEn;
    if (lang === "es") return s.nameEs;
    return s.namePt;
  }

  function optionLabel(opt: typeof scale.options[0]) {
    if (lang === "en") return opt.labelEn;
    if (lang === "es") return opt.labelEs;
    return opt.labelPt;
  }

  function questionText(q: typeof scale.questions[0]) {
    if (lang === "en") return q.textEn;
    if (lang === "es") return q.textEs;
    return q.textPt;
  }

  function interpLevel(app: ScaleApp) {
    if (lang === "en") return app.interpretation.levelEn;
    if (lang === "es") return app.interpretation.levelEs;
    return app.interpretation.levelPt;
  }

  async function handleSave() {
    setError("");
    if (!selectedPatient) { setError(t("psy.scales.needPatient")); return; }
    if (!allAnswered) { setError(t("psy.scales.needAll")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/professional/psychology/scales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientRecordId: selectedPatient.id,
          scaleId: selectedScale,
          responses,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastRisk(data.risk || null);
        setApplications((prev) => [{
          id: data.id,
          scaleId: data.scaleId,
          score: data.score,
          interpretation: data.interpretation,
          risk: data.risk,
          patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
          createdAt: data.createdAt,
        }, ...prev]);
        setView("list");
        setSelectedPatient(null);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(typeof d.error === "string" ? d.error : t("psy.scales.saveError"));
      }
    } finally { setSaving(false); }
  }

  if (view === "apply") {
    return (
      <div className="max-w-3xl mx-auto space-y-5 pb-24">
        <VideoConsultReturnBanner
          returnUrl={consultReturnUrl}
          patientName={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : undefined}
          lang={lang as "pt" | "en" | "es"}
        />
        <button onClick={() => setView("list")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 font-medium">
          <ArrowLeft size={16} /> {t("psy.scales.back")}
        </button>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("psy.scales.applyTitle")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("psy.scales.applySubtitle")}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <label className="text-sm font-semibold text-slate-800">{t("psy.scales.selectScale")}</label>
          <div className="grid sm:grid-cols-2 gap-2">
            {PSYCHOLOGY_SCALES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedScale(s.id)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition text-left ${
                  selectedScale === s.id ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-600"
                }`}
              >
                {scaleName(s)}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {lang === "en" ? scale.descriptionEn : lang === "es" ? scale.descriptionEs : scale.descriptionPt}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <label className="text-sm font-semibold text-slate-800">{t("psy.scales.selectPatient")}</label>
          {selectedPatient ? (
            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-sm">
                {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
              </div>
              <p className="font-medium text-slate-800 flex-1">{selectedPatient.firstName} {selectedPatient.lastName}</p>
              {!lockPatient && (
              <button onClick={() => setSelectedPatient(null)} className="text-xs text-slate-500">{t("common.cancel")}</button>
              )}
            </div>
          ) : lockPatient ? (
            <p className="text-sm text-slate-500">{t("psy.scales.selectPatient")}</p>
          ) : (
            <>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} placeholder={t("psy.scales.searchPatient")} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {filteredCharts.map((c) => (
                  <button key={c.id} onClick={() => setSelectedPatient(c)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-indigo-50 text-left text-sm">
                    <User size={16} className="text-slate-400" />{c.firstName} {c.lastName}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-6">
          <p className="text-sm font-semibold text-slate-800">{t("psy.scales.questions")}</p>
          {scale.questions.map((q, qi) => (
            <div key={q.id} className="space-y-2">
              <p className="text-sm text-slate-700">{qi + 1}. {questionText(q)}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {scale.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setResponses((prev) => { const n = [...prev]; n[qi] = opt.value; return n; })}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border text-left ${
                      responses[qi] === opt.value ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {optionLabel(opt)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {previewScore !== null && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            <p className="text-sm font-semibold text-indigo-900">
              {t("psy.scales.result")}: {previewScore} — {lang === "en" ? scale.interpret(previewScore).levelEn : lang === "es" ? scale.interpret(previewScore).levelEs : scale.interpret(previewScore).levelPt}
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button onClick={handleSave} disabled={saving || !allAnswered} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {t("psy.scales.save")}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href={hubHref} className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 font-medium mb-2">
            <ArrowLeft size={16} /> {t("psy.backToHub")}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 size={24} className="text-indigo-600" />
            {t("psy.mod.scales.title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("psy.mod.scales.desc")}</p>
        </div>
        <button onClick={() => setView("apply")} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">
          {t("psy.scales.apply")}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
        {t("psy.scales.disclaimer")}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={28} /></div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <BarChart3 size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">{t("psy.scales.empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold text-slate-800">{a.patientName}</p>
                <p className="text-sm text-slate-500 mt-0.5">{a.scaleId} — {t("psy.scales.score")} {a.score} ({interpLevel(a)})</p>
                {a.risk && a.risk.level !== "none" && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 mt-2 flex items-start gap-1 max-w-md">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    {lang === "en" ? a.risk.messageEn : lang === "es" ? a.risk.messageEs : a.risk.messagePt}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(a.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
