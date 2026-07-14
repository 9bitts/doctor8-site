"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw, Search, User } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { fetchChartById, readChartDeepLink } from "@/lib/video-chart-nav";
import NoPatientChartsEmptyState from "@/components/professional/NoPatientChartsEmptyState";
import { PlatformPatientResults } from "@/components/professional/PlatformPatientResults";
import { useProfessionalPatientSearch } from "@/hooks/useProfessionalPatientSearch";

export type ProfessionalChart = { id: string; firstName: string; lastName: string };

export type ChartWorkspaceAccent = "amber" | "fuchsia";

const ACCENT_STYLES: Record<
  ChartWorkspaceAccent,
  {
    backHover: string;
    selectedBg: string;
    selectedBorder: string;
    icon: string;
    changeLink: string;
    listHover: string;
    spinner: string;
    emptyVariant: "amber" | "fuchsia";
  }
> = {
  amber: {
    backHover: "hover:text-amber-700",
    selectedBg: "bg-amber-50",
    selectedBorder: "border-amber-200",
    icon: "text-amber-600",
    changeLink: "text-amber-700",
    listHover: "hover:bg-amber-50",
    spinner: "text-amber-500",
    emptyVariant: "amber",
  },
  fuchsia: {
    backHover: "hover:text-fuchsia-700",
    selectedBg: "bg-fuchsia-50",
    selectedBorder: "border-fuchsia-200",
    icon: "text-fuchsia-600",
    changeLink: "text-fuchsia-700",
    listHover: "hover:bg-fuchsia-50",
    spinner: "text-fuchsia-500",
    emptyVariant: "fuchsia",
  },
};

const LIST_PREVIEW_LIMIT = 10;

export default function ProfessionalChartWorkspace({
  titleKey,
  descKey,
  backHref,
  accent,
  i18nPrefix,
  children,
}: {
  titleKey: string;
  descKey: string;
  backHref: string;
  accent: ChartWorkspaceAccent;
  i18nPrefix: "nutri" | "dental";
  children: (chart: ProfessionalChart) => React.ReactNode;
}) {
  const { t } = useI18n();
  const styles = ACCENT_STYLES[accent];
  const [charts, setCharts] = useState<ProfessionalChart[]>([]);
  const [selected, setSelected] = useState<ProfessionalChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const platformSearch = useProfessionalPatientSearch({ debounceMs: 300 });

  const loadCharts = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/professional/records");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const list: ProfessionalChart[] = data.records || [];
      setCharts(list);

      const { patientRecordId } = readChartDeepLink();
      if (patientRecordId) {
        const chart =
          list.find((c) => c.id === patientRecordId) ||
          (await fetchChartById(patientRecordId));
        if (chart) setSelected(chart);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCharts();
  }, [loadCharts]);

  const trimmedQuery = platformSearch.query.trim();
  const showPlatform = trimmedQuery.length >= platformSearch.minPlatformChars;
  const filtered = showPlatform
    ? platformSearch.records.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
      }))
    : trimmedQuery
      ? charts.filter((c) =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(trimmedQuery.toLowerCase()),
        )
      : charts.slice(0, LIST_PREVIEW_LIMIT);

  const showListCounter = !trimmedQuery && charts.length > LIST_PREVIEW_LIMIT;

  async function handleImportFromPlatform(item: Parameters<typeof platformSearch.importPatient>[0]) {
    const chart = await platformSearch.importPatient(item);
    if (chart) {
      const next = { id: chart.id, firstName: chart.firstName, lastName: chart.lastName };
      setCharts((prev) => [next, ...prev.filter((c) => c.id !== chart.id)]);
      setSelected(next);
      platformSearch.setQuery("");
    }
  }

  return (
    <div className={`mx-auto px-4 py-8 space-y-6 ${accent === "fuchsia" ? "max-w-5xl" : "max-w-4xl"}`}>
      <Link
        href={backHref}
        className={`inline-flex items-center gap-1.5 text-sm text-slate-500 transition ${styles.backHover}`}
      >
        <ArrowLeft size={14} />
        {t(`${i18nPrefix}.backToDashboard`)}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t(titleKey)}</h1>
        <p className="text-slate-600 mt-2 leading-relaxed">{t(descKey)}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <label className="text-sm font-medium text-slate-700">{t(`${i18nPrefix}.selectPatient`)}</label>
        {selected ? (
          <div
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${styles.selectedBg} ${styles.selectedBorder}`}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <User size={16} className={styles.icon} />
              {selected.firstName} {selected.lastName}
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className={`text-xs hover:underline ${styles.changeLink}`}
            >
              {t(`${i18nPrefix}.changePatient`)}
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={platformSearch.query}
                onChange={(e) => platformSearch.setQuery(e.target.value)}
                placeholder={t(`${i18nPrefix}.searchPatient`)}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm"
              />
            </div>
            {(loading || platformSearch.loading) ? (
              <div className="flex justify-center py-6">
                <Loader2 className={`animate-spin ${styles.spinner}`} size={22} />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center space-y-3">
                <p className="text-sm text-red-700">{t(`${i18nPrefix}.charts.loadError`)}</p>
                <button
                  type="button"
                  onClick={() => void loadCharts()}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-900"
                >
                  <RefreshCw size={14} />
                  {t(`${i18nPrefix}.charts.retry`)}
                </button>
              </div>
            ) : charts.length === 0 && !showPlatform ? (
              <NoPatientChartsEmptyState variant={styles.emptyVariant} compact />
            ) : filtered.length === 0 && !showPlatform ? (
              <p className="text-sm text-slate-500 py-4 text-center">{t("pat.searchEmpty")}</p>
            ) : filtered.length === 0 && showPlatform && platformSearch.importable.length === 0 && platformSearch.platformMatches.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">{t("pat.searchEmpty")}</p>
            ) : (
              <>
                {showListCounter && (
                  <p className="text-xs text-slate-500">
                    {t(`${i18nPrefix}.charts.showing`)
                      .replace("{shown}", String(LIST_PREVIEW_LIMIT))
                      .replace("{total}", String(charts.length))}
                  </p>
                )}
                {filtered.length > 0 && (
                <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {filtered.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(c)}
                        className={`w-full text-left px-2 py-2.5 text-sm rounded-lg transition ${styles.listHover}`}
                      >
                        {c.firstName} {c.lastName}
                      </button>
                    </li>
                  ))}
                </ul>
                )}
                {showPlatform && (
                  <div className="border rounded-xl divide-y overflow-hidden">
                    <PlatformPatientResults
                      t={t}
                      importable={platformSearch.importable}
                      platformMatches={platformSearch.platformMatches}
                      requestingLinkId={platformSearch.requestingLinkId}
                      importingPatientId={platformSearch.importingPatientId}
                      onImportPatient={handleImportFromPlatform}
                      onRequestLink={platformSearch.requestPatientLink}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {selected ? children(selected) : null}
    </div>
  );
}
