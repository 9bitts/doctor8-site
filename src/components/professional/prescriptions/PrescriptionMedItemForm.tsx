import { AlertCircle, Trash2 } from "lucide-react";
import {
  PHYTOTHERAPY_REFERENCE_PRODUCTS,
  phytotherapyProductByValue,
} from "@/lib/pics/reference-library/phytotherapy-products";
import {
  FLORAL_CATEGORY_LABEL_KEYS,
  FLORAL_REFERENCE_PRODUCTS,
  floralProductByValue,
  type FloralProductCategory,
} from "@/lib/pics/reference-library/floral-products";

export type PrescriptionMedItem = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  presentation?: string;
  pharmaceuticalForm?: string;
  controlled?: boolean;
  prescriptionType?: string | null;
  itemKind?: "medication" | "device" | "phytotherapy" | "floral";
  phytoProductId?: string;
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
  onUpdate: (index: number, field: keyof PrescriptionMedItem, value: string) => void;
  onPhytoProductSelect?: (index: number, productId: string) => void;
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
  onPhytoProductSelect,
  onFloralProductSelect,
  onRemove,
  t,
  rxFieldClass,
}: PrescriptionMedItemFormProps) {
  const kind = med.itemKind || "medication";

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
          {kind === "phytotherapy" && onPhytoProductSelect && (
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                {t("rx.phytoProductSelect")}
              </label>
              <select
                value={med.phytoProductId || ""}
                onChange={(e) => onPhytoProductSelect(index, e.target.value)}
                className="rx-inp-sm"
              >
                <option value="">{t("rx.phytoProductPlaceholder")}</option>
                {PHYTOTHERAPY_REFERENCE_PRODUCTS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {t(p.labelKey)}
                  </option>
                ))}
              </select>
              {med.phytoProductId && phytotherapyProductByValue(med.phytoProductId) && (
                <p className="text-[11px] text-teal-700 mt-1 leading-relaxed">
                  {t(phytotherapyProductByValue(med.phytoProductId)!.indicationKey)}
                </p>
              )}
            </div>
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
          {med.presentation?.trim() && (
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                {"Apresenta\u00e7\u00e3o"}
              </label>
              <input
                type="text"
                readOnly
                value={med.presentation}
                className="rx-inp-sm bg-slate-100 text-slate-600 cursor-default"
              />
            </div>
          )}
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
        {kind === "phytotherapy" && (
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600 block mb-1">
              {t("it.tpl.phyto.presentation")}
            </label>
            <select
              value={med.pharmaceuticalForm || ""}
              onChange={(e) => onUpdate(index, "pharmaceuticalForm", e.target.value)}
              className="rx-inp-sm"
            >
              <option value="">{t("med.freqSelect")}</option>
              <option value="capsula">{t("it.tpl.phyto.pres.capsula")}</option>
              <option value="comprimido">{t("it.tpl.phyto.pres.comprimido")}</option>
              <option value="tintura">{t("it.tpl.phyto.pres.tintura")}</option>
              <option value="cha">{t("it.tpl.phyto.pres.cha")}</option>
              <option value="xarope">{t("it.tpl.phyto.pres.xarope")}</option>
              <option value="gel">{t("it.tpl.phyto.pres.gel")}</option>
              <option value="po">{t("it.tpl.phyto.pres.po")}</option>
            </select>
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
            className="rx-inp-sm"
          />
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
