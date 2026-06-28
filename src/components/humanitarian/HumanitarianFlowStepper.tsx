"use client";

import { Check } from "lucide-react";
import { translate, type Lang } from "@/lib/i18n/translations";
import type { HumanitarianFlowStep } from "@/lib/humanitarian/patient-flow";

const STEPS: { key: HumanitarianFlowStep; labelKey: string }[] = [
  { key: "triage", labelKey: "hum.flow.triage" },
  { key: "tcle", labelKey: "hum.flow.tcle" },
  { key: "anamnese", labelKey: "hum.flow.anamnese" },
  { key: "care", labelKey: "hum.flow.care" },
];

const ORDER: HumanitarianFlowStep[] = ["triage", "tcle", "anamnese", "care", "waiting", "consult"];

function stepIndex(step: HumanitarianFlowStep): number {
  if (step === "waiting" || step === "consult") return ORDER.indexOf("care");
  return ORDER.indexOf(step);
}

export default function HumanitarianFlowStepper({
  lang,
  current,
  dark = false,
}: {
  lang: Lang;
  current: HumanitarianFlowStep;
  dark?: boolean;
}) {
  const t = (key: string) => translate(lang, key);
  const currentIdx = stepIndex(current);

  return (
    <nav aria-label={t("hum.flow.aria")} className="w-full">
      <ol className="flex items-center gap-0.5 sm:gap-1">
        {STEPS.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const dot = done
            ? "bg-emerald-500 text-white border-emerald-500"
            : active
              ? dark
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-400"
                : "bg-emerald-50 text-emerald-700 border-emerald-400"
              : dark
                ? "bg-white/5 text-slate-500 border-white/10"
                : "bg-slate-100 text-slate-400 border-slate-200";

          return (
            <li key={step.key} className="flex items-center gap-0.5 sm:gap-1 flex-1 min-w-0">
              <div className={`flex items-center gap-1 min-w-0 ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
                <span
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0 ${dot}`}
                >
                  {done ? <Check size={11} /> : i + 1}
                </span>
                <span
                  className={`text-[9px] sm:text-[10px] font-medium truncate ${
                    active
                      ? dark ? "text-emerald-300" : "text-emerald-700"
                      : done
                        ? dark ? "text-slate-400" : "text-slate-600"
                        : dark ? "text-slate-600" : "text-slate-400"
                  }`}
                >
                  {t(step.labelKey)}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px flex-1 min-w-[4px] max-w-[16px] ${
                    i < currentIdx ? "bg-emerald-500/60" : dark ? "bg-white/10" : "bg-slate-200"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
