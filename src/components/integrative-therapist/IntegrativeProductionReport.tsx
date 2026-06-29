"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { BarChart3, Loader2 } from "lucide-react";

type Period = "this_month" | "last_month" | "year";

type Report = {
  totalSessions: number;
  structuredSessions: number;
  practices: { slug: string; label: string; count: number }[];
};

export default function IntegrativeProductionReport() {
  const { t } = useI18n();
  const [period, setPeriod] = useState<Period>("this_month");
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/integrative-therapist/reports/production?period=${p}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
  }, [period, load]);

  const maxCount = Math.max(1, ...(data?.practices.map((p) => p.count) ?? [1]));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <BarChart3 size={18} className="text-teal-600" />
          {t("it.report.title")}
        </h2>
        <select
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
        >
          <option value="this_month">{t("fin.periodThisMonth")}</option>
          <option value="last_month">{t("fin.periodLastMonth")}</option>
          <option value="year">{t("fin.periodThisYear")}</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-slate-400" size={22} />
        </div>
      ) : !data || data.totalSessions === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">{t("it.report.noData")}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-teal-50 border border-teal-100 p-4">
              <p className="text-xs text-teal-700">{t("it.report.sessions")}</p>
              <p className="text-2xl font-bold text-teal-900">{data.totalSessions}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs text-slate-600">{t("it.tpl.structuredTitle")}</p>
              <p className="text-2xl font-bold text-slate-900">{data.structuredSessions}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-3">{t("it.report.byPractice")}</p>
            <div className="space-y-2">
              {data.practices.map((p) => (
                <div key={p.slug} className="flex items-center gap-3">
                  <span className="text-xs text-slate-700 w-32 sm:w-48 truncate shrink-0" title={p.label}>
                    {p.label}
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${(p.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600 w-6 text-right">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
