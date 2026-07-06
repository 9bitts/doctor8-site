"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Activity, Loader2 } from "lucide-react";
import type { NurseChart } from "./NurseChartWorkspace";

type MonitoringEntry = {
  id: string;
  symptoms: string;
  severity: number | null;
  notes: string | null;
  recordedAt: string;
};

export default function MonitoringReviewModule({ chart }: { chart: NurseChart }) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<MonitoringEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/nurse/charts/${chart.id}/monitoring`);
        const data = await res.json();
        setEntries(data.entries || []);
      } catch {
        setEntries([]);
      }
      setLoading(false);
    })();
  }, [chart.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-rose-500" size={24} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-900 flex items-center gap-2">
        <Activity size={16} className="text-rose-600" />
        {t("nurse.monitoring.reviewTitle")}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500 p-6 text-center">{t("nurse.monitoring.empty")}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {entries.map((e) => (
            <li key={e.id} className="px-4 py-3 space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{new Date(e.recordedAt).toLocaleString()}</span>
                {e.severity != null && (
                  <span>{t("nurse.monitoring.severity")}: {e.severity}/10</span>
                )}
              </div>
              <p className="text-sm text-slate-800">{e.symptoms}</p>
              {e.notes && <p className="text-xs text-slate-500">{e.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
