"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BrandLogoLink } from "@/components/brand/BrandLogo";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import {
  Search, Loader2, Video, Building2, Shield, ChevronRight, MapPin,
  SlidersHorizontal, Star, Clock,
} from "lucide-react";
import type { PublicSearchResult, PublicSearchSort } from "@/lib/public-search";
import { dedupeHealthPlanList } from "@/lib/health-plan-display";
import PublicResultCard from "@/components/public/PublicResultCard";
import AcuraVolunteerSearchBanner from "@/components/acura/AcuraVolunteerSearchBanner";
import {
  seoSlugToSpecialtyLabel,
  citySlugToLabel,
  buildPublicSearchConvenioPath,
  buildPublicSearchPath,
} from "@/lib/public-slugs";

const PublicSearchMap = dynamic(() => import("@/components/public/PublicSearchMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[280px] bg-slate-50 rounded-xl flex items-center justify-center">
      <Loader2 className="animate-spin text-slate-400" size={24} />
    </div>
  ),
});

type HealthPlan = { id: string; name: string; slug: string };

type SearchFilters = {
  convenio: string;
  teleconsult: boolean;
  presencial: boolean;
  priceMax: string;
  minRating: string;
  availableOnly: boolean;
  acuraVolunteersOnly: boolean;
  sort: PublicSearchSort;
};

function parseFilters(params: URLSearchParams): SearchFilters {
  const sort = params.get("sort") as PublicSearchSort;
  const validSorts: PublicSearchSort[] = [
    "name", "rating", "reviews", "price_asc", "price_desc", "soonest",
  ];
  return {
    convenio: params.get("convenio") || "",
    teleconsult: params.get("teleconsult") === "1",
    presencial: params.get("presencial") === "1",
    priceMax: params.get("priceMax") || "",
    minRating: params.get("minRating") || "",
    availableOnly: params.get("availableOnly") === "1",
    acuraVolunteersOnly: params.get("acuraVolunteers") === "1",
    sort: validSorts.includes(sort) ? sort : "name",
  };
}

function filtersToParams(f: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.convenio) params.set("convenio", f.convenio);
  if (f.teleconsult) params.set("teleconsult", "1");
  if (f.presencial) params.set("presencial", "1");
  if (f.priceMax) params.set("priceMax", f.priceMax);
  if (f.minRating) params.set("minRating", f.minRating);
  if (f.availableOnly) params.set("availableOnly", "1");
  if (f.acuraVolunteersOnly) params.set("acuraVolunteers", "1");
  if (f.sort && f.sort !== "name") params.set("sort", f.sort);
  return params;
}

const PRICE_OPTIONS = ["", "150", "250", "400", "600", "1000"];

export default function PublicSearchClient({
  especialidade,
  cidade,
  initialConvenio = "",
  seoConvenioMode = false,
}: {
  especialidade: string;
  cidade: string;
  initialConvenio?: string;
  seoConvenioMode?: boolean;
}) {
  const { lang, t } = useI18n();
  const locale = localeOf(lang);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [results, setResults] = useState<PublicSearchResult[]>([]);
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>(() => {
    const base = parseFilters(searchParams);
    if (initialConvenio && !base.convenio) {
      return { ...base, convenio: initialConvenio };
    }
    return base;
  });
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const specialtyLabel = seoSlugToSpecialtyLabel(especialidade, lang);
  const cityLabel = citySlugToLabel(cidade);
  const activePlan = plans.find((p) => p.slug === filters.convenio);

  useEffect(() => {
    setFilters(parseFilters(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (initialConvenio && !searchParams.get("convenio")) {
      setFilters((f) => ({ ...f, convenio: initialConvenio }));
    }
  }, [initialConvenio, searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        especialidade,
        cidade,
        lang,
      });
      const qs = filtersToParams(filters);
      qs.forEach((v, k) => params.set(k, v));

      const [searchRes, plansRes] = await Promise.all([
        fetch(`/api/public/search?${params}`),
        fetch("/api/public/health-plans?usedOnly=1"),
      ]);

      if (searchRes.ok) {
        const data = await searchRes.json();
        setResults(data.results || []);
      }
      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(dedupeHealthPlanList(data.plans || []));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [especialidade, cidade, filters, lang]);

  useEffect(() => { load(); }, [load]);

  function pushFilters(next: SearchFilters) {
    setFilters(next);
    if (seoConvenioMode && next.convenio) {
      const qs = filtersToParams({ ...next, convenio: "" }).toString();
      router.replace(
        `${buildPublicSearchConvenioPath(especialidade, cidade, next.convenio)}${qs ? `?${qs}` : ""}`
      );
      return;
    }
    const qs = filtersToParams(next).toString();
    router.replace(`/especialistas/${especialidade}/${cidade}${qs ? `?${qs}` : ""}`);
  }

  function patchFilters(patch: Partial<SearchFilters>) {
    pushFilters({ ...filters, ...patch });
  }

  function applyConvenio(slug: string) {
    if (filters.convenio === slug) {
      if (seoConvenioMode) {
        router.replace(buildPublicSearchPath(especialidade, cidade));
        return;
      }
      patchFilters({ convenio: "" });
      return;
    }
    if (seoConvenioMode) {
      router.push(buildPublicSearchConvenioPath(especialidade, cidade, slug));
      return;
    }
    patchFilters({ convenio: slug });
  }

  function toggleFilter(key: "teleconsult" | "presencial") {
    patchFilters({
      teleconsult: key === "teleconsult" ? !filters.teleconsult : filters.teleconsult,
      presencial: key === "presencial" ? !filters.presencial : filters.presencial,
    });
  }

  function fmtPriceOption(value: string): string {
    if (!value) return t("pubSearch.priceAny");
    const n = Number(value);
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `R$ ${n}`;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-d8-dark text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <BrandLogoLink href="/" variant="on-dark" size="md" />
            <div className="flex items-center gap-3 text-sm shrink-0">
              <Link href="/login" className="text-white/80 transition hover:text-white">{t("pub.headerLogin")}</Link>
              <Link href="/register" className="rounded-lg bg-accent-500 px-4 py-2 font-semibold text-white transition hover:bg-accent-600">
                {t("pub.headerRegister")}
              </Link>
            </div>
          </div>
          <div className="mt-3">
            <h1 className="text-lg font-bold">
              {specialtyLabel}{" "}
              <span className="opacity-80">·</span> {cityLabel}
              {activePlan ? (
                <>
                  {" "}
                  <span className="opacity-80">·</span> {activePlan.name}
                </>
              ) : null}
            </h1>
            <p className="text-sm text-white/60 mt-0.5">
              {loading ? "..." : t("pubSearch.resultCount").replace("{n}", String(results.length))}
            </p>
          </div>
        </div>
      </header>

      {/* Filters row 1 */}
      <div className="bg-white border-b border-slate-100 sticky top-[88px] z-10">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => toggleFilter("teleconsult")}
            className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border transition ${
              filters.teleconsult ? "bg-accent-50 border-accent-300 text-accent-700" : "border-slate-200 text-slate-600"
            }`}
          >
            <Video size={13} /> {t("pubSearch.filterTele")}
          </button>
          <button
            type="button"
            onClick={() => toggleFilter("presencial")}
            className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border transition ${
              filters.presencial ? "bg-accent-50 border-accent-300 text-accent-700" : "border-slate-200 text-slate-600"
            }`}
          >
            <Building2 size={13} /> {t("pubSearch.filterInPerson")}
          </button>
          <button
            type="button"
            onClick={() => patchFilters({ availableOnly: !filters.availableOnly })}
            className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border transition ${
              filters.availableOnly ? "bg-accent-50 border-accent-300 text-accent-700" : "border-slate-200 text-slate-600"
            }`}
          >
            <Clock size={13} /> {t("pubSearch.filterAvailable")}
          </button>
          <button
            type="button"
            onClick={() => patchFilters({ acuraVolunteersOnly: !filters.acuraVolunteersOnly })}
            className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border transition ${
              filters.acuraVolunteersOnly ? "bg-sky-50 border-sky-300 text-sky-800" : "border-slate-200 text-slate-600"
            }`}
          >
            {t("acura.vol.filter")}
          </button>
        </div>

        {/* Filters row 2 ? sort & price */}
        <div className="max-w-6xl mx-auto px-4 pb-2 flex flex-wrap items-center gap-2 border-t border-slate-50">
          <span className="text-[11px] text-slate-400 inline-flex items-center gap-1 shrink-0">
            <SlidersHorizontal size={12} /> {t("pubSearch.sortLabel")}
          </span>
          <select
            value={filters.sort}
            onChange={(e) => patchFilters({ sort: e.target.value as PublicSearchSort })}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="name">{t("pubSearch.sortName")}</option>
            <option value="rating">{t("pubSearch.sortRating")}</option>
            <option value="reviews">{t("pubSearch.sortReviews")}</option>
            <option value="price_asc">{t("pubSearch.sortPriceAsc")}</option>
            <option value="price_desc">{t("pubSearch.sortPriceDesc")}</option>
            <option value="soonest">{t("pubSearch.sortSoonest")}</option>
          </select>

          <select
            value={filters.priceMax}
            onChange={(e) => patchFilters({ priceMax: e.target.value })}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            aria-label={t("pubSearch.priceMaxLabel")}
          >
            {PRICE_OPTIONS.map((v) => (
              <option key={v || "any"} value={v}>
                {v ? t("pubSearch.priceUpTo").replace("{p}", fmtPriceOption(v)) : t("pubSearch.priceAny")}
              </option>
            ))}
          </select>

          <select
            value={filters.minRating}
            onChange={(e) => patchFilters({ minRating: e.target.value })}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            aria-label={t("pubSearch.minRatingLabel")}
          >
            <option value="">{t("pubSearch.ratingAny")}</option>
            <option value="4">{t("pubSearch.ratingMin").replace("{n}", "4")}</option>
            <option value="4.5">{t("pubSearch.ratingMin").replace("{n}", "4.5")}</option>
          </select>
        </div>
      </div>

      {/* Insurance banner */}
      {plans.length > 0 && (
        <div className="border-y border-white/10 bg-d8-dark2 text-white">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <p className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Shield size={16} /> {t("pubSearch.insuranceTitle")}
            </p>
            <div className="flex flex-wrap gap-2">
              {plans.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyConvenio(p.slug)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                    filters.convenio === p.slug
                      ? "bg-white text-d8-dark"
                      : "bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6">
        <AcuraVolunteerSearchBanner
          volunteersOnly={filters.acuraVolunteersOnly}
          onToggleVolunteers={() =>
            patchFilters({ acuraVolunteersOnly: !filters.acuraVolunteersOnly })
          }
        />
        <div className="grid lg:grid-cols-[1fr_300px] gap-6 mt-4">
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
                <Loader2 className="animate-spin" size={24} />
                {t("pub.loading")}
              </div>
            ) : results.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <Search className="mx-auto text-slate-300 mb-3" size={40} />
                <p className="text-slate-600 font-medium">{t("pubSearch.empty")}</p>
                <p className="text-sm text-slate-400 mt-2">{t("pubSearch.emptyHint")}</p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 text-accent-600 font-semibold text-sm mt-4"
                >
                  {t("pubSearch.newSearch")} <ChevronRight size={14} />
                </Link>
              </div>
            ) : (
              results.map((pro) => (
                <div
                  key={`${pro.providerType}-${pro.providerId}`}
                  id={`card-${pro.providerId}`}
                  className={highlightId === pro.providerId ? "ring-2 ring-brand-400 rounded-2xl" : ""}
                >
                  <PublicResultCard pro={pro} onSelect={() => setHighlightId(pro.providerId)} />
                </div>
              ))
            )}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-36 bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
              <p className="text-xs font-semibold text-slate-500 px-1 mb-2 flex items-center gap-1">
                <MapPin size={12} /> {t("pubSearch.mapTitle")}
              </p>
              <PublicSearchMap
                results={results}
                onSelect={(pro) => {
                  setHighlightId(pro.providerId);
                  document.getElementById(`card-${pro.providerId}`)?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
