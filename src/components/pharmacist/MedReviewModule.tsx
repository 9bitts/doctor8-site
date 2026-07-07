"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { ClipboardList, Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { PharmacistChart } from "./PharmacistChartWorkspace";
import type { MedicationItem } from "@/lib/pharmacy/types";

type MedProblem = {
  type: string;
  description: string;
  severity?: "LOW" | "MEDIUM" | "HIGH";
};

type MedReview = {
  id: string;
  medications: MedicationItem[];
  problems: MedProblem[];
  recommendations: string | null;
  adherenceNotes: string | null;
  followUpAt: string | null;
  reviewedAt: string;
};

const emptyMed = (): MedicationItem => ({
  name: "",
  dosage: "",
  route: "",
  frequency: "",
});

const emptyProblem = (): MedProblem => ({
  type: "",
  description: "",
  severity: "LOW",
});

export default function MedReviewModule({ chart }: { chart: PharmacistChart }) {
  const { t } = useI18n();
  const [reviews, setReviews] = useState<MedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [medications, setMedications] = useState<MedicationItem[]>([emptyMed()]);
  const [problems, setProblems] = useState<MedProblem[]>([]);
  const [recommendations, setRecommendations] = useState("");
  const [adherenceNotes, setAdherenceNotes] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/pharmacist/charts/${chart.id}/med-reviews`);
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch {
      setReviews([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [chart.id]);

  function updateMed(idx: number, patch: Partial<MedicationItem>) {
    setMedications((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  }

  function updateProblem(idx: number, patch: Partial<MedProblem>) {
    setProblems((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  async function save() {
    const meds = medications.filter((m) => m.name.trim());
    if (meds.length === 0) return;
    setSaving(true);
    try {
      await fetch(`/api/pharmacist/charts/${chart.id}/med-reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medications: meds,
          problems: problems.filter((p) => p.description.trim()),
          recommendations: recommendations || undefined,
          adherenceNotes: adherenceNotes || undefined,
          followUpAt: followUpAt ? new Date(followUpAt).toISOString() : undefined,
        }),
      });
      setMedications([emptyMed()]);
      setProblems([]);
      setRecommendations("");
      setAdherenceNotes("");
      setFollowUpAt("");
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
          <ClipboardList size={16} className="text-teal-600" />
          {t("pharma.medReview.new")}
        </h3>
        <p className="text-sm text-slate-600">{t("pharma.medReview.newDesc")}</p>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">{t("pharma.medReview.medications")}</p>
          {medications.map((med, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3 mb-2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500">{t("pharma.medReview.item")} {idx + 1}</span>
                {medications.length > 1 && (
                  <button type="button" onClick={() => setMedications((p) => p.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  value={med.name}
                  onChange={(e) => updateMed(idx, { name: e.target.value })}
                  placeholder={t("pharma.medReview.name")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={med.dosage || ""}
                  onChange={(e) => updateMed(idx, { dosage: e.target.value })}
                  placeholder={t("pharma.medReview.dosage")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={med.frequency || ""}
                  onChange={(e) => updateMed(idx, { frequency: e.target.value })}
                  placeholder={t("pharma.medReview.frequency")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={med.route || ""}
                  onChange={(e) => updateMed(idx, { route: e.target.value })}
                  placeholder={t("pharma.medReview.route")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setMedications((p) => [...p, emptyMed()])}
            className="text-sm font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1"
          >
            <Plus size={14} /> {t("pharma.medReview.addMed")}
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">{t("pharma.medReview.problems")}</p>
          {problems.map((prob, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3 mb-2 grid sm:grid-cols-3 gap-2">
              <input
                value={prob.type}
                onChange={(e) => updateProblem(idx, { type: e.target.value })}
                placeholder={t("pharma.medReview.problemType")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={prob.description}
                onChange={(e) => updateProblem(idx, { description: e.target.value })}
                placeholder={t("pharma.medReview.problemDesc")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
              />
              <select
                value={prob.severity || "LOW"}
                onChange={(e) => updateProblem(idx, { severity: e.target.value as MedProblem["severity"] })}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="LOW">{t("pharma.severity.LOW")}</option>
                <option value="MEDIUM">{t("pharma.severity.MEDIUM")}</option>
                <option value="HIGH">{t("pharma.severity.HIGH")}</option>
              </select>
              <button type="button" onClick={() => setProblems((p) => p.filter((_, i) => i !== idx))} className="text-xs text-red-600 hover:underline sm:col-span-3 text-left">
                {t("pharma.remove")}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setProblems((p) => [...p, emptyProblem()])}
            className="text-sm font-medium text-teal-700 hover:text-teal-800"
          >
            + {t("pharma.medReview.addProblem")}
          </button>
        </div>

        <textarea
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
          rows={2}
          placeholder={t("pharma.medReview.recommendations")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <textarea
          value={adherenceNotes}
          onChange={(e) => setAdherenceNotes(e.target.value)}
          rows={2}
          placeholder={t("pharma.medReview.adherenceNotes")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("pharma.medReview.followUp")}</label>
          <input
            type="date"
            value={followUpAt}
            onChange={(e) => setFollowUpAt(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? t("pharma.saving") : t("pharma.medReview.save")}
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">{t("pharma.medReview.history")}</h3>
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-500">{t("pharma.medReview.noHistory")}</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm space-y-2">
                <p className="font-medium text-slate-800">{new Date(r.reviewedAt).toLocaleString()}</p>
                <ul className="text-slate-700 space-y-0.5">
                  {(r.medications as MedicationItem[]).map((m, i) => (
                    <li key={i}>{m.name}{m.dosage ? ` — ${m.dosage}` : ""}{m.frequency ? `, ${m.frequency}` : ""}</li>
                  ))}
                </ul>
                {r.recommendations && (
                  <p><strong>{t("pharma.medReview.recommendations")}:</strong> {r.recommendations}</p>
                )}
                {r.adherenceNotes && (
                  <p><strong>{t("pharma.medReview.adherenceNotes")}:</strong> {r.adherenceNotes}</p>
                )}
                {r.followUpAt && (
                  <p className="text-xs text-slate-500">{t("pharma.medReview.followUp")}: {new Date(r.followUpAt).toLocaleDateString()}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
