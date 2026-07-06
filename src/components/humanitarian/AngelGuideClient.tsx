"use client";

import Link from "next/link";
import { BookOpen, Heart } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

const SECTION_KEYS = [
  "angel.guide.doTitle",
  "angel.guide.dontTitle",
  "angel.guide.pendenciesTitle",
] as const;

const DO_ITEMS = [
  "angel.guide.do.1",
  "angel.guide.do.2",
  "angel.guide.do.3",
  "angel.guide.do.4",
] as const;

const DONT_ITEMS = [
  "angel.guide.dont.1",
  "angel.guide.dont.2",
  "angel.guide.dont.3",
  "angel.guide.dont.4",
] as const;

const PENDENCY_ITEMS = [
  "angel.guide.pendencies.1",
  "angel.guide.pendencies.2",
  "angel.guide.pendencies.3",
] as const;

export default function AngelGuideClient() {
  const { t } = useI18n();

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-rose-500" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-rose-600 font-semibold">
            {t("angel.portal.eyebrow")}
          </p>
          <h1 className="text-xl font-bold text-slate-900">{t("angel.guide.title")}</h1>
        </div>
      </div>

      <p className="text-slate-500 text-sm leading-relaxed">{t("angel.guide.intro")}</p>

      <section className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500" />
          {t(SECTION_KEYS[0])}
        </h2>
        <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
          {DO_ITEMS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </section>

      <section className="p-4 rounded-2xl border border-red-200 bg-red-50/50">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">{t(SECTION_KEYS[1])}</h2>
        <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
          {DONT_ITEMS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </section>

      <section className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">{t(SECTION_KEYS[2])}</h2>
        <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
          {PENDENCY_ITEMS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </section>

      <Link
        href="/admin/angel"
        className="text-sm text-slate-500 hover:text-slate-800"
      >
        &larr; {t("angel.guide.back")}
      </Link>
    </div>
  );
}
