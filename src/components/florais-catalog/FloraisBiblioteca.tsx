"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf, type Lang } from "@/lib/i18n/translations";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import {
  BACH_EMOTIONAL_GROUPS,
  filterFloralCatalog,
  FLORAL_CATEGORY_ACCENT,
  floralsByCategory,
  floralCategoryLabelKey,
  type FloralCatalogCategory,
} from "@/lib/florais-catalog/data";
import { detectFloraisPortal, floraisBasePath } from "@/lib/florais-catalog/portal-config";

const CATEGORIES: FloralCatalogCategory[] = [
  "bach_rescue",
  "bach",
  "saint_germain_formula",
  "saint_germain",
];

export default function FloraisBiblioteca() {
  const { t, lang } = useI18n();
  const ml = lang as Lang;
  const pathname = usePathname();
  const portal = detectFloraisPortal(pathname);
  const base = floraisBasePath(portal);
  const href = (path: string) =>
    portal === "professional" ? mapProfessionalPathToPortal(pathname, path) : path;

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterFloralCatalog(query, ml), [query, ml]);

  const groupedBach = useMemo(() => {
    if (query.trim()) return null;
    return BACH_EMOTIONAL_GROUPS.map((group) => ({
      groupKey: group.groupKey,
      items: group.essences.map((e) => filtered.find((i) => i.slug === e.value)).filter(Boolean),
    })).filter((g) => g.items.length > 0);
  }, [query, filtered]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <Link
        href={href(base)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-pink-600 hover:text-pink-800"
      >
        <ArrowLeft size={16} /> {t("fl.hub.navBack")}
      </Link>

      <div>
        <p className="text-xs font-semibold text-pink-600 uppercase tracking-wide">{t("fl.bib.tag")}</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{t("fl.bib.title")}</h1>
        <p className="text-slate-500 mt-2">{t("fl.bib.lead")}</p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("fl.bib.searchPlaceholder")}
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-slate-500 py-12">{t("fl.hub.noResults")}</p>
      ) : query.trim() ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((item) => (
            <Link
              key={item.slug}
              href={href(`${base}/${item.slug}`)}
              className="rounded-xl border border-slate-200 bg-white p-4 hover:border-pink-200 transition"
              style={{ borderLeftWidth: 3, borderLeftColor: FLORAL_CATEGORY_ACCENT[item.category] }}
            >
              <p className="text-[10px] font-bold uppercase text-slate-400">{t(floralCategoryLabelKey(item.category))}</p>
              <p className="font-semibold text-slate-900 text-sm mt-0.5">{t(item.labelKey)}</p>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t(item.indicationKey)}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {CATEGORIES.map((cat) => {
            if (cat === "bach" && groupedBach) {
              return (
                <section key={cat}>
                  <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: FLORAL_CATEGORY_ACCENT.bach }} />
                    {t(floralCategoryLabelKey("bach"))}
                  </h2>
                  <div className="space-y-5">
                    {groupedBach.map((group) => (
                      <div key={group.groupKey}>
                        <p className="text-xs font-semibold text-slate-500 mb-2">{t(group.groupKey!)}</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {group.items.map((item) => item && (
                            <Link
                              key={item.slug}
                              href={href(`${base}/${item.slug}`)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-pink-200 text-sm"
                            >
                              <span className="font-medium text-slate-800">{t(item.labelKey)}</span>
                              <span className="text-xs text-slate-400 block mt-0.5 line-clamp-1">{t(item.negKey!)}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            }

            const items = floralsByCategory(cat);
            if (items.length === 0) return null;

            return (
              <section key={cat}>
                <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: FLORAL_CATEGORY_ACCENT[cat] }} />
                  {t(floralCategoryLabelKey(cat))}
                </h2>
                <div className="grid sm:grid-cols-2 gap-2">
                  {items.map((item) => (
                    <Link
                      key={item.slug}
                      href={href(`${base}/${item.slug}`)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-pink-200"
                    >
                      <p className="font-medium text-slate-800 text-sm">{t(item.labelKey)}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t(item.indicationKey)}</p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
        {t("fl.hub.disclaimer")} · {localeOf(ml)}
      </p>
    </div>
  );
}
