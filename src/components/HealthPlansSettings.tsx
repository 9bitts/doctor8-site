"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Loader2, Shield, Check } from "lucide-react";

type Plan = { id: string; name: string; slug: string; selected: boolean };

export default function HealthPlansSettings({ apiPath }: { apiPath: string }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(apiPath)
      .then((r) => r.json())
      .then((d) => setPlans(d.plans || []))
      .finally(() => setLoading(false));
  }, [apiPath]);

  function toggle(id: string) {
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(apiPath, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          healthPlanIds: plans.filter((p) => p.selected).map((p) => p.id),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 size={16} className="animate-spin" /> {t("pub.loading")}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Shield size={18} className="text-brand-500" /> {t("pubSearch.healthPlansTitle")}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{t("pubSearch.healthPlansSubtitle")}</p>
      </div>

      {saved && (
        <p className="text-sm text-brand-600 flex items-center gap-1">
          <Check size={14} /> {t("pubSearch.healthPlansSaved")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {plans.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            className={`text-sm px-3 py-2 rounded-xl border transition ${
              p.selected
                ? "bg-brand-50 border-brand-300 text-brand-700 font-medium"
                : "border-slate-200 text-slate-600 hover:border-brand-200"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        {t("pubSearch.healthPlansSave")}
      </button>
    </div>
  );
}
