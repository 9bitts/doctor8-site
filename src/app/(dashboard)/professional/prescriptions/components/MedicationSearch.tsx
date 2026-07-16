import { FileText, Loader2, Pill, Plus, Search, X } from "lucide-react";
import DrugSearchResults, { type DrugSearchResult } from "@/components/professional/prescriptions/DrugSearchResults";
import DrugLeafletPanel from "@/components/professional/prescriptions/DrugLeafletPanel";
import MedicinaNaturalSearchResults from "@/components/medicina-natural-catalog/MedicinaNaturalSearchResults";
import { DRUG_COUNTRIES, type DrugCountryCode } from "@/lib/drug-countries";
import type { DrugLeafletTarget } from "@/lib/drug-leaflet/types";
import {
  mnCatalogSearchI18nKey,
  mnSearchModalTitleI18nKey,
  type PrescriptionItemSearchMode,
} from "@/lib/medicina-natural-catalog/prescription-search";
import type { MedicinaNaturalListItem } from "@/lib/medicina-natural-catalog/search-server";
import type { PrescriptionsPortalConfig } from "@/lib/prescriptions-portal-config";
import { controlInfo, MN_RX_SEARCH_TABS, type MnAddItemKind, type ControlledFormKind, isControlledRxFormMode } from "./shared";

export type MedicationSearchProps = {
  t: (k: string) => string;
  cfg: PrescriptionsPortalConfig;
  canPrescribeCannabis?: boolean;
  controlledFormKind?: ControlledFormKind;
  drugQuery: string;
  drugResults: DrugSearchResult[];
  drugSearching: boolean;
  drugSearchDone: boolean;
  drugSearchModalOpen: boolean;
  drugCountry: DrugCountryCode;
  itemSearchMode: PrescriptionItemSearchMode;
  mnSearchResults: MedicinaNaturalListItem[];
  floralOnlyMode: boolean;
  mnCatalogSearch: boolean;
  mnSearchModeForUi: PrescriptionItemSearchMode;
  freeTextMode: boolean;
  bulkPasteText: string;
  showBulkPaste: boolean;
  onDrugQueryChange: (value: string) => void;
  onSearchDrugs: () => void;
  onCloseDrugSearchModal: () => void;
  onAddManual: () => void;
  onStartFreeTextPrescription: () => void;
  onToggleBulkPaste: () => void;
  onBulkPasteTextChange: (value: string) => void;
  onImportBulkMedications: () => void;
  onApplyFreeTextPrescription: () => void;
  onAddSpecialItem: (kind: "device" | MnAddItemKind) => void;
  onSetItemSearchMode: (mode: PrescriptionItemSearchMode) => void;
  onSetFloralOnlyMode: (value: boolean) => void;
  onSetDrugCountry: (code: DrugCountryCode) => void;
  onClearDrugSearch: () => void;
  onAddDrug: (drug: DrugSearchResult) => void;
  onMnListItemSelect: (item: MedicinaNaturalListItem) => void;
  leafletTarget: DrugLeafletTarget | null;
  onViewDrugLeaflet: (drug: DrugSearchResult) => void;
  onViewMnLeaflet: (item: MedicinaNaturalListItem) => void;
  onCloseLeafletPanel: () => void;
  onInsertLeafletPosology: (excerpt: string) => void;
};

export function MedicationSearch({
  t,
  cfg,
  canPrescribeCannabis = false,
  controlledFormKind = "simple",
  drugQuery,
  drugResults,
  drugSearching,
  drugSearchDone,
  drugSearchModalOpen,
  drugCountry,
  itemSearchMode,
  mnSearchResults,
  floralOnlyMode,
  mnCatalogSearch,
  mnSearchModeForUi,
  freeTextMode,
  bulkPasteText,
  showBulkPaste,
  onDrugQueryChange,
  onSearchDrugs,
  onCloseDrugSearchModal,
  onAddManual,
  onStartFreeTextPrescription,
  onToggleBulkPaste,
  onBulkPasteTextChange,
  onImportBulkMedications,
  onApplyFreeTextPrescription,
  onAddSpecialItem,
  onSetItemSearchMode,
  onSetFloralOnlyMode,
  onSetDrugCountry,
  onClearDrugSearch,
  onAddDrug,
  onMnListItemSelect,
  leafletTarget,
  onViewDrugLeaflet,
  onViewMnLeaflet,
  onCloseLeafletPanel,
  onInsertLeafletPosology,
}: MedicationSearchProps) {
  const isControlledForm = isControlledRxFormMode(controlledFormKind);

  return (
    <>
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-800">{t("rx2.addItem")}</label>
          {isControlledForm ? (
            <>
              <p className="text-xs text-slate-500">
                {controlledFormKind === "B"
                  ? t("rx.controlledSearchHintB")
                  : t("rx.controlledSearchHintC")}
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-500 bg-brand-50 text-brand-700 text-sm font-medium ring-2 ring-brand-500/20">
                <span className="text-lg leading-none" aria-hidden>🇧🇷</span>
                {t("rx.controlledCatalogBrOnly")}
              </div>
            </>
          ) : cfg.phytoOnly ? (
            <>
              <div className="flex flex-wrap gap-2">
                {MN_RX_SEARCH_TABS.filter(
                  (tab) =>
                    (!tab.floralOnly || cfg.allowFloral) &&
                    (!tab.cannabisOnly || canPrescribeCannabis),
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active =
                    itemSearchMode === tab.mode &&
                    (tab.mode !== "floral" || floralOnlyMode);
                  return (
                    <button
                      key={tab.mode}
                      type="button"
                      onClick={() => {
                        onSetItemSearchMode(tab.mode);
                        onSetFloralOnlyMode(tab.mode === "floral");
                        onClearDrugSearch();
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${
                        active
                          ? tab.activeClass
                          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                      }`}
                    >
                      <Icon size={16} /> {t(tab.labelKey)}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">{t("rx.phytoSearchHint")}</p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSetItemSearchMode("medication");
                    onSetFloralOnlyMode(false);
                    onClearDrugSearch();
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${
                    itemSearchMode === "medication"
                      ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand-200"
                  }`}
                >
                  <Pill size={16} /> {t("rx.searchMode.medication")}
                </button>
                {MN_RX_SEARCH_TABS.filter(
                  (tab) =>
                    (!tab.floralOnly || cfg.allowFloral) &&
                    (!tab.cannabisOnly || canPrescribeCannabis),
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active =
                    itemSearchMode === tab.mode &&
                    (tab.mode !== "floral" || floralOnlyMode);
                  return (
                    <button
                      key={tab.mode}
                      type="button"
                      onClick={() => {
                        onSetItemSearchMode(tab.mode);
                        onSetFloralOnlyMode(tab.mode === "floral");
                        onClearDrugSearch();
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${
                        active
                          ? tab.activeClass
                          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                      }`}
                    >
                      <Icon size={16} /> {t(tab.labelKey)}
                    </button>
                  );
                })}
              </div>
              {itemSearchMode === "medication" && (
                <>
                  <p className="text-xs text-slate-500">{t("rx2.countryPick")}</p>
                  <div className="flex flex-wrap gap-2">
                    {DRUG_COUNTRIES.map((c) => {
                      const selected = drugCountry === c.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            onSetDrugCountry(c.code);
                            onClearDrugSearch();
                          }}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${
                            selected
                              ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20"
                              : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50/50"
                          }`}
                          aria-pressed={selected}
                        >
                          <span className="text-lg leading-none" aria-hidden>{c.flag}</span>
                          {t(c.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {itemSearchMode !== "medication" && (
                <p className="text-xs text-slate-500">{t("rx.phytoSearchHint")}</p>
              )}
            </>
          )}
        </div>

        <div className={`rounded-xl border-2 border-dashed p-4 space-y-3 ${
          controlledFormKind === "B"
            ? "border-blue-200 bg-blue-50/50"
            : controlledFormKind === "C"
              ? "border-red-200 bg-red-50/50"
              : "border-brand-200 bg-brand-50/50"
        }`}>
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-brand-700">
            <Search size={16} aria-hidden />
            {mnCatalogSearch
              ? t(mnCatalogSearchI18nKey(mnSearchModeForUi, floralOnlyMode))
              : t("pharmacy.searchButton")}
          </p>
          <div className="flex items-center rounded-xl border border-brand-200 bg-white focus-within:border-brand-400 focus-within:shadow-[0_0_0_3px_rgba(33,106,134,.12)]">
            <input
              type="text"
              value={drugQuery}
              onChange={(e) => onDrugQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSearchDrugs();
                }
              }}
              placeholder={
                isControlledForm
                  ? t("rx.controlledSearchPlaceholder")
                  : mnCatalogSearch
                    ? t(mnCatalogSearchI18nKey(mnSearchModeForUi, floralOnlyMode))
                    : t("rx2.searchDrug")
              }
              className="flex-1 min-w-0 border-0 bg-transparent outline-none py-3 pl-3.5 pr-2 text-sm text-slate-800 placeholder:text-slate-400 rounded-xl"
            />
            {drugSearching ? (
              <Loader2 size={15} className="shrink-0 mr-3 text-slate-400 animate-spin" />
            ) : (
              <button
                type="button"
                onClick={onSearchDrugs}
                disabled={drugQuery.trim().length < 2}
                className="shrink-0 mr-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("pubSearch.search")}
              </button>
            )}
          </div>
        </div>

        {!isControlledForm && (
          <button type="button" onClick={onAddManual}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium text-sm transition">
            <Plus size={16} /> {t("rx2.addManual")}
          </button>
        )}

        {!isControlledForm && (
        <>
        <button type="button" onClick={onStartFreeTextPrescription}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition">
          <FileText size={16} /> {t("rx.freeTextStart")}
        </button>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">{t("rx.bulkPaste.title")}</p>
            <button
              type="button"
              onClick={onToggleBulkPaste}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 shrink-0"
            >
              {showBulkPaste ? t("rx.bulkPaste.hide") : t("rx.bulkPaste.show")}
            </button>
          </div>
          {showBulkPaste && (
            <>
              <textarea
                value={bulkPasteText}
                onChange={(e) => onBulkPasteTextChange(e.target.value)}
                rows={6}
                placeholder={freeTextMode ? t("rx.bulkPaste.devicePlaceholder") : t("rx.bulkPaste.placeholder")}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 resize-y bg-white"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onImportBulkMedications}
                  disabled={!bulkPasteText.trim()}
                  className="flex-1 min-w-[140px] py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {t("rx.bulkPaste.addToList")}
                </button>
                <button
                  type="button"
                  onClick={onApplyFreeTextPrescription}
                  disabled={!bulkPasteText.trim()}
                  className="flex-1 min-w-[140px] py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm disabled:opacity-50"
                >
                  {t("rx.bulkPaste.replaceList")}
                </button>
              </div>
            </>
          )}
        </div>
        {!cfg.phytoOnly && !isControlledForm && (
          <div className="grid sm:grid-cols-2 gap-2">
            <button type="button" onClick={() => onAddSpecialItem("device")}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition">
              <Plus size={14} /> {t("rx.addDevice")}
            </button>
            <button type="button" onClick={() => onAddSpecialItem("phytotherapy")}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 font-medium text-sm transition">
              <Plus size={14} /> {t("rx.addPhytotherapy")}
            </button>
            {cfg.allowFloral && (
              <button type="button" onClick={() => onAddSpecialItem("floral")}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-pink-200 bg-pink-50/50 hover:bg-pink-50 text-pink-800 font-medium text-sm transition sm:col-span-2">
                <Plus size={14} /> {t("rx.addFloral")}
              </button>
            )}
          </div>
        )}
        </>
        )}
        {cfg.phytoOnly && !isControlledForm && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {MN_RX_SEARCH_TABS.filter(
              (tab) =>
                (!tab.floralOnly || cfg.allowFloral) &&
                (!tab.cannabisOnly || canPrescribeCannabis),
            ).map((tab) => (
              <button
                key={tab.mode}
                type="button"
                onClick={() => onAddSpecialItem(tab.mode)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 font-medium text-sm transition"
              >
                <Plus size={14} /> {t(tab.labelKey)}
              </button>
            ))}
          </div>
        )}
        {!isControlledForm && (
          <p className="text-xs text-slate-400 text-center -mt-2">{t("rx.manualAlways")}</p>
        )}
      </div>

      {drugSearchModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-2 sm:p-4"
          onClick={onCloseDrugSearchModal}
        >
          <div
            className={`bg-white rounded-2xl shadow-xl w-full flex flex-col overflow-hidden ${
              leafletTarget
                ? "max-w-5xl h-[92dvh] max-h-[92dvh]"
                : "max-w-lg max-h-[90vh]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100 shrink-0">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900">
                  {mnCatalogSearch
                    ? t(mnSearchModalTitleI18nKey(mnSearchModeForUi, floralOnlyMode))
                    : t("rx2.drugSearchModalTitle")}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5 truncate">&ldquo;{drugQuery.trim()}&rdquo;</p>
              </div>
              <button
                type="button"
                onClick={onCloseDrugSearchModal}
                className="text-slate-400 hover:text-slate-600 shrink-0 p-1 rounded-lg hover:bg-slate-100 transition"
                aria-label={t("rx2.cancel")}
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
              <div
                className={`p-4 overflow-y-auto overscroll-contain flex-1 min-h-0 lg:max-w-md lg:shrink-0 lg:border-r lg:border-slate-100 ${
                  leafletTarget ? "max-lg:hidden" : ""
                }`}
              >
                {drugSearching ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 size={24} className="animate-spin text-brand-400" />
                    <p className="text-sm text-slate-500">{t("rx2.searchingDrugs")}</p>
                  </div>
                ) : mnSearchResults.length > 0 ? (
                  <MedicinaNaturalSearchResults
                    results={mnSearchResults}
                    onSelect={onMnListItemSelect}
                    onViewLeaflet={onViewMnLeaflet}
                    className="max-h-none overflow-visible"
                    t={t}
                  />
                ) : drugResults.length > 0 ? (
                  <DrugSearchResults
                    results={drugResults}
                    onSelect={onAddDrug}
                    onViewLeaflet={onViewDrugLeaflet}
                    controlInfo={mnCatalogSearch ? () => null : controlInfo}
                    className="max-h-none overflow-visible"
                    viewLeafletLabel={t("rx.leaflet.viewButton")}
                    addLabel={t("rx.leaflet.addButton")}
                  />
                ) : drugSearchDone ? (
                  <p className="text-sm text-slate-500 text-center py-8 px-4 border border-slate-100 rounded-xl bg-slate-50">
                    {isControlledForm
                      ? t("rx.controlledNoResults")
                      : t("rx2.noDrugsFound")}
                  </p>
                ) : null}
              </div>

              <div
                className={
                  leafletTarget
                    ? "max-lg:absolute max-lg:inset-0 max-lg:z-10 max-lg:bg-white max-lg:shadow-[-8px_0_24px_rgba(15,23,42,0.08)] flex min-h-0 flex-col flex-1 lg:min-w-[320px]"
                    : "hidden lg:flex lg:min-h-0 lg:flex-1 lg:min-w-[280px] lg:flex-col"
                }
              >
                <DrugLeafletPanel
                  target={leafletTarget}
                  apiBase={cfg.apiBase}
                  t={t}
                  onClose={onCloseLeafletPanel}
                  onInsertPosology={onInsertLeafletPosology}
                  className="flex-1 min-h-0 w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
