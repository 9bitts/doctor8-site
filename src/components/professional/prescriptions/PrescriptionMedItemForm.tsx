import { AlertCircle, Trash2 } from "lucide-react";
import {
  FLORAL_CATEGORY_LABEL_KEYS,
  FLORAL_REFERENCE_PRODUCTS,
  floralProductByValue,
  type FloralProductCategory,
} from "@/lib/pics/reference-library/floral-products";
import { isFreeTextPrescriptionItem, type PrescriptionItemKind } from "@/lib/prescription-item-kind";
import { mnFreeTextPlaceholderI18nKey } from "@/lib/medicina-natural-catalog/prescription-search";

export type PrescriptionMedItem = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  continuousUse?: boolean;
  presentation?: string;
  pharmaceuticalForm?: string;
  controlled?: boolean;
  prescriptionType?: string | null;
  itemKind?: PrescriptionItemKind;
  phytoProductId?: string;
  mnSlug?: string;
  renisus?: boolean;
  floralProductId?: string;
};

export type ControlInfo = {
  tarja: "preta" | "vermelha";
  label: string;
  receita: string;
} | null;

interface PrescriptionMedItemFormProps {
  med: PrescriptionMedItem;
  index: number;
  showErrors: boolean;
  fieldErrors: { name: boolean; dosage: boolean; frequency: boolean };
  kindLabel: string | null;
  controlInfo: ControlInfo;
  onUpdate: (
    index: number,
    field: keyof PrescriptionMedItem,
    value: PrescriptionMedItem[keyof PrescriptionMedItem],
  ) => void;
  onPhytoProductSelect?: (index: number, productId: string) => void;
  onOpenPhytoSearch?: (index: number) => void;
  onOpenFloralSearch?: (index: number) => void;
  onFloralProductSelect?: (index: number, productId: string) => void;
  onRemove: (index: number) => void;
  t: (key: string) => string;
  rxFieldClass: (invalid: boolean) => string;
}

const FLORAL_CATEGORIES: FloralProductCategory[] = [
  "bach",
  "bach_rescue",
  "saint_germain",
  "saint_germain_formula",
  "custom",
];

export default function PrescriptionMedItemForm({
  med,
  index,
  showErrors,
  fieldErrors,
  kindLabel,
  controlInfo: ci,
  onUpdate,
  onOpenPhytoSearch,
  onOpenFloralSearch,
  onFloralProductSelect,
  onRemove,
  t,
  rxFieldClass,
}: PrescriptionMedItemFormProps) {
  const kind = med.itemKind || "medication";
  const isContinuousUse = med.continuousUse || med.frequency === "Continuous use";

  if (isFreeTextPrescriptionItem(kind)) {
    return (
      <div
        className={`rounded-xl p-4 space-y-3 border ${
          showErrors
            ? "bg-rose-50/60 border-rose-300 ring-1 ring-rose-200"
            : "bg-slate-50 border-slate-200"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-2">
            {kindLabel && (
              <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-50 text-accent-700 border border-accent-200">
                {kindLabel}
              </span>
            )}
            {(kind === "phytotherapy" ||
              kind === "homeopathy" ||
              kind === "aromatherapy" ||
              kind === "apitherapy") &&
              onOpenPhytoSearch && (
              <button
                type="button"
                onClick={() => onOpenPhytoSearch(index)}
                className={`inline-flex text-xs font-semibold ${
                  kind === "phytotherapy"
                    ? "text-emerald-700 hover:text-emerald-900"
                    : "text-brand-700 hover:text-brand-900"
                }`}
              >
                {kind === "phytotherapy" ? t("rx.phytoBrowseCatalog") : t("rx.mnBrowseCatalog")}
              </button>
            )}
            <label
              className={`text-xs font-medium block ${
                showErrors && fieldErrors.name ? "text-rose-700" : "text-slate-600"
              }`}
            >
              {t("rx.freeTextItemLabel")}
            </label>
            <textarea
              value={med.name}
              onChange={(e) => onUpdate(index, "name", e.target.value)}
              rows={5}
              placeholder={
                mnFreeTextPlaceholderI18nKey(kind)
                  ? t(mnFreeTextPlaceholderI18nKey(kind)!)
                  : t("rx.bulkPaste.devicePlaceholder")
              }
              className={`w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 resize-y bg-white${rxFieldClass(showErrors && fieldErrors.name)}`}
            />
          </div>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-red-400 hover:text-red-600 shrink-0 p-1"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl p-4 space-y-3 border ${
        showErrors
          ? "bg-rose-50/60 border-rose-300 ring-1 ring-rose-200"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-2">
          {kindLabel && (
            <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-50 text-accent-700 border border-accent-200">
              {kindLabel}
            </span>
          )}
          {kind === "floral" && onOpenFloralSearch && (
            <button
              type="button"
              onClick={() => onOpenFloralSearch(index)}
              className="inline-flex text-xs font-semibold text-pink-700 hover:text-pink-900"
            >
              {t("rx.floralBrowseCatalog")}
            </button>
          )}
          {kind === "floral" && onFloralProductSelect && (
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                {t("rx.floralProductSelect")}
              </label>
              <select
                value={med.floralProductId || ""}
                onChange={(e) => onFloralProductSelect(index, e.target.value)}
                className="rx-inp-sm"
              >
                <option value="">{t("rx.floralProductPlaceholder")}</option>
                {FLORAL_CATEGORIES.map((cat) => {
                  const products = FLORAL_REFERENCE_PRODUCTS.filter((p) => p.category === cat);
                  if (products.length === 0) return null;
                  return (
                    <optgroup key={cat} label={t(FLORAL_CATEGORY_LABEL_KEYS[cat])}>
                      {products.map((p) => (
                        <option key={p.value} value={p.value}>
                          {t(p.labelKey)}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              {med.floralProductId && floralProductByValue(med.floralProductId) && (
                <p className="text-[11px] text-pink-700 mt-1 leading-relaxed">
                  {t(floralProductByValue(med.floralProductId)!.indicationKey)}
                </p>
              )}
            </div>
          )}
          <label
            className={`text-xs font-medium block mb-1 ${
              showErrors && fieldErrors.name ? "text-rose-700" : "text-slate-600"
            }`}
          >
            {t("rx2.manualName")}
          </label>
          <input
            type="text"
            value={med.name}
            onChange={(e) => onUpdate(index, "name", e.target.value)}
            placeholder={t("rx2.manualNamePlaceholder")}
            className={`rx-inp-sm${rxFieldClass(showErrors && fieldErrors.name)}`}
          />
          {med.controlled && ci && (
            <p className="text-[11px] text-red-700 bg-red-50 rounded-md px-2 py-1 inline-flex items-center gap-1">
              <AlertCircle size={11} />
              {ci.receita}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-red-400 hover:text-red-600 shrink-0 p-1"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {kind === "medication" && (
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600 block mb-1">
              {"Forma farmac\u00eautica"}
            </label>
            <input
              type="text"
              value={med.pharmaceuticalForm || ""}
              onChange={(e) => onUpdate(index, "pharmaceuticalForm", e.target.value)}
              placeholder={"Ex.: Comprimido, Xarope (frasco)"}
              className="rx-inp-sm"
            />
          </div>
        )}
        {kind === "floral" && (
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600 block mb-1">
              {t("it.tpl.florais.preparation")}
            </label>
            <select
              value={med.pharmaceuticalForm || ""}
              onChange={(e) => onUpdate(index, "pharmaceuticalForm", e.target.value)}
              className="rx-inp-sm"
            >
              <option value="">{t("med.freqSelect")}</option>
              <option value="gotas_30ml">{t("it.tpl.florais.presentation.floral")}</option>
              <option value="spray">{t("it.tpl.florais.presentation.spray")}</option>
              <option value="estoque">{t("it.tpl.florais.presentation.stock")}</option>
            </select>
          </div>
        )}
        <div>
          <label
            className={`text-xs font-medium block mb-1 ${
              showErrors && fieldErrors.dosage ? "text-rose-700" : "text-slate-600"
            }`}
          >
            {t("rx2.dosageLabel")}
            {kind === "medication" ? " *" : ` (${t("rx.fieldOptional")})`}
          </label>
          <input
            type="text"
            value={med.dosage}
            onChange={(e) => onUpdate(index, "dosage", e.target.value)}
            placeholder={kind === "floral" ? "4 gotas, 4x/dia" : t("rx.medDosagePlaceholder")}
            className={`rx-inp-sm${rxFieldClass(showErrors && fieldErrors.dosage)}`}
          />
        </div>
        <div>
          <label
            className={`text-xs font-medium block mb-1 ${
              showErrors && fieldErrors.frequency ? "text-rose-700" : "text-slate-600"
            }`}
          >
            {t("rx2.frequencyLabel")}
            {kind === "medication" ? " *" : ` (${t("rx.fieldOptional")})`}
          </label>
          <select
            value={med.frequency}
            onChange={(e) => onUpdate(index, "frequency", e.target.value)}
            className={`rx-inp-sm${rxFieldClass(showErrors && fieldErrors.frequency)}`}
          >
            <option value="">{t("med.freqSelect")}</option>
            <option value="Once daily">{t("med.freqOnce")}</option>
            <option value="Twice daily">{t("med.freqTwice")}</option>
            <option value="Three times daily">{t("med.freqThree")}</option>
            <option value="Every 8 hours">{t("med.freq8h")}</option>
            <option value="Every 12 hours">{t("med.freq12h")}</option>
            <option value="As needed">{t("med.freqAsNeeded")}</option>
            <option value="Weekly">{t("med.freqWeekly")}</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">
            {t("rx2.durationLabel")}
          </label>
          <input
            type="text"
            value={med.duration}
            onChange={(e) => onUpdate(index, "duration", e.target.value)}
            placeholder={t("rx.medDurationPlaceholder")}
            disabled={isContinuousUse}
            className={`rx-inp-sm${isContinuousUse ? " opacity-60" : ""}`}
          />
          <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isContinuousUse}
              onChange={(e) => onUpdate(index, "continuousUse", e.target.checked)}
              className="rounded border-slate-300 text-brand-500 focus:ring-brand-200"
            />
            <span className="text-xs font-medium text-slate-700">{t("med.freqContinuous")}</span>
          </label>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">
            {t("rx2.instructionsLabel")}
          </label>
          <input
            type="text"
            value={med.instructions}
            onChange={(e) => onUpdate(index, "instructions", e.target.value)}
            placeholder={t("rx.medInstructionsPlaceholder")}
            className="rx-inp-sm"
          />
        </div>
      </div>
    </div>
  );
}
