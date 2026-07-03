"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Heart } from "lucide-react";
import { translate, type Lang } from "@/lib/i18n/translations";
import HumanitarianShell from "@/components/humanitarian/HumanitarianShell";
import { getHumanitarianLang } from "@/components/humanitarian/HumanitarianLangSwitcher";

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

function t(lang: Lang, key: string): string {
  return translate(lang, key);
}

export default function HumanitarianAngelGuidePage() {
  const [lang, setLang] = useState<Lang>("pt");

  useEffect(() => { setLang(getHumanitarianLang()); }, []);

  return (
    <HumanitarianShell lang={lang} onLangChange={setLang} dark>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-rose-300/80 font-semibold">
              {t(lang, "angel.portal.eyebrow")}
            </p>
            <h1 className="text-xl font-bold text-white">{t(lang, "angel.guide.title")}</h1>
          </div>
        </div>

        <p className="text-slate-400 text-sm mb-8 leading-relaxed">{t(lang, "angel.guide.intro")}</p>

        <section className="mb-8 p-4 rounded-2xl border border-white/10 bg-white/5">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400" />
            {t(lang, SECTION_KEYS[0])}
          </h2>
          <ul className="space-y-2 text-sm text-slate-300 list-disc pl-5">
            {DO_ITEMS.map((key) => (
              <li key={key}>{t(lang, key)}</li>
            ))}
          </ul>
        </section>

        <section className="mb-8 p-4 rounded-2xl border border-red-500/20 bg-red-500/5">
          <h2 className="text-sm font-semibold text-white mb-3">{t(lang, SECTION_KEYS[1])}</h2>
          <ul className="space-y-2 text-sm text-slate-300 list-disc pl-5">
            {DONT_ITEMS.map((key) => (
              <li key={key}>{t(lang, key)}</li>
            ))}
          </ul>
        </section>

        <section className="mb-8 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <h2 className="text-sm font-semibold text-white mb-3">{t(lang, SECTION_KEYS[2])}</h2>
          <ul className="space-y-2 text-sm text-slate-300 list-disc pl-5">
            {PENDENCY_ITEMS.map((key) => (
              <li key={key}>{t(lang, key)}</li>
            ))}
          </ul>
        </section>

        <Link
          href="/humanitarian/angel"
          className="text-sm text-slate-400 hover:text-white"
        >
          &larr; {t(lang, "angel.guide.back")}
        </Link>
      </div>
    </HumanitarianShell>
  );
}
