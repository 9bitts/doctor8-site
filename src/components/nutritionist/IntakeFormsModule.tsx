"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { CheckCircle2, ClipboardList, Loader2, Send } from "lucide-react";
import { NUTRITION_INTAKE_QUESTIONS } from "@/lib/nutrition/intake-questions";
import type { NutritionChart } from "./NutritionChartWorkspace";

type IntakeForm = {
  id: string;
  status: "PENDING" | "COMPLETED";
  responses: Record<string, unknown> | null;
  sentAt: string;
  completedAt: string | null;
};

export default function IntakeFormsModule({ chart }: { chart: NutritionChart }) {
  const { t } = useI18n();
  const [forms, setForms] = useState<IntakeForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/nutritionist/charts/${chart.id}/intake-forms`);
      const data = await res.json();
      setForms(data.forms || []);
    } catch {
      setForms([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [chart.id]);

  async function sendForm() {
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/nutritionist/charts/${chart.id}/intake-forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setError(t("nutri.error"));
        return;
      }
      await load();
    } catch {
      setError(t("nutri.error"));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-amber-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <ClipboardList size={16} className="text-amber-600" />
          {t("nutri.intake.sendTitle")}
        </h3>
        <p className="text-sm text-slate-600">{t("nutri.intake.sendDesc")}</p>
        <ul className="text-sm text-slate-700 space-y-1">
          {NUTRITION_INTAKE_QUESTIONS.slice(0, 5).map((q) => (
            <li key={q.id} className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              {t(q.labelKey)}
            </li>
          ))}
          <li className="text-slate-400">…</li>
        </ul>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={sendForm}
          disabled={sending}
          className="rounded-xl bg-amber-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Send size={16} />
          {sending ? t("nutri.saving") : t("nutri.intake.send")}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-900">
          {t("nutri.intake.history")}
        </div>
        {forms.length === 0 ? (
          <p className="text-sm text-slate-500 p-6 text-center">{t("nutri.intake.noForms")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {forms.map((f) => (
              <li key={f.id} className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-slate-800">
                        {new Date(f.sentAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {f.status === "COMPLETED"
                          ? t("nutri.intake.completed")
                          : t("nutri.intake.pending")}
                      </div>
                    </div>
                    {f.status === "COMPLETED" && (
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    )}
                  </div>
                </button>
                {expandedId === f.id && f.responses && (
                  <dl className="mt-3 space-y-2 text-sm border-t border-slate-100 pt-3">
                    {NUTRITION_INTAKE_QUESTIONS.map((q) => {
                      const val = f.responses?.[q.id];
                      if (val == null || val === "") return null;
                      return (
                        <div key={q.id}>
                          <dt className="text-slate-500 text-xs">{t(q.labelKey)}</dt>
                          <dd className="text-slate-800">{String(val)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
