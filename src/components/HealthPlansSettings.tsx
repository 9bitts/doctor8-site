"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { dedupeHealthPlanList } from "@/lib/health-plan-display";
import { Loader2, Shield, Check } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  slug: string;
  selected: boolean;
  allowedWeekdays: number[];
  minLeadDays: number;
};

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export default function HealthPlansSettings({ apiPath }: { apiPath: string }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saved, setSaved] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch(apiPath)
      .then((r) => r.json())
      .then((d) => setPlans(dedupeHealthPlanList(d.plans || [])))
      .finally(() => setLoading(false));
  }, [apiPath]);

  function toggle(id: string) {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, selected: !p.selected, allowedWeekdays: p.selected ? [] : p.allowedWeekdays, minLeadDays: p.selected ? 0 : p.minLeadDays }
          : p
      )
    );
    setExpandedId((cur) => (cur === id ? null : id));
  }

  function toggleWeekday(planId: string, day: number) {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        const has = p.allowedWeekdays.includes(day);
        const allowedWeekdays = has
          ? p.allowedWeekdays.filter((d) => d !== day)
          : [...p.allowedWeekdays, day].sort();
        return { ...p, allowedWeekdays };
      })
    );
  }

  function setMinLead(planId: string, minLeadDays: number) {
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, minLeadDays: Math.max(0, minLeadDays) } : p))
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
          plans: plans
            .filter((p) => p.selected)
            .map((p) => ({
              healthPlanId: p.id,
              allowedWeekdays: p.allowedWeekdays,
              minLeadDays: p.minLeadDays,
            })),
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

  const selectedPlans = plans.filter((p) => p.selected);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Shield size={18} className="text-brand-500" /> {t("pubSearch.healthPlansTitle")}
          <span className="text-slate-400 text-sm font-normal">{t("set.optional")}</span>
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

      {selectedPlans.length > 0 && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-slate-700">{t("healthPlanRules.title")}</p>
          <p className="text-xs text-slate-500">{t("healthPlanRules.hint")}</p>

          {selectedPlans.map((p) => (
            <div key={p.id} className="bg-slate-50 rounded-xl p-4 space-y-3">
              <button
                type="button"
                onClick={() => setExpandedId((cur) => (cur === p.id ? null : p.id))}
                className="text-sm font-semibold text-slate-800 w-full text-left"
              >
                {p.name}
              </button>

              {(expandedId === p.id || selectedPlans.length === 1) && (
                <>
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-2">
                      {t("healthPlanRules.weekdaysLabel")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAY_KEYS.map((key, day) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleWeekday(p.id, day)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                            p.allowedWeekdays.includes(day)
                              ? "bg-brand-500 border-brand-500 text-white"
                              : "bg-white border-slate-200 text-slate-500 hover:border-brand-200"
                          }`}
                        >
                          {t(`healthPlanRules.weekday.${key}`)}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      {t("healthPlanRules.weekdaysAllHint")}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      {t("healthPlanRules.minLeadLabel")}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={p.minLeadDays}
                      onChange={(e) => setMinLead(p.id, Number(e.target.value) || 0)}
                      className="w-24 text-sm border border-slate-200 rounded-lg px-2 py-1.5"
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

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
