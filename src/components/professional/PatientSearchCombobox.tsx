"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Loader2, User } from "lucide-react";
import type { Chart } from "@/components/professional/emissions/types";
import { PlatformPatientResults } from "@/components/professional/PlatformPatientResults";
import NoPatientChartsEmptyState from "@/components/professional/NoPatientChartsEmptyState";
import { PatientNoAccountPanel } from "@/components/professional/emissions/PatientNoAccountPanel";
import { keepFocusOnPointerDown } from "@/lib/combobox-interaction";
import { filterPatientCharts } from "@/lib/patient-chart-search";
import { useProfessionalPatientSearch } from "@/hooks/useProfessionalPatientSearch";
import type { ImportablePatient, PlatformMatch } from "@/app/(dashboard)/professional/prescriptions/components/shared";

export type PatientSearchComboboxProps = {
  t: (k: string) => string;
  ownCharts: Chart[];
  chartsLoading?: boolean;
  selectedPatient: Chart | null;
  onSelectPatient: (patient: Chart | null) => void;
  lockPatient?: boolean;
  showPrescribe?: boolean;
  onSelectPlatformForRx?: (match: PlatformMatch) => void;
  elevated?: boolean;
};

function PatientChip({
  patient,
  t,
  onClear,
}: {
  patient: Chart;
  t: (k: string) => string;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-xl p-3">
      <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center font-bold text-brand-500 text-sm">
        {patient.firstName[0]}{patient.lastName[0]}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-sm">{patient.firstName} {patient.lastName}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {patient.hasAccount ? t("rx2.hasAccountBadge") : t("rx2.noAccountBadge")}
        </p>
      </div>
      {onClear && (
        <button type="button" onClick={onClear} className="text-xs text-brand-500 font-semibold">
          {t("rx2.changePatient")}
        </button>
      )}
    </div>
  );
}

export function PatientSearchCombobox({
  t,
  ownCharts,
  chartsLoading = false,
  selectedPatient,
  onSelectPatient,
  lockPatient = false,
  showPrescribe = false,
  onSelectPlatformForRx,
  elevated = false,
}: PatientSearchComboboxProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const search = useProfessionalPatientSearch();

  const ownFiltered = useMemo(
    () => (search.query.trim() ? filterPatientCharts(ownCharts, search.query, ownCharts.length) : ownCharts),
    [ownCharts, search.query],
  );

  const chartResults = search.query.trim() ? search.records : ownFiltered;
  const showPlatform = search.query.trim().length >= search.minPlatformChars;

  async function handleImport(item: ImportablePatient) {
    const chart = await search.importPatient(item);
    if (chart) {
      onSelectPatient(chart);
      setPickerOpen(false);
      search.setQuery("");
    }
  }

  return (
    <div className={`bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-4 ${elevated || pickerOpen ? "relative z-50" : ""}`}>
      <label className="text-sm font-semibold text-slate-800">{t("rx2.selectPatient")}</label>
      {selectedPatient ? (
        <div className="space-y-3">
          <PatientChip
            patient={selectedPatient}
            t={t}
            onClear={lockPatient ? undefined : () => onSelectPatient(null)}
          />
          <PatientNoAccountPanel patient={selectedPatient} />
        </div>
      ) : lockPatient ? (
        <p className="text-sm text-slate-500">{t("rx2.noPatientFound")}</p>
      ) : (
        <>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search.query}
              onChange={(e) => search.setQuery(e.target.value)}
              onFocus={() => setPickerOpen(true)}
              onBlur={() => setTimeout(() => setPickerOpen(false), 150)}
              placeholder={t("rx2.searchPatient")}
              className="rx-inp rx-inp-pl-9"
            />
          </div>
          {pickerOpen && (
            <div className="border rounded-xl divide-y max-h-64 overflow-y-auto bg-white shadow-sm">
              {(chartsLoading || search.loading) ? (
                <div className="p-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" /> {t("common.loading")}
                </div>
              ) : chartResults.length === 0 && !showPlatform && search.importable.length === 0 && search.platformMatches.length === 0 ? (
                ownCharts.length === 0 ? (
                  <div className="p-4">
                    <NoPatientChartsEmptyState variant="brand" compact />
                  </div>
                ) : (
                  <p className="p-4 text-center text-sm text-slate-500">{t("pat.searchEmpty")}</p>
                )
              ) : (
                <>
                  {chartResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={keepFocusOnPointerDown}
                      onClick={() => {
                        onSelectPatient(c);
                        setPickerOpen(false);
                        search.setQuery("");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 text-left"
                    >
                      <span className="font-medium text-sm">{c.firstName} {c.lastName}</span>
                      <span className="text-xs text-slate-400 ml-auto mr-1">
                        {c.hasAccount ? t("rx2.hasAccountBadge") : t("rx2.noAccountBadge")}
                      </span>
                      <ChevronRight size={14} className="text-slate-300 shrink-0" />
                    </button>
                  ))}
                  {showPlatform && (
                    <PlatformPatientResults
                      t={t}
                      importable={search.importable}
                      platformMatches={search.platformMatches}
                      requestingLinkId={search.requestingLinkId}
                      importingPatientId={search.importingPatientId}
                      showPrescribe={showPrescribe}
                      onImportPatient={handleImport}
                      onRequestLink={search.requestPatientLink}
                      onSelectPlatformForRx={onSelectPlatformForRx}
                    />
                  )}
                </>
              )}
              {search.query.trim().length > 0 && search.query.trim().length < search.minPlatformChars && (
                <p className="p-3 text-xs text-slate-400">{t("link.searchMinChars")}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
