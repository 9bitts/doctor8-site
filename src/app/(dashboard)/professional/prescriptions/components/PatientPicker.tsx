import { AlertTriangle, ChevronRight, Loader2, User } from "lucide-react";
import { PatientNoAccountPanel } from "@/components/professional/emissions/PatientNoAccountPanel";
import NoPatientChartsEmptyState from "@/components/professional/NoPatientChartsEmptyState";
import type { Chart } from "@/components/professional/emissions/types";
import { keepFocusOnPointerDown } from "@/lib/combobox-interaction";
import type { PrescriptionsPortalConfig } from "@/lib/prescriptions-portal-config";
import { PlatformPatientResults } from "@/components/professional/PlatformPatientResults";
import {
  displayNameInitials,
  missingLabel,
  type ImportablePatient,
  type PlatformMatch,
  type PlatformRxTarget,
} from "./shared";

export type PatientPickerProps = {
  t: (k: string) => string;
  todayLabel: string;
  cfg: PrescriptionsPortalConfig;
  lockPatient: boolean;
  showPatientPicker: boolean;
  charts: Chart[];
  chartsLoading: boolean;
  importablePatients: ImportablePatient[];
  platformMatches: PlatformMatch[];
  selectedPatient: Chart | null;
  platformTarget: PlatformRxTarget | null;
  patientQuery: string;
  importingPatientId: string | null;
  requestingLinkId: string | null;
  onPatientQueryChange: (value: string) => void;
  onPatientPickerOpen: () => void;
  onPatientPickerClose: () => void;
  onSelectPatient: (chart: Chart) => void;
  onClearSelectedPatient: () => void;
  onClearPlatformTarget: () => void;
  onImportPatient: (item: ImportablePatient) => void;
  onRequestLink: (match: PlatformMatch) => void;
  onSelectPlatformForRx: (match: PlatformMatch) => void;
};

export function PatientPicker({
  t,
  todayLabel,
  cfg,
  lockPatient,
  showPatientPicker,
  charts,
  chartsLoading,
  importablePatients,
  platformMatches,
  selectedPatient,
  platformTarget,
  patientQuery,
  importingPatientId,
  requestingLinkId,
  onPatientQueryChange,
  onPatientPickerOpen,
  onPatientPickerClose,
  onSelectPatient,
  onClearSelectedPatient,
  onClearPlatformTarget,
  onImportPatient,
  onRequestLink,
  onSelectPlatformForRx,
}: PatientPickerProps) {
  const selectedMissing = selectedPatient?.missingForRx ?? [];

  return (
    <div className={`bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-4 ${showPatientPicker ? "relative z-50" : ""}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="text-sm font-semibold text-slate-800">{t("rx2.selectPatient")}</label>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{t("rx.documentDate")}:</span>
          <span className="font-medium text-slate-700">{todayLabel}</span>
        </div>
      </div>

      {selectedPatient ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-xl p-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center font-bold text-brand-500 text-sm shrink-0">
              {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm">{selectedPatient.firstName} {selectedPatient.lastName}</p>
              <p className="text-xs mt-0.5 text-slate-500">
                {selectedPatient.hasAccount ? t("rx2.hasAccountBadge") : t("rx2.noAccountBadge")}
              </p>
            </div>
            {!lockPatient && (
            <button onClick={onClearSelectedPatient}
              className="text-xs text-brand-500 hover:text-brand-700 font-semibold shrink-0">
              {t("rx2.changePatient")}
            </button>
            )}
          </div>
          <PatientNoAccountPanel patient={selectedPatient} />
        </div>
      ) : platformTarget ? (
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm shrink-0">
            {displayNameInitials(platformTarget.displayName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">{platformTarget.displayName}</p>
            <p className="text-xs text-slate-500">{t("link.platformRxHint")}</p>
            {platformTarget.linkStatus === "PENDING" && (
              <p className="text-xs text-amber-600 mt-0.5">{t("link.statusPending")}</p>
            )}
            {platformTarget.linkStatus === "ACCEPTED" && (
              <p className="text-xs text-brand-600 mt-0.5">{t("link.statusAccepted")}</p>
            )}
          </div>
          {!lockPatient && (
            <button
              onClick={onClearPlatformTarget}
              className="text-xs text-brand-500 hover:text-brand-700 font-semibold shrink-0"
            >
              {t("rx2.changePatient")}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={patientQuery}
              onChange={(e) => onPatientQueryChange(e.target.value)}
              onFocus={onPatientPickerOpen}
              onBlur={() => setTimeout(onPatientPickerClose, 150)}
              placeholder={t("rx2.searchPatient")}
              className="rx-inp rx-inp-pl-9" />
          </div>
          {showPatientPicker && (
            <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {chartsLoading ? (
                <div className="p-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" /> {t("common.loading")}
                </div>
              ) : charts.length === 0 && importablePatients.length === 0 && platformMatches.length === 0 ? (
                patientQuery.trim() ? (
                  <div className="p-4 text-center text-sm text-slate-500 space-y-1">
                    <p>{t("pat.searchEmpty")}</p>
                    {patientQuery.trim().length > 0 && patientQuery.trim().length < 3 && (
                      <p className="text-xs text-slate-400">{t("link.searchMinChars")}</p>
                    )}
                    {patientQuery.trim().length >= 3 && (
                      <p className="text-xs text-slate-400">{t("rx2.noPatientHint")}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-2">
                    <NoPatientChartsEmptyState variant="brand" compact />
                  </div>
                )
              ) : (
                <>
                  {charts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={keepFocusOnPointerDown}
                      onClick={() => onSelectPatient(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 transition text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs shrink-0">
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-slate-400">{c.hasAccount ? t("rx2.hasAccountBadge") : t("rx2.noAccountBadge")}</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 shrink-0" />
                    </button>
                  ))}
                  {!cfg.prescriptionsOnly && (
                    <PlatformPatientResults
                      t={t}
                      importable={importablePatients}
                      platformMatches={platformMatches}
                      requestingLinkId={requestingLinkId}
                      importingPatientId={importingPatientId}
                      showPrescribe
                      onImportPatient={onImportPatient}
                      onRequestLink={onRequestLink}
                      onSelectPlatformForRx={onSelectPlatformForRx}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {selectedPatient && selectedMissing.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Complete na ficha: <strong>{selectedMissing.map(missingLabel).join(", ")}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
