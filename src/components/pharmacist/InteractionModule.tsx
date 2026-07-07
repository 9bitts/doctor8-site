"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { AlertTriangle, Loader2, Plus, Search, Trash2 } from "lucide-react";
import type { PharmacistChart } from "./PharmacistChartWorkspace";
import type { MedicationItem } from "@/lib/pharmacy/types";

type Interaction = {
  drugA: string;
  drugB: string;
  severity: string;
  description: string;
};

type InteractionCheck = {
  id: string;
  medications: MedicationItem[];
  interactions: Interaction[];
  maxSeverity: string;
  recommendations: string | null;
  checkedAt: string;
};

const SEVERITY_STYLES: Record<string, string> = {
  NONE: "bg-slate-100 text-slate-600",
  MINOR: "bg-blue-100 text-blue-800",
  MODERATE: "bg-amber-100 text-amber-800",
  MAJOR: "bg-orange-100 text-orange-800",
  CONTRAINDICATED: "bg-red-100 text-red-800",
};

const emptyMed = (): MedicationItem => ({ name: "", dosage: "" });

export default function InteractionModule({ chart }: { chart: PharmacistChart }) {
  const { t } = useI18n();
  const [checks, setChecks] = useState<InteractionCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [medications, setMedications] = useState<MedicationItem[]>([emptyMed(), emptyMed()]);
  const [recommendations, setRecommendations] = useState("");
  const [lastResult, setLastResult] = useState<InteractionCheck | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/pharmacist/charts/${chart.id}/interactions`);
      const data = await res.json();
      setChecks(data.checks || []);
    } catch {
      setChecks([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [chart.id]);

  async function runCheck() {
    const meds = medications.filter((m) => m.name.trim());
    if (meds.length < 2) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/pharmacist/charts/${chart.id}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medications: meds,
          recommendations: recommendations || undefined,
        }),
      });
      const data = await res.json();
      if (data.check) {
        setLastResult(data.check);
      }
      await load();
    } finally {
      setChecking(false);
    }
  }

  function SeverityBadge({ severity }: { severity: string }) {
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.NONE}`}>
        {t(`pharma.interaction.severity.${severity}`)}
      </span>
    );
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
          <Search size={16} className="text-teal-600" />
          {t("pharma.interaction.new")}
        </h3>
        <p className="text-sm text-slate-600">{t("pharma.interaction.newDesc")}</p>

        {medications.map((med, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              value={med.name}
              onChange={(e) => setMedications((p) => p.map((m, i) => (i === idx ? { ...m, name: e.target.value } : m)))}
              placeholder={`${t("pharma.rx.name")} ${idx + 1}`}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={med.dosage || ""}
              onChange={(e) => setMedications((p) => p.map((m, i) => (i === idx ? { ...m, dosage: e.target.value } : m)))}
              placeholder={t("pharma.rx.dosage")}
              className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            {medications.length > 2 && (
              <button type="button" onClick={() => setMedications((p) => p.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setMedications((p) => [...p, emptyMed()])}
          className="text-sm font-medium text-teal-700 flex items-center gap-1"
        >
          <Plus size={14} /> {t("pharma.interaction.addMed")}
        </button>

        <textarea
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
          rows={2}
          placeholder={t("pharma.interaction.recommendations")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />

        <button
          type="button"
          onClick={runCheck}
          disabled={checking}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
        >
          {checking ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
          {checking ? t("pharma.saving") : t("pharma.interaction.run")}
        </button>
      </div>

      {lastResult && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-slate-900">{t("pharma.interaction.result")}</h4>
            <SeverityBadge severity={lastResult.maxSeverity} />
          </div>
          {(lastResult.interactions as Interaction[]).length === 0 ? (
            <p className="text-sm text-emerald-700">{t("pharma.interaction.noneFound")}</p>
          ) : (
            <ul className="space-y-2">
              {(lastResult.interactions as Interaction[]).map((ix, i) => (
                <li key={i} className="rounded-lg border border-slate-100 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-slate-800">{ix.drugA} + {ix.drugB}</span>
                    <SeverityBadge severity={ix.severity} />
                  </div>
                  <p className="text-slate-600 text-xs">{ix.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">{t("pharma.interaction.history")}</h3>
        {checks.length === 0 ? (
          <p className="text-sm text-slate-500">{t("pharma.interaction.noHistory")}</p>
        ) : (
          <ul className="space-y-3">
            {checks.map((c) => (
              <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-slate-500 text-xs">{new Date(c.checkedAt).toLocaleString()}</span>
                  <SeverityBadge severity={c.maxSeverity} />
                </div>
                <p className="text-slate-700">
                  {(c.medications as MedicationItem[]).map((m) => m.name).join(", ")}
                </p>
                {(c.interactions as Interaction[]).length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {(c.interactions as Interaction[]).map((ix, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <SeverityBadge severity={ix.severity} />
                        {ix.drugA} + {ix.drugB}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
