"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { DENTAL_ANAMNESIS_FIELDS, DENTAL_TCLE_TEXT_KEY } from "@/lib/dentistry/anamnesis-fields";
import type { DentistChart } from "./DentistChartWorkspace";

export default function AnamnesisModule({ chart }: { chart: DentistChart }) {
  const { t } = useI18n();
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [tcleSigned, setTcleSigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<{ id: string; createdAt: string }[]>([]);

  useEffect(() => {
    fetch(`/api/dentist/charts/${chart.id}/anamnesis`)
      .then((r) => r.json())
      .then((data) => {
        setHistory((data.records || []).map((r: { id: string; createdAt: string }) => ({
          id: r.id,
          createdAt: r.createdAt,
        })));
      })
      .catch(() => {});
  }, [chart.id]);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/dentist/charts/${chart.id}/anamnesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses, tcleSigned }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {history.length > 0 && (
        <p className="text-xs text-slate-500">
          {t("dental.anam.history")}: {history.length} {t("dental.anam.records")}
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        {DENTAL_ANAMNESIS_FIELDS.map((field) => (
          <div key={field.id} className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              {t(field.labelKey)}
              {field.alertOnYes && responses[field.id] === true && (
                <AlertTriangle size={14} className="text-amber-500" />
              )}
            </label>
            {field.type === "boolean" ? (
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={responses[field.id] === true}
                    onChange={() => setResponses({ ...responses, [field.id]: true })}
                  />
                  {t("common.yes")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={responses[field.id] === false}
                    onChange={() => setResponses({ ...responses, [field.id]: false })}
                  />
                  {t("common.no")}
                </label>
              </div>
            ) : field.type === "select" && field.options ? (
              <select
                value={String(responses[field.id] ?? "")}
                onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={String(responses[field.id] ?? "")}
                onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 space-y-3">
        <p className="text-sm text-slate-700 leading-relaxed">{t(DENTAL_TCLE_TEXT_KEY)}</p>
        <label className="flex items-start gap-2 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            checked={tcleSigned}
            onChange={(e) => setTcleSigned(e.target.checked)}
            className="mt-0.5"
          />
          {t("dental.anam.tcleAccept")}
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !tcleSigned}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {t("dental.anam.save")}
        </button>
        {saved && <span className="text-sm text-emerald-600">{t("dental.anam.saved")}</span>}
      </div>
    </div>
  );
}
