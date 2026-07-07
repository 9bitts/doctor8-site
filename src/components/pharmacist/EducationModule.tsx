"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { BookOpen, Loader2, Save } from "lucide-react";
import type { PharmacistChart } from "./PharmacistChartWorkspace";

type EducationSession = {
  id: string;
  topic: string;
  educationType: string;
  content: string;
  patientFeedback: string | null;
  durationMin: number | null;
  conductedAt: string;
};

const EDUCATION_TYPES = ["MEDICATION", "DISEASE", "LIFESTYLE", "ADHERENCE", "OTHER"] as const;

export default function EducationModule({ chart }: { chart: PharmacistChart }) {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<EducationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [topic, setTopic] = useState("");
  const [educationType, setEducationType] = useState<(typeof EDUCATION_TYPES)[number]>("MEDICATION");
  const [content, setContent] = useState("");
  const [patientFeedback, setPatientFeedback] = useState("");
  const [durationMin, setDurationMin] = useState(15);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/pharmacist/charts/${chart.id}/education`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      setSessions([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [chart.id]);

  async function save() {
    if (!topic.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/pharmacist/charts/${chart.id}/education`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          educationType,
          content,
          patientFeedback: patientFeedback || undefined,
          durationMin,
        }),
      });
      setTopic("");
      setContent("");
      setPatientFeedback("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-teal-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 space-y-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <BookOpen size={16} className="text-teal-600" />
          {t("pharma.education.new")}
        </h3>
        <p className="text-sm text-slate-600">{t("pharma.education.newDesc")}</p>

        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t("pharma.education.topic")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <select
          value={educationType}
          onChange={(e) => setEducationType(e.target.value as typeof educationType)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          {EDUCATION_TYPES.map((type) => (
            <option key={type} value={type}>{t(`pharma.education.type.${type}`)}</option>
          ))}
        </select>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder={t("pharma.education.content")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <textarea
          value={patientFeedback}
          onChange={(e) => setPatientFeedback(e.target.value)}
          rows={2}
          placeholder={t("pharma.education.feedback")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-700">{t("pharma.education.duration")}</label>
          <input
            type="number"
            min={1}
            max={180}
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
          />
          <span className="text-xs text-slate-500">{t("pharma.education.minutes")}</span>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? t("pharma.saving") : t("pharma.education.save")}
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">{t("pharma.education.history")}</h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">{t("pharma.education.noHistory")}</p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-slate-900">{s.topic}</span>
                  <span className="text-xs text-slate-500">{new Date(s.conductedAt).toLocaleString()}</span>
                </div>
                <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  {t(`pharma.education.type.${s.educationType}`)}
                </span>
                <p className="text-slate-700 mt-2">{s.content}</p>
                {s.patientFeedback && (
                  <p className="text-xs text-slate-500">{t("pharma.education.feedback")}: {s.patientFeedback}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
