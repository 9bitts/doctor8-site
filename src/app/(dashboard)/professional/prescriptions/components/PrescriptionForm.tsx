import { ArrowLeft, BookmarkPlus, Copy, FileText, LayoutTemplate, Loader2, Pill, Sparkles } from "lucide-react";
import PrescriptionMedItemForm, {
  type PrescriptionMedItemUpdateHandler,
} from "@/components/professional/prescriptions/PrescriptionMedItemForm";
import VideoConsultReturnBanner from "@/components/professional/VideoConsultReturnBanner";
import { isFreeTextPrescriptionItem } from "@/lib/prescription-item-kind";
import { templateHasFloralItems } from "@/lib/pics/reference-library/floral-starter-templates";
import type { PrescriptionsPortalConfig } from "@/lib/prescriptions-portal-config";
import { MedicationSearch, type MedicationSearchProps } from "./MedicationSearch";
import { PatientPicker, type PatientPickerProps } from "./PatientPicker";
import {
  controlInfo,
  isMedItemValid,
  medItemFieldErrors,
  rxFieldClass,
  type MedItem,
  type Prescription,
  type RxTemplate,
  type ControlledFormKind,
} from "./shared";

export type PrescriptionFormProps = {
  t: (k: string) => string;
  lang: string;
  cfg: PrescriptionsPortalConfig;
  consultReturnUrl: string | null;
  templateAppliedHint: boolean;
  voicePrefillActive: boolean;
  reuseSource: Prescription | null;
  rxTemplates: RxTemplate[];
  floralOnlyMode: boolean;
  allowFloral: boolean;
  medications: MedItem[];
  highlightIncompleteMeds: boolean;
  instructions: string;
  validDays: number;
  formError: string;
  saving: boolean;
  savingTemplate: boolean;
  patientPickerProps: PatientPickerProps;
  medicationSearchProps: MedicationSearchProps;
  onClose: () => void;
  onApplyRxTemplate: (tpl: RxTemplate) => void;
  onUpdateMedication: PrescriptionMedItemUpdateHandler;
  onOpenMnSearchForIndex: (index: number) => void;
  onSelectFloralProduct: (index: number, productId: string) => void;
  onRemoveMedication: (index: number) => void;
  onInstructionsChange: (value: string) => void;
  onValidDaysChange: (value: number) => void;
  onSaveAsRxTemplate: () => void;
  onSubmit: () => void;
  hasMixedPrescription?: boolean;
  hasMixedRegulatoryPrescription?: boolean;
  controlledFormKind?: ControlledFormKind;
};

export function PrescriptionForm({
  t,
  lang,
  cfg,
  consultReturnUrl,
  templateAppliedHint,
  voicePrefillActive,
  reuseSource,
  rxTemplates,
  floralOnlyMode,
  allowFloral,
  medications,
  highlightIncompleteMeds,
  instructions,
  validDays,
  formError,
  saving,
  savingTemplate,
  patientPickerProps,
  medicationSearchProps,
  onClose,
  onApplyRxTemplate,
  onUpdateMedication,
  onOpenMnSearchForIndex,
  onSelectFloralProduct,
  onRemoveMedication,
  onInstructionsChange,
  onValidDaysChange,
  onSaveAsRxTemplate,
  onSubmit,
  hasMixedPrescription = false,
  hasMixedRegulatoryPrescription = false,
  controlledFormKind = "simple",
}: PrescriptionFormProps) {
  const selectedPatient = patientPickerProps.selectedPatient;
  const todayLabel = patientPickerProps.todayLabel;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-24">
      <VideoConsultReturnBanner returnUrl={consultReturnUrl} patientName={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : undefined} lang={lang as "pt" | "en" | "es"} />
      <button onClick={onClose}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-500 transition font-medium">
        <ArrowLeft size={16} /> {t("rx.backToList")}
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {controlledFormKind === "B"
            ? t("rx.formTitleReceitaB")
            : controlledFormKind === "C"
              ? t("rx.formTitleReceitaC")
              : t("rx.formTitle")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {controlledFormKind === "B"
            ? t("rx.formSubtitleReceitaB")
            : controlledFormKind === "C"
              ? t("rx.formSubtitleReceitaC")
              : t("rx.formSubtitle")}
        </p>
      </div>

      {controlledFormKind === "B" && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-900">
          {t("rx.receitaBBanner")}
        </div>
      )}

      {controlledFormKind === "C" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-900">
          {t("rx.receitaCBanner")}
        </div>
      )}

      {templateAppliedHint && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 text-sm text-brand-700">
          {t("tmpl.templateAppliedHint")}
        </div>
      )}

      {hasMixedRegulatoryPrescription && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
          <p className="font-semibold">{t("rx.package.splitTitle")}</p>
          <p className="mt-1">{t("rx.package.splitHint")}</p>
        </div>
      )}

      {hasMixedPrescription && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
          {t("rx.mixedPrescriptionHint")}
        </div>
      )}

      {voicePrefillActive && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex items-start gap-3">
          <Sparkles size={18} className="text-violet-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-violet-800">
              {lang === "es" ? "Completado por asistente de voz" : lang === "en" ? "Prefilled by voice assistant" : "Preenchido pelo assistente de voz"}
            </p>
            <p className="text-xs text-violet-700 mt-1">
              {lang === "es" ? "Revise todos los campos antes de guardar." : lang === "en" ? "Review all fields before saving." : "Confira todos os campos antes de salvar."}
            </p>
          </div>
        </div>
      )}

      {reuseSource && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 flex items-start gap-3">
          <Copy size={18} className="text-brand-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-brand-700">{t("rx.reuseTitle")}</p>
            <p className="text-xs text-brand-600 mt-1">{t("rx.reuseHint")}</p>
          </div>
        </div>
      )}

      <>
        <PatientPicker {...patientPickerProps} todayLabel={todayLabel} />

        {rxTemplates.length > 0 && (() => {
          const visibleTemplates = floralOnlyMode
            ? rxTemplates.filter((tpl) => templateHasFloralItems(tpl.medications as MedItem[]))
            : rxTemplates;
          if (visibleTemplates.length === 0) return null;
          return (
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <LayoutTemplate size={16} className="text-brand-500" /> {t("tmpl.savedRxTemplates")}
            </p>
            <div className="flex flex-wrap gap-2">
              {visibleTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onApplyRxTemplate(tpl)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 text-slate-700"
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>
          );
        })()}

        <MedicationSearch {...medicationSearchProps} />

        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-4">
          <label className="text-sm font-semibold text-slate-800">{t("rx2.selectedMeds")}</label>
          {medications.length === 0 ? (
            <div className={`text-center py-8 rounded-xl border border-dashed ${
              highlightIncompleteMeds
                ? "bg-rose-50 border-rose-300"
                : "bg-slate-50 border-slate-200"
            }`}>
              <Pill size={28} className={`mx-auto mb-2 ${highlightIncompleteMeds ? "text-rose-300" : "text-slate-300"}`} />
              <p className={`text-sm ${highlightIncompleteMeds ? "text-rose-600" : "text-slate-400"}`}>{t("rx2.noMeds")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {medications.map((med, index) => {
                const kind = med.itemKind || "medication";
                const kindLabelMap: Partial<Record<typeof kind, string>> = {
                  device: t("rx.itemKind.device"),
                  phytotherapy: t("rx.itemKind.phytotherapy"),
                  floral: t("rx.itemKind.floral"),
                  homeopathy: t("rx.itemKind.homeopathy"),
                  aromatherapy: t("rx.itemKind.aromatherapy"),
                  apitherapy: t("rx.itemKind.apitherapy"),
                  cannabis: t("rx.itemKind.cannabis"),
                };
                const kindLabel = kindLabelMap[kind] ?? null;
                const fieldErrors = medItemFieldErrors(med);
                const itemInvalid = !isMedItemValid(med);
                const showErrors = highlightIncompleteMeds && itemInvalid;
                return (
                  <PrescriptionMedItemForm
                    key={index}
                    med={med}
                    index={index}
                    showErrors={showErrors}
                    fieldErrors={fieldErrors}
                    kindLabel={kindLabel}
                    controlInfo={controlInfo(med.prescriptionType)}
                    onUpdate={onUpdateMedication}
                    onOpenPhytoSearch={
                      isFreeTextPrescriptionItem(med.itemKind) &&
                      med.itemKind !== "device"
                        ? onOpenMnSearchForIndex
                        : undefined
                    }
                    onOpenFloralSearch={
                      med.itemKind === "floral" && allowFloral
                        ? onOpenMnSearchForIndex
                        : undefined
                    }
                    onFloralProductSelect={onSelectFloralProduct}
                    onRemove={onRemoveMedication}
                    t={t}
                    rxFieldClass={rxFieldClass}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">{t("rx.generalInstructions")}</label>
            <textarea value={instructions} onChange={(e) => onInstructionsChange(e.target.value)} rows={2}
              placeholder={t("rx.generalInstructionsPlaceholder")} className="rx-inp resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">{t("rx2.validFor")}</label>
            <select value={validDays} onChange={(e) => onValidDaysChange(Number(e.target.value))} className="rx-inp">
              <option value={7}>{t("rx.days7")}</option>
              <option value={30}>{t("rx.days30")}</option>
              <option value={60}>{t("rx.days60")}</option>
              <option value={90}>{t("rx.days90")}</option>
              <option value={180}>{t("rx.days180")}</option>
              <option value={365}>{t("rx.days365")}</option>
            </select>
          </div>
        </div>

        {formError && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{formError}</p>}
      </>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-30">
        <div className="max-w-3xl mx-auto flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition">
            {t("rx2.cancel")}
          </button>
          <button type="button" onClick={onSaveAsRxTemplate} disabled={savingTemplate || medications.length === 0}
            className="px-4 py-3.5 rounded-xl border border-brand-200 text-brand-600 font-semibold text-sm hover:bg-brand-50 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            title={t("tmpl.saveRxTemplate")}>
            {savingTemplate ? <Loader2 size={16} className="animate-spin" /> : <BookmarkPlus size={16} />}
            <span className="hidden sm:inline">{t("tmpl.saveRxTemplate")}</span>
          </button>
          <button type="button" onClick={onSubmit} disabled={saving}
            className="flex-[2] py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-500/20">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {saving ? t("rx2.saving") : t("rx2.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
