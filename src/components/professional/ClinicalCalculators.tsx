"use client";

import { useMemo, useState } from "react";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  bmiCategoryLabelKey,
  computeBmiResult,
  computeEddFromLmp,
  computeGestationalAge,
  formatIsoDate,
  parseIsoDate,
} from "@/lib/clinical-calculators";

type Props = {
  onInsert: (text: string) => void;
};

export default function ClinicalCalculators({ onInsert }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"bmi" | "pregnancy">("bmi");

  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [lmp, setLmp] = useState("");

  const bmiResult = useMemo(() => {
    const w = Number(weightKg);
    const h = Number(heightCm);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    return computeBmiResult(w, h);
  }, [weightKg, heightCm]);

  const pregnancyResult = useMemo(() => {
    const lmpDate = parseIsoDate(lmp);
    if (!lmpDate) return null;
    const edd = computeEddFromLmp(lmpDate);
    const ga = computeGestationalAge(lmpDate);
    if (!ga) return null;
    return { edd, ga };
  }, [lmp]);

  function insertBmi() {
    if (!bmiResult) return;
    const cat = t(bmiCategoryLabelKey(bmiResult.category));
    const line = t("calc.bmi.insertLine")
      .replace("{weight}", weightKg)
      .replace("{height}", heightCm)
      .replace("{bmi}", String(bmiResult.bmi))
      .replace("{category}", cat);
    onInsert(line);
  }

  function insertPregnancy() {
    if (!pregnancyResult) return;
    const { edd, ga } = pregnancyResult;
    const line = t("calc.pregnancy.insertLine")
      .replace("{lmp}", lmp)
      .replace("{weeks}", String(ga.weeks))
      .replace("{days}", String(ga.days))
      .replace("{edd}", formatIsoDate(edd));
    onInsert(line);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-100/80 transition"
      >
        <span className="inline-flex items-center gap-1.5">
          <Calculator size={14} className="text-brand-500" />
          {t("calc.title")}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-200">
          <div className="flex gap-1 pt-2">
            {(["bmi", "pregnancy"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  tab === id
                    ? "bg-brand-500 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                }`}
              >
                {t(id === "bmi" ? "calc.bmi.tab" : "calc.pregnancy.tab")}
              </button>
            ))}
          </div>

          {tab === "bmi" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                    {t("metric.weight")} (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="82"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                    {t("metric.height")} (cm)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="170"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm bg-white"
                  />
                </div>
              </div>
              {bmiResult && (
                <p className="text-xs text-brand-700 font-medium">
                  {t("metric.bmi")}: {bmiResult.bmi} ? {t(bmiCategoryLabelKey(bmiResult.category))}
                </p>
              )}
              <button
                type="button"
                disabled={!bmiResult}
                onClick={insertBmi}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("calc.insert")}
              </button>
            </div>
          )}

          {tab === "pregnancy" && (
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                  {t("calc.pregnancy.lmp")}
                </label>
                <input
                  type="date"
                  value={lmp}
                  onChange={(e) => setLmp(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm bg-white"
                />
              </div>
              {pregnancyResult && (
                <div className="text-xs text-brand-700 font-medium space-y-0.5">
                  <p>
                    {t("calc.pregnancy.ga")}: {pregnancyResult.ga.weeks}{t("calc.pregnancy.weeks")}{" "}
                    {pregnancyResult.ga.days}{t("calc.pregnancy.daysSuffix")}
                  </p>
                  <p>
                    {t("calc.pregnancy.edd")}: {formatIsoDate(pregnancyResult.edd)}
                  </p>
                </div>
              )}
              <button
                type="button"
                disabled={!pregnancyResult}
                onClick={insertPregnancy}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("calc.insert")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
