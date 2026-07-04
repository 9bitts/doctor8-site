import { AlertCircle, Trash2 } from "lucide-react";

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
  itemKind?: "medication" | "device" | "phytotherapy";
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
  onRemove: (index: number) => void;
  t: (key: string) => string;
  rxFieldClass: (invalid: boolean) => string;
}

export default function PrescriptionMedItemForm({
  med,
  index,
  showErrors,
  fieldErrors,
  kindLabel,
  controlInfo: ci,
  onUpdate,
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
                Apresentação
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
              Forma farmacêutica
            </label>
            <input
              type="text"
              value={med.pharmaceuticalForm || ""}
              onChange={(e) => onUpdate(index, "pharmaceuticalForm", e.target.value)}
              placeholder="Ex.: Comprimido, Xarope (frasco)"
              className="rx-inp-sm"
            />
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
            placeholder={t("rx.medDosagePlaceholder")}
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
