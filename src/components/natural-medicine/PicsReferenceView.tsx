"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf, type Lang } from "@/lib/i18n/translations";
import {
  getReferenceSections,
  renderReferenceSectionBody,
} from "@/lib/pics/reference-library";
import type { NaturalMedicinePracticeConfig } from "@/lib/natural-medicine/config";

interface PicsReferenceViewProps {
  practice: NaturalMedicinePracticeConfig;
  backHref: string;
}

export default function PicsReferenceView({ practice, backHref }: PicsReferenceViewProps) {
  const { t, lang } = useI18n();
  const sections = getReferenceSections(practice.practiceSlug);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 transition"
      >
        <ArrowLeft size={16} />
        {t("nm.ref.back")}
      </Link>

      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${practice.color}`}>
          <BookOpen size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("nm.ref.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {t(practice.hubTitleKey)} · {t("nm.ref.subtitle")}
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
        <p className="text-xs text-amber-900 leading-relaxed">{t("nm.ref.disclaimer")}</p>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-slate-500">{t("nm.ref.empty")}</p>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const lines = renderReferenceSectionBody(section, lang as Lang);
            return (
              <section
                key={section.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              >
                <h2 className="px-5 py-3.5 text-sm font-semibold text-emerald-800 bg-emerald-50/80 border-b border-emerald-100">
                  {t(section.titleKey)}
                </h2>
                <div className="px-5 py-4 space-y-2">
                  {lines.map((line) => (
                    <p key={line} className="text-sm text-slate-600 leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-slate-400 pb-4">
        {t("nm.ref.sources")} · {localeOf(lang as Lang)}
      </p>
    </div>
  );
}
