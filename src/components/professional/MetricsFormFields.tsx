"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { computeBmi, type ClinicalMetricsInput } from "@/lib/clinical-metrics";

const EMPTY: ClinicalMetricsInput = {};

type FieldDef = {
  key: keyof ClinicalMetricsInput;
  labelKey: string;
  step?: string;
  placeholder?: string;
};

const FIELDS: FieldDef[] = [
  { key: "weightKg", labelKey: "metric.weight", step: "0.1", placeholder: "78.5" },
  { key: "heightCm", labelKey: "metric.height", step: "1", placeholder: "170" },
  { key: "headCircumferenceCm", labelKey: "metric.headCirc", step: "0.1", placeholder: "45" },
  { key: "systolicBp", labelKey: "metric.systolic", step: "1", placeholder: "120" },
  { key: "diastolicBp", labelKey: "metric.diastolic", step: "1", placeholder: "80" },
  { key: "heartRate", labelKey: "metric.heartRate", step: "1", placeholder: "72" },
  { key: "glucoseMgDl", labelKey: "metric.glucose", step: "1", placeholder: "95" },
  { key: "temperatureC", labelKey: "metric.temperature", step: "0.1", placeholder: "36.5" },
  { key: "spo2Percent", labelKey: "metric.spo2", step: "1", placeholder: "98" },
];

export default function MetricsFormFields({
  value,
  onChange,
}: {
  value: ClinicalMetricsInput;
  onChange: (v: ClinicalMetricsInput) => void;
}) {
  const { t } = useI18n();
  const bmi = useMemo(
    () => computeBmi(value.weightKg, value.heightCm),
    [value.weightKg, value.heightCm],
  );

  function setField(key: keyof ClinicalMetricsInput, raw: string) {
    const next = { ...value };
    if (raw === "") {
      next[key] = null;
    } else {
      const n = Number(raw);
      next[key] = Number.isFinite(n) ? n : null;
    }
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-600">{t("metric.formTitle")}</p>
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
              {t(f.labelKey)}
            </label>
            <input
              type="number"
              step={f.step}
              value={value[f.key] ?? ""}
              onChange={(e) => setField(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        ))}
      </div>
      {bmi != null && (
        <p className="text-xs text-brand-600 font-medium">
          {t("metric.bmi")}: {bmi}
        </p>
      )}
    </div>
  );
}

export function emptyMetrics(): ClinicalMetricsInput {
  return { ...EMPTY };
}
