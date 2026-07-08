"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Search, User } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { fetchChartById, readChartDeepLink } from "@/lib/video-chart-nav";
import NoPatientChartsEmptyState from "@/components/professional/NoPatientChartsEmptyState";

export type DentistChart = { id: string; firstName: string; lastName: string };

export type DentistModuleId =
  | "anamnesis"
  | "odontogram"
  | "periodontogram"
  | "treatmentPlan"
  | "prosthetic"
  | "orthodontics"
  | "photos";

export default function DentistChartWorkspace({
  titleKey,
  descKey,
  module,
  children,
}: {
  titleKey: string;
  descKey: string;
  module: DentistModuleId;
  children: (chart: DentistChart) => React.ReactNode;
}) {
  const { t } = useI18n();
  const [charts, setCharts] = useState<DentistChart[]>([]);
  const [selected, setSelected] = useState<DentistChart | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/professional/records");
        const data = await res.json();
        const list: DentistChart[] = data.records || [];
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
  }, [module]);

  const filtered = query.trim()
    ? charts.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase()),
      )
    : charts.slice(0, 10);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/odontologo"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-fuchsia-700 transition"
      >
        <ArrowLeft size={14} />
        {t("dental.backToDashboard")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t(titleKey)}</h1>
        <p className="text-slate-600 mt-2 leading-relaxed">{t(descKey)}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <label className="text-sm font-medium text-slate-700">{t("dental.selectPatient")}</label>
        {selected ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-fuchsia-50 border border-fuchsia-200 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <User size={16} className="text-fuchsia-600" />
              {selected.firstName} {selected.lastName}
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-fuchsia-700 hover:underline"
            >
              {t("dental.changePatient")}
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
                placeholder={t("dental.searchPatient")}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm"
              />
            </div>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-fuchsia-500" size={22} />
              </div>
            ) : charts.length === 0 ? (
              <NoPatientChartsEmptyState variant="fuchsia" compact />
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">{t("pat.searchEmpty")}</p>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(c)}
                      className="w-full text-left px-2 py-2.5 text-sm hover:bg-fuchsia-50 rounded-lg transition"
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

      {selected ? children(selected) : null}
    </div>
  );
}
