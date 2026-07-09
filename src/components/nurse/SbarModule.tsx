"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Loader2, Save, Send } from "lucide-react";
import type { NurseChart } from "./NurseChartWorkspace";
import { useVoiceFormPrefill, VoicePrefillBanner } from "@/components/voice-assistant/useVoiceFormPrefill";
import type { SbarPrefill } from "@/lib/voice-assistant/types";

type SbarReport = {
  id: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  recipientNote: string | null;
  status: string;
  createdAt: string;
};

export default function SbarModule({ chart }: { chart: NurseChart }) {
  const { t } = useI18n();
  const [reports, setReports] = useState<SbarReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [situation, setSituation] = useState("");
  const [background, setBackground] = useState("");
  const [assessment, setAssessment] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [recipientNote, setRecipientNote] = useState("");

  const { voicePrefillActive } = useVoiceFormPrefill({
    formType: "sbar",
    chartId: chart.id,
    onApply: (data) => {
      const d = data as SbarPrefill;
      if (d.situation) setSituation(d.situation);
      if (d.background) setBackground(d.background);
      if (d.assessment) setAssessment(d.assessment);
      if (d.recommendation) setRecommendation(d.recommendation);
      if (d.recipientNote) setRecipientNote(d.recipientNote);
    },
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/nurse/charts/${chart.id}/sbar`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch {
      setReports([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [chart.id]);

  async function save(status: "DRAFT" | "SENT") {
    if (!situation.trim() || !background.trim() || !assessment.trim() || !recommendation.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/nurse/charts/${chart.id}/sbar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation,
          background,
          assessment,
          recommendation,
          recipientNote: recipientNote || undefined,
          status,
        }),
      });
      setSituation("");
      setBackground("");
      setAssessment("");
      setRecommendation("");
      setRecipientNote("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-rose-500" size={24} />
      </div>
    );
  }

  const fields = [
    { key: "situation", label: t("nurse.sbar.situation"), value: situation, set: setSituation },
    { key: "background", label: t("nurse.sbar.background"), value: background, set: setBackground },
    { key: "assessment", label: t("nurse.sbar.assessment"), value: assessment, set: setAssessment },
    { key: "recommendation", label: t("nurse.sbar.recommendation"), value: recommendation, set: setRecommendation },
  ] as const;

  return (
    <div className="space-y-6">
      <VoicePrefillBanner active={voicePrefillActive} />
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">{t("nurse.sbar.new")}</h3>
        <p className="text-sm text-slate-600">{t("nurse.sbar.newDesc")}</p>
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
            <textarea
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("nurse.sbar.recipient")}</label>
          <input
            type="text"
            value={recipientNote}
            onChange={(e) => setRecipientNote(e.target.value)}
            placeholder={t("nurse.sbar.recipientHint")}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => save("DRAFT")}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? t("nurse.saving") : t("nurse.sbar.saveDraft")}
          </button>
          <button
            type="button"
            onClick={() => save("SENT")}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
          >
            <Send size={14} />
            {saving ? t("nurse.saving") : t("nurse.sbar.send")}
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">{t("nurse.sbar.history")}</h3>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-500">{t("nurse.sbar.noReports")}</p>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.status === "SENT" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                    {r.status === "SENT" ? t("nurse.sbar.sent") : t("nurse.sbar.draft")}
                  </span>
                </div>
                {r.recipientNote && (
                  <p className="text-slate-500 text-xs">{t("nurse.sbar.recipient")}: {r.recipientNote}</p>
                )}
                <p><strong>{t("nurse.sbar.situation")}:</strong> {r.situation}</p>
                <p><strong>{t("nurse.sbar.background")}:</strong> {r.background}</p>
                <p><strong>{t("nurse.sbar.assessment")}:</strong> {r.assessment}</p>
                <p><strong>{t("nurse.sbar.recommendation")}:</strong> {r.recommendation}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
