"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Search, User } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { fetchChartById, readChartDeepLink } from "@/lib/video-chart-nav";
import NoPatientChartsEmptyState from "@/components/professional/NoPatientChartsEmptyState";
import SaeModule from "./SaeModule";
import ScalesModule from "./ScalesModule";
import CarePlanModule from "./CarePlanModule";
import IntakeFormsModule from "./IntakeFormsModule";
import MonitoringReviewModule from "./MonitoringReviewModule";
import NurseSaeTabs from "./NurseSaeTabs";

export type NurseChart = { id: string; firstName: string; lastName: string };

import SbarModule from "./SbarModule";
import MedCheckModule from "./MedCheckModule";
import MedPrescriptionModule from "./MedPrescriptionModule";

export type NurseModuleId = "sae" | "scales" | "carePlan" | "intake" | "monitoring" | "sbar" | "medCheck" | "medRx";

export default function NurseChartWorkspace({
  titleKey,
  descKey,
  module,
}: {
  titleKey: string;
  descKey: string;
  module: NurseModuleId;
}) {
  const { t } = useI18n();
  const [charts, setCharts] = useState<NurseChart[]>([]);
  const [selected, setSelected] = useState<NurseChart | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/professional/records");
        const data = await res.json();
        const list: NurseChart[] = data.records || [];
        setCharts(list);

        const { patientRecordId } = readChartDeepLink();
        if (patientRecordId) {
          const chart =
            list.find((c) => c.id === patientRecordId) ||
            (await fetchChartById(patientRecordId));
          if (chart) setSelected(chart);
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  const filtered = query.trim()
    ? charts.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase()),
      )
    : charts.slice(0, 10);

  function renderModule(chart: NurseChart) {
    switch (module) {
      case "sae":
        return <NurseSaeTabs chart={chart} />;
      case "scales":
        return <ScalesModule chart={chart} />;
      case "carePlan":
        return <CarePlanModule chart={chart} />;
      case "intake":
        return <IntakeFormsModule chart={chart} />;
      case "monitoring":
        return <MonitoringReviewModule chart={chart} />;
      case "sbar":
        return <SbarModule chart={chart} />;
      case "medCheck":
        return <MedCheckModule chart={chart} />;
      case "medRx":
        return <MedPrescriptionModule chart={chart} />;
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/enfermeiro"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-rose-700 transition"
      >
        <ArrowLeft size={14} />
        {t("nurse.backToDashboard")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t(titleKey)}</h1>
        <p className="text-slate-600 mt-2 leading-relaxed">{t(descKey)}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <label className="text-sm font-medium text-slate-700">{t("nurse.selectPatient")}</label>
        {selected ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <User size={16} className="text-rose-600" />
              {selected.firstName} {selected.lastName}
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-rose-700 hover:underline"
            >
              {t("nurse.changePatient")}
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("nurse.searchPatient")}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm"
              />
            </div>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-rose-500" size={22} />
              </div>
            ) : charts.length === 0 ? (
              <NoPatientChartsEmptyState variant="rose" compact />
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">{t("pat.searchEmpty")}</p>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(c)}
                      className="w-full text-left px-2 py-2.5 text-sm hover:bg-rose-50 rounded-lg transition"
                    >
                      {c.firstName} {c.lastName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {selected && renderModule(selected)}
    </div>
  );
}
