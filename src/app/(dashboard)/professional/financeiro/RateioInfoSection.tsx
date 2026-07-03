"use client";

import { Info } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";

/** Informative placeholder when rateio pipeline is ProfessionalProfile-only. */
export function RateioInfoSection() {
  const t = useT();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <Info size={18} className="text-slate-500" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">{t("rateio.unavailableTitle")}</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t("rateio.unavailableDesc")}</p>
        </div>
      </div>
    </div>
  );
}
