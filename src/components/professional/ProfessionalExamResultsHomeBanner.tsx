"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, FileCheck, Loader2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { PatientSearchCombobox } from "@/components/professional/PatientSearchCombobox";
import PatientExamResultsModal, {
  type PatientExamResultItem,
} from "@/components/professional/PatientExamResultsModal";
import type { Chart } from "@/components/professional/emissions/types";
import { chartActionUrl } from "@/lib/video-chart-nav";

type ChartDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  linkedUserId: string | null;
  hasAccount: boolean;
  documents: Array<{
    id: string;
    type: string;
    title: string;
    content: string | null;
    hasFile: boolean;
    attachmentCount?: number;
    sourceDocumentId: string | null;
    createdAt: string;
  }>;
};

export default function ProfessionalExamResultsHomeBanner() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [ownCharts, setOwnCharts] = useState<Chart[]>([]);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(null);
  const [loadingChart, setLoadingChart] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chartDetail, setChartDetail] = useState<ChartDetail | null>(null);

  const loadOwnCharts = useCallback(async () => {
    setChartsLoading(true);
    try {
      const res = await fetch("/api/professional/records", { credentials: "same-origin" });
      if (!res.ok) {
        setOwnCharts([]);
        return;
      }
      const data = await res.json();
      const records = (data.records || []) as Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        hasAccount: boolean;
        missingForRx?: string[];
      }>;
      setOwnCharts(
        records.map((r) => ({
          id: r.id,
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
          hasAccount: r.hasAccount,
          missingForRx: r.missingForRx,
        })),
      );
    } catch {
      setOwnCharts([]);
    } finally {
      setChartsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (pickerOpen) void loadOwnCharts();
  }, [pickerOpen, loadOwnCharts]);

  async function openExamFlowForPatient(patient: Chart) {
    setSelectedPatient(patient);
    setLoadingChart(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/professional/records/${patient.id}`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) {
        setLoadError(t("prodash.examBanner.loadError"));
        return;
      }
      setChartDetail(data as ChartDetail);
      setPickerOpen(false);
    } catch {
      setLoadError(t("prodash.examBanner.loadError"));
    } finally {
      setLoadingChart(false);
    }
  }

  function closeAll() {
    setPickerOpen(false);
    setSelectedPatient(null);
    setChartDetail(null);
    setLoadError(null);
  }

  const results: PatientExamResultItem[] = (chartDetail?.documents || [])
    .filter((d) => d.type === "EXAM_RESULT" && !!d.sourceDocumentId)
    .map((d) => ({
      id: d.id,
      title: d.title,
      content: d.content,
      hasFile: d.hasFile,
      attachmentCount: d.attachmentCount,
      createdAt: d.createdAt,
    }));

  const patientName = chartDetail
    ? `${chartDetail.firstName} ${chartDetail.lastName}`.trim()
    : "";

  const chartReturnUrl = "/professional";
  const requestExamHref = chartDetail
    ? chartActionUrl("/professional/prescriptions", chartDetail.id, {
        view: "exam",
        returnUrl: chartReturnUrl,
      })
    : "/professional/prescriptions?view=exam";

  const messageHref =
    chartDetail?.linkedUserId
      ? `/professional/messages?with=${chartDetail.linkedUserId}&returnUrl=${encodeURIComponent(chartReturnUrl)}`
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setLoadError(null);
          setPickerOpen(true);
        }}
        className="w-full text-left block rounded-2xl border border-brand-200 bg-brand-50 shadow-sm overflow-hidden transition hover:shadow-md hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <div className="p-5 sm:p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-brand-100">
            <FileCheck size={28} className="text-brand-600" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-brand-900">{t("prodash.examBanner.title")}</p>
            <p className="text-sm mt-1 text-brand-700">{t("prodash.examBanner.desc")}</p>
          </div>
          <div className="flex items-center gap-1 text-sm font-semibold shrink-0 text-brand-700">
            <span className="hidden sm:inline">{t("prodash.examBanner.cta")}</span>
            <span className="sm:hidden">{t("prodash.examBanner.ctaShort")}</span>
            <ChevronRight size={16} aria-hidden />
          </div>
        </div>
      </button>

      {pickerOpen && !chartDetail && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exam-banner-picker-title"
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90dvh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <h2 id="exam-banner-picker-title" className="font-bold text-slate-800 flex items-center gap-2">
                <FileCheck size={18} className="text-brand-500" aria-hidden />
                {t("prodash.examBanner.pickerTitle")}
              </h2>
              <button
                type="button"
                onClick={closeAll}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                aria-label={t("examResults.dismiss")}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <p className="text-sm text-slate-600">{t("prodash.examBanner.pickerHint")}</p>
              <PatientSearchCombobox
                t={t}
                ownCharts={ownCharts}
                chartsLoading={chartsLoading}
                selectedPatient={selectedPatient}
                onSelectPatient={(patient) => {
                  if (patient) void openExamFlowForPatient(patient);
                  else setSelectedPatient(null);
                }}
                elevated
              />
              {loadingChart && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                  {t("prodash.examBanner.loading")}
                </div>
              )}
              {loadError && <p className="text-sm text-rose-600">{loadError}</p>}
            </div>
          </div>
        </div>
      )}

      {chartDetail && (
        <PatientExamResultsModal
          results={results}
          requestExamHref={requestExamHref}
          messageHref={messageHref}
          chartId={chartDetail.id}
          patientName={patientName}
          patientPhone={chartDetail.phone}
          patientCountry={chartDetail.country}
          patientEmail={chartDetail.email}
          lang={lang}
          t={t}
          onClose={closeAll}
          onRegisterManually={() => {
            closeAll();
            router.push(`/professional/patients/${chartDetail.id}?viewExamResults=1`);
          }}
          onOpenResult={(id) => {
            closeAll();
            router.push(`/professional/patients/${chartDetail.id}?recordId=${encodeURIComponent(id)}`);
          }}
        />
      )}
    </>
  );
}
