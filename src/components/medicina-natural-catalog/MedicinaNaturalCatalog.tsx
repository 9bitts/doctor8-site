"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import type { NaturalMedicinePracticeConfig } from "@/lib/natural-medicine/config";
import { categoriaFromPracticeUrl } from "@/lib/medicina-natural-catalog/practice-map";
import {
  detectMnCatalogPortal,
  mnCatalogBasePath,
} from "@/lib/medicina-natural-catalog/portal-config";
import { fetchMedicinaNaturalSearch } from "@/lib/medicina-natural-catalog/api";
import type { MedicinaNaturalListItem } from "@/lib/medicina-natural-catalog/search-server";
import MedicinaNaturalItemCard from "./MedicinaNaturalItemCard";

interface MedicinaNaturalCatalogProps {
  practice: NaturalMedicinePracticeConfig;
}

export default function MedicinaNaturalCatalog({ practice }: MedicinaNaturalCatalogProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const portal = detectMnCatalogPortal(pathname);
  const base = mnCatalogBasePath(portal);
  const practiceBase = `${base}/${practice.urlSlug}`;
  const categoria = categoriaFromPracticeUrl(practice.urlSlug);

  const href = (path: string) =>
    portal === "professional" ? mapProfessionalPathToPortal(pathname, path) : path;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<MedicinaNaturalListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [renisusOnly, setRenisusOnly] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadItems = useCallback(async () => {
    if (!categoria) return;
    setLoading(true);
    try {
      const results = await fetchMedicinaNaturalSearch(portal, {
        q: debouncedQuery.length >= 2 ? debouncedQuery : undefined,
        categoria,
        renisus: renisusOnly || undefined,
        take: 100,
      });
      setItems(results);
      if (!debouncedQuery) {
        const res = await fetch(
          `${portal === "professional" ? "/api/professional" : "/api/integrative-therapist"}/medicina-natural/search?categoria=${categoria}&take=1`,
        );
        const data = await res.json();
        setTotal(data.total ?? results.length);
      } else {
        setTotal(results.length);
      }
    } finally {
      setLoading(false);
    }
  }, [portal, categoria, debouncedQuery, renisusOnly]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [items],
  );

  if (!categoria) {
    return (
      <p className="text-sm text-slate-500 py-12 text-center">{t("nm.catalog.unsupported")}</p>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <Link
        href={href(practiceBase)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-800"
      >
        <ArrowLeft size={16} /> {t("nm.catalog.back")}
      </Link>

      <div>
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
          {t(practice.hubTitleKey)}
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{t("nm.catalog.title")}</h1>
        <p className="text-slate-500 mt-2">{t("nm.catalog.lead")}</p>
        {total > 0 && (
          <p className="text-xs text-slate-400 mt-2">
            {t("nm.catalog.count").replace("{n}", String(total))}
          </p>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
        <p className="text-xs text-amber-900 leading-relaxed">{t("nm.ref.disclaimer")}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("nm.catalog.searchPlaceholder")}
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        {categoria === "FITOTERAPICO" && (
          <button
            type="button"
            onClick={() => setRenisusOnly((v) => !v)}
            className={`shrink-0 px-4 py-3 rounded-2xl border text-sm font-semibold transition ${
              renisusOnly
                ? "bg-violet-100 border-violet-300 text-violet-800"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t("nm.badge.renisus")}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-sm text-slate-400 py-12">{t("nm.catalog.loading")}</p>
      ) : sorted.length === 0 ? (
        <p className="text-center text-sm text-slate-500 py-12">
          {total === 0 && !debouncedQuery && !renisusOnly
            ? t("nm.catalog.emptyPending")
            : t("nm.catalog.empty")}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {sorted.map((item) => (
            <MedicinaNaturalItemCard
              key={item.slug}
              item={item}
              href={href(`${practiceBase}/${item.slug}`)}
              renisusLabel={t("nm.badge.renisus")}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
        {t("nm.ref.sources")}
      </p>
    </div>
  );
}
