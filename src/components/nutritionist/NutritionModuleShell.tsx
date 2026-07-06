"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function NutritionModuleShell({
  titleKey,
  descKey,
  features,
}: {
  titleKey: string;
  descKey: string;
  features: string[];
}) {
  const { t } = useI18n();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/nutricionista"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-amber-700 transition"
      >
        <ArrowLeft size={14} />
        {t("nutri.backToDashboard")}
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t(titleKey)}</h1>
        <p className="text-slate-600 mt-2 leading-relaxed">{t(descKey)}</p>
      </div>
      <ul className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 space-y-3">
        {features.map((key) => (
          <li key={key} className="flex items-start gap-2 text-sm text-slate-700">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            {t(key)}
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-400">{t("nutri.module.comingSoon")}</p>
    </div>
  );
}
