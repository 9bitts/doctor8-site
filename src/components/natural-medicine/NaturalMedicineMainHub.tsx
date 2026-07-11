"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Droplets,
  Flower2,
  Hexagon,
  Leaf,
  Search,
  Sprout,
  Wind,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import {
  type NaturalMedicinePortal,
  type NaturalMedicinePracticeConfig,
  NATURAL_MEDICINE_PRACTICES,
  naturalMedicineBasePath,
} from "@/lib/natural-medicine/config";
import {
  fetchMedicinaNaturalCount,
  fetchMedicinaNaturalSearch,
} from "@/lib/medicina-natural-catalog/api";
import {
  categoriaFromPracticeUrl,
  practiceUrlFromCategoria,
} from "@/lib/medicina-natural-catalog/practice-map";
import {
  mnCatalogBasePath,
  naturalPortalToCatalogPortal,
} from "@/lib/medicina-natural-catalog/portal-config";
import type { MedicinaNaturalListItem } from "@/lib/medicina-natural-catalog/search-server";
import type { CategoriaPratica } from "@/lib/medicina-natural/item-types";
import StatusRegulatorioBadge from "@/components/medicina-natural-catalog/StatusRegulatorioBadge";

const ICONS = {
  Leaf,
  Flower2,
  Wind,
  Droplets,
  Hexagon,
} as const;

interface NaturalMedicineMainHubProps {
  portal: NaturalMedicinePortal;
  /** Integrative: only practices enabled in profile. Professional: all. */
  enabledPractices?: NaturalMedicinePracticeConfig[];
}

export default function NaturalMedicineMainHub({
  portal,
  enabledPractices,
}: NaturalMedicineMainHubProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const base = naturalMedicineBasePath(portal);
  const catalogPortal = naturalPortalToCatalogPortal(portal);
  const catalogBase = mnCatalogBasePath(catalogPortal);

  const practices =
    enabledPractices ??
    (portal === "professional" ? NATURAL_MEDICINE_PRACTICES : []);

  const href = (path: string) =>
    portal === "professional" ? mapProfessionalPathToPortal(pathname, path) : path;

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MedicinaNaturalListItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        practices.map(async (p) => {
          const categoria = categoriaFromPracticeUrl(p.urlSlug);
          if (!categoria) return [p.urlSlug, 0] as const;
          const n = await fetchMedicinaNaturalCount(catalogPortal, categoria);
          return [p.urlSlug, n] as const;
        }),
      );
      if (!cancelled) setCounts(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [practices, catalogPortal]);

  const runGlobalSearch = useCallback(async () => {
    if (debouncedQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const items = await fetchMedicinaNaturalSearch(catalogPortal, {
        q: debouncedQuery,
        take: 24,
      });
      setSearchResults(items);
    } finally {
      setSearching(false);
    }
  }, [catalogPortal, debouncedQuery]);

  useEffect(() => {
    void runGlobalSearch();
  }, [runGlobalSearch]);

  const practiceByCategoria = useMemo(() => {
    const map = new Map<CategoriaPratica, NaturalMedicinePracticeConfig>();
    for (const p of practices) {
      const cat = categoriaFromPracticeUrl(p.urlSlug);
      if (cat) map.set(cat, p);
    }
    return map;
  }, [practices]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
          <Sprout size={28} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{t("nm.hub.title")}</h1>
          <p className="text-slate-500 mt-1 max-w-2xl">{t("nm.hub.subtitle")}</p>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
        <p className="text-sm text-emerald-800 leading-relaxed">{t("nm.hub.banner")}</p>
      </div>

      {practices.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            {t("nm.hub.globalSearchTitle")}
          </h2>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("nm.hub.searchPlaceholder")}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
          {debouncedQuery.length >= 2 && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              {searching ? (
                <p className="text-sm text-slate-400 text-center py-8">{t("nm.catalog.loading")}</p>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">{t("nm.hub.noSearchResults")}</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {searchResults.map((item) => {
                    const practice = practiceByCategoria.get(item.categoriaPratica);
                    const practiceSlug = practiceUrlFromCategoria(item.categoriaPratica);
                    return (
                      <li key={item.slug}>
                        <Link
                          href={href(`${catalogBase}/${practiceSlug}/${item.slug}`)}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-emerald-50 transition"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900">{item.nome}</p>
                            {practice && (
                              <p className="text-xs text-slate-500 mt-0.5">{t(practice.hubTitleKey)}</p>
                            )}
                            {item.indicacoes && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.indicacoes}</p>
                            )}
                          </div>
                          <StatusRegulatorioBadge status={item.statusRegulatorio} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {practices.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-amber-900">{t("nm.hub.noPractices")}</p>
          <Link
            href="/integrative-therapist/settings"
            className="inline-flex text-sm font-bold text-amber-700 hover:text-amber-900"
          >
            {t("nm.hub.setupAction")} →
          </Link>
        </div>
      ) : (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            {t("nm.hub.practicesTitle")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {practices.map((p) => {
              const Icon = ICONS[p.icon];
              return (
                <Link
                  key={p.urlSlug}
                  href={href(`${base}/${p.urlSlug}`)}
                  className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-200 hover:shadow-sm transition flex items-start gap-4"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${p.color}`}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 group-hover:text-emerald-700 transition">
                      {t(p.hubTitleKey)}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">{t(p.cardDescKey)}</p>
                    {counts[p.urlSlug] !== undefined && (
                      <p className="text-xs text-emerald-600 font-medium mt-2">
                        {t("nm.hub.catalogCount").replace("{n}", String(counts[p.urlSlug]))}
                      </p>
                    )}
                  </div>
                  <ArrowRight size={18} className="text-slate-300 group-hover:text-emerald-400 mt-1 shrink-0" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 text-sm">{t("nm.hub.disclaimerTitle")}</h3>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{t("nm.hub.disclaimer")}</p>
      </section>
    </div>
  );
}
