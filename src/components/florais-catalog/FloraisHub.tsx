"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Flower2,
  Info,
  LayoutTemplate,
  Library,
  Search,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf, type Lang } from "@/lib/i18n/translations";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import {
  filterFloralCatalog,
  FLORAL_CATEGORY_ACCENT,
  FLORAL_QUICK_TAGS,
  FLORAL_STATS,
  floralCategoryLabelKey,
} from "@/lib/florais-catalog/data";
import { detectFloraisPortal, floraisBasePath } from "@/lib/florais-catalog/portal-config";
import { mnCatalogBasePath } from "@/lib/medicina-natural-catalog/portal-config";

export default function FloraisHub() {
  const { t, lang } = useI18n();
  const pathname = usePathname();
  const portal = detectFloraisPortal(pathname);
  const base = floraisBasePath(portal);
  const mnCatalog = `${mnCatalogBasePath(portal)}/terapia-florais/catalogo`;
  const href = (path: string) =>
    portal === "professional" ? mapProfessionalPathToPortal(pathname, path) : path;

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterFloralCatalog(query, lang as Lang), [query, lang]);
  const display = query.trim() ? filtered : filterFloralCatalog("", lang as Lang);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-pink-100 flex items-center justify-center shrink-0">
          <Flower2 size={28} className="text-pink-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-pink-600 uppercase tracking-wide">{t("fl.hub.eyebrow")}</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-1">{t("fl.hub.title")}</h1>
          <p className="text-slate-500 mt-2 max-w-2xl leading-relaxed">{t("fl.hub.lead")}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={href(mnCatalog)}
          className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-pink-200 bg-pink-50 hover:bg-pink-100 text-pink-800"
        >
          <Library size={16} /> {t("fl.hub.navCatalogo")}
        </Link>
        <Link
          href={href(`${base}/biblioteca`)}
          className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-pink-50 text-slate-700"
        >
          <BookOpen size={16} /> {t("fl.hub.navBiblioteca")}
        </Link>
        {portal === "integrative-therapist" && (
          <>
            <Link
              href={href("/integrative-therapist/medicina-natural/terapia-florais/templates")}
              className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-pink-50 text-slate-700"
            >
              <LayoutTemplate size={16} /> {t("fl.hub.navModelos")}
            </Link>
            <Link
              href={href("/integrative-therapist/prescriptions?add=floral")}
              className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-pink-200 bg-pink-50 hover:bg-pink-100 text-pink-800"
            >
              <Flower2 size={16} /> {t("fl.hub.navPrescrever")}
            </Link>
          </>
        )}
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("fl.hub.searchPlaceholder")}
          className="w-full pl-11 pr-24 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-pink-600 px-2 py-1"
          >
            {t("fl.hub.searchClear")}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {FLORAL_QUICK_TAGS.map((tag) => (
          <button
            key={tag.term}
            type="button"
            onClick={() => setQuery(tag.term)}
            className="text-xs font-medium px-3 py-1.5 rounded-full border border-pink-200 bg-pink-50 text-pink-800 hover:bg-pink-100 transition"
          >
            {t(tag.labelKey)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-pink-600">{FLORAL_STATS.bach}</p>
          <p className="text-xs text-slate-500 mt-1">{t("fl.hub.statBach")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-pink-600">{FLORAL_STATS.saintGermain}</p>
          <p className="text-xs text-slate-500 mt-1">{t("fl.hub.statSG")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-pink-600">{FLORAL_STATS.formulas}</p>
          <p className="text-xs text-slate-500 mt-1">{t("fl.hub.statFormulas")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-pink-600">{FLORAL_STATS.total}</p>
          <p className="text-xs text-slate-500 mt-1">{t("fl.hub.statTotal")}</p>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("fl.hub.catalogEyebrow")}</p>
          <h2 className="text-xl font-bold text-slate-900 mt-1">{t("fl.hub.catalogTitle")}</h2>
          <p className="text-sm text-slate-500 mt-1">{t("fl.hub.catalogHint")}</p>
        </div>

        {display.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
            {t("fl.hub.noResults")}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {(query.trim() ? display : display.slice(0, 24)).map((item) => {
              const accent = FLORAL_CATEGORY_ACCENT[item.category];
              return (
                <Link
                  key={item.slug}
                  href={href(`${base}/${item.slug}`)}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-pink-200 hover:shadow-md transition"
                  style={{ borderLeftWidth: 4, borderLeftColor: accent }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {t(floralCategoryLabelKey(item.category))}
                  </p>
                  <h3 className="font-bold text-slate-900 mt-1 group-hover:text-pink-700">{t(item.labelKey)}</h3>
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2">{t(item.indicationKey)}</p>
                  {item.posKey && (
                    <p className="text-xs text-pink-700 mt-2 line-clamp-1">
                      → {t(item.posKey)}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-pink-600 mt-3">
                    {t("fl.hub.verFloral")} <ArrowRight size={14} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {!query.trim() && display.length > 24 && (
          <div className="text-center">
            <Link
              href={href(`${base}/biblioteca`)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-pink-600 hover:text-pink-800"
            >
              {t("fl.hub.verTodos")} <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-pink-100 bg-pink-50/60 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Info size={18} className="text-pink-700" />
          <div>
            <p className="text-xs font-semibold text-pink-800 uppercase">{t("fl.hub.infoEyebrow")}</p>
            <h2 className="font-bold text-slate-900">{t("fl.hub.infoTitle")}</h2>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { title: t("fl.hub.info1Title"), text: t("fl.hub.info1Text") },
            { title: t("fl.hub.info2Title"), text: t("fl.hub.info2Text") },
            { title: t("fl.hub.info3Title"), text: t("fl.hub.info3Text") },
            { title: t("fl.hub.info4Title"), text: t("fl.hub.info4Text") },
          ].map((item) => (
            <div key={item.title} className="bg-white/80 rounded-xl p-4 border border-pink-100">
              <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
        {t("fl.hub.disclaimer")}
      </p>
    </div>
  );
}
