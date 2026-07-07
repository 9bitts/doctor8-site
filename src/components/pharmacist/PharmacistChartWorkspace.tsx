"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Search, User } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { fetchChartById, readChartDeepLink } from "@/lib/video-chart-nav";
import PharmacyReviewTabs from "./PharmacyReviewTabs";
import IntakeFormsModule from "./IntakeFormsModule";
import ReconciliationModule from "./ReconciliationModule";
import MonitoringReviewModule from "./MonitoringReviewModule";
import PharmaPrescriptionModule from "./PharmaPrescriptionModule";
import EducationModule from "./EducationModule";
import DispensingModule from "./DispensingModule";
import InteractionModule from "./InteractionModule";

export type PharmacistChart = { id: string; firstName: string; lastName: string };

export type PharmacistModuleId =
  | "medReview"
  | "intake"
  | "reconciliation"
  | "monitoring"
  | "pharmaRx"
  | "education"
  | "dispensing"
  | "interactions";

export default function PharmacistChartWorkspace({
  titleKey,
  descKey,
  module,
}: {
  titleKey: string;
  descKey: string;
  module: PharmacistModuleId;
}) {
  const { t } = useI18n();
  const [charts, setCharts] = useState<PharmacistChart[]>([]);
  const [selected, setSelected] = useState<PharmacistChart | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/professional/records");
        const data = await res.json();
        const list: PharmacistChart[] = data.records || [];
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

  function renderModule(chart: PharmacistChart) {
    switch (module) {
      case "medReview":
        return <PharmacyReviewTabs chart={chart} />;
      case "intake":
        return <IntakeFormsModule chart={chart} />;
      case "reconciliation":
        return <ReconciliationModule chart={chart} />;
      case "monitoring":
        return <MonitoringReviewModule chart={chart} />;
      case "pharmaRx":
        return <PharmaPrescriptionModule chart={chart} />;
      case "education":
        return <EducationModule chart={chart} />;
      case "dispensing":
        return <DispensingModule chart={chart} />;
      case "interactions":
        return <InteractionModule chart={chart} />;
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/farmaceutico"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 transition"
      >
        <ArrowLeft size={14} />
        {t("pharma.backToDashboard")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t(titleKey)}</h1>
        <p className="text-slate-600 mt-2 leading-relaxed">{t(descKey)}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <label className="text-sm font-medium text-slate-700">{t("pharma.selectPatient")}</label>
        {selected ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-teal-50 border border-teal-200 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <User size={16} className="text-teal-600" />
              {selected.firstName} {selected.lastName}
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-teal-700 hover:underline"
            >
              {t("pharma.changePatient")}
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
                placeholder={t("pharma.searchPatient")}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm"
              />
            </div>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-teal-500" size={22} />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">{t("pharma.noPatients")}</p>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(c)}
                      className="w-full text-left px-2 py-2.5 text-sm hover:bg-teal-50 rounded-lg transition"
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
