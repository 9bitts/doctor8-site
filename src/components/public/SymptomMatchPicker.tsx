"use client";

import { ChevronRight, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export type SymptomMatchOption = {
  specialtySlug: string;
  label: string;
  reason?: string;
  source?: string;
};

type Props = {
  matches: SymptomMatchOption[];
  aiUsed?: boolean;
  onSelect: (slug: string) => void;
};

export default function SymptomMatchPicker({ matches, aiUsed, onSelect }: Props) {
  const { t } = useI18n();
  if (matches.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-600">{t("symptom.pickSpecialty")}</p>
        {aiUsed && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
            <Sparkles size={10} /> {t("symptom.aiUsed")}
          </span>
        )}
      </div>
      <ul className="space-y-1.5">
        {matches.map((m) => (
          <li key={m.specialtySlug}>
            <button
              type="button"
              onClick={() => onSelect(m.specialtySlug)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-white bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-accent-200 hover:shadow"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">{m.label}</span>
                {m.reason && (
                  <span className="block text-[11px] text-slate-500 line-clamp-2">{m.reason}</span>
                )}
              </span>
              <ChevronRight size={16} className="shrink-0 text-accent-500" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
