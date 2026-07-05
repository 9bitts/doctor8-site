"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight, BookOpen, Leaf, Search, X, FlaskConical, Info,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import {
  filterTeas,
  mtLang,
  mtQuickTags,
  mtTeaText,
  mtUi,
  mtUiString,
  MEDICINAL_TEAS,
  MEDICINAL_CATALOG,
} from "@/lib/medicinal-teas/data";
import {
  detectMedicinalTeasPortal,
  medicinalTeasBasePath,
} from "@/lib/medicinal-teas/portal-config";

function uiFn(lang: ReturnType<typeof mtLang>) {
  return (key: string) => mtUiString(lang, key);
}

function ingredientLabel(lang: ReturnType<typeof mtLang>, count: number): string {
  const words = mtUi(lang).ingredientWord as string[] | undefined;
  return count === 1 ? (words?.[0] || "ingrediente") : (words?.[1] || "ingredientes");
}

export default function MedicinalTeasHub() {
  const { lang } = useI18n();
  const ml = mtLang(lang);
  const ui = uiFn(ml);
  const pathname = usePathname();
  const portal = detectMedicinalTeasPortal(pathname);
  const base = medicinalTeasBasePath(portal);
  const href = (path: string) =>
    portal === "professional" ? mapProfessionalPathToPortal(pathname, path) : path;

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterTeas(query, ml), [query, ml]);
  const quickTags = mtQuickTags(ml);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
          <Leaf size={28} className="text-amber-700" />
        </div>
        <div>
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">{ui("heroEyebrow")}</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-1" dangerouslySetInnerHTML={{ __html: ui("heroTitle") }} />
          <p className="text-slate-500 mt-2 max-w-2xl leading-relaxed">{ui("heroLead")}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={href(`${base}/catalogo`)} className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-brand-50 text-slate-700">
          <FlaskConical size={16} /> {ui("navCatalogo")}
        </Link>
        <Link href={href(`${base}/estudo`)} className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-brand-50 text-slate-700">
          <BookOpen size={16} /> {ui("navEstudo")}
        </Link>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ui("searchPlaceholder")}
          className="w-full pl-11 pr-24 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-brand-600 px-2 py-1"
          >
            {ui("searchClear")}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {quickTags.map((tag) => (
          <button
            key={tag.term}
            type="button"
            onClick={() => setQuery(tag.term)}
            className="text-xs font-medium px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition"
          >
            {tag.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-brand-600">{MEDICINAL_TEAS.length}</p>
          <p className="text-xs text-slate-500 mt-1">{ui("statChas")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-brand-600">{MEDICINAL_CATALOG.length}</p>
          <p className="text-xs text-slate-500 mt-1">{ui("statPlantas")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-brand-600">100%</p>
          <p className="text-xs text-slate-500 mt-1">{ui("statOrigem")}</p>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{ui("teasEyebrow")}</p>
          <h2 className="text-xl font-bold text-slate-900 mt-1">{ui("teasTitle")}</h2>
          <p className="text-sm text-slate-500 mt-1">{ui("teasHint")}</p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
            {ui("noResultsHomePre")}
            <Link href={href(`${base}/catalogo`)} className="text-brand-600 font-semibold hover:underline">
              {ui("noResultsHomeLink")}
            </Link>
            {ui("noResultsHomePost")}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((tea) => {
              const tx = mtTeaText(ml, tea.slug);
              if (!tx) return null;
              return (
                <Link
                  key={tea.slug}
                  href={href(`${base}/${tea.slug}`)}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-200 hover:shadow-md transition"
                  style={{ borderLeftWidth: 4, borderLeftColor: tea.accent }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{tx.symptom}</p>
                  <h3 className="font-bold text-slate-900 mt-1 group-hover:text-brand-700">{tx.name}</h3>
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2">{tx.tagline}</p>
                  <p className="text-xs text-slate-400 mt-3">
                    {tea.plants.length} {ingredientLabel(ml, tea.plants.length)}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 mt-3">
                    {ui("verCha")} <ArrowRight size={14} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Info size={18} className="text-amber-700" />
          <div>
            <p className="text-xs font-semibold text-amber-800 uppercase">{ui("infoEyebrow")}</p>
            <h2 className="font-bold text-slate-900">{ui("infoTitle")}</h2>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { title: ui("info1Title"), text: ui("info1Text") },
            { title: ui("info2Title"), text: ui("info2Text") },
            { title: ui("info3Title"), text: ui("info3Text") },
            { title: ui("info4Title"), text: ui("info4Text") },
          ].map((item) => (
            <div key={item.title} className="bg-white/80 rounded-xl p-4 border border-amber-100">
              <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
        {ui("footerDisclaimerShort")}
      </p>
    </div>
  );
}
