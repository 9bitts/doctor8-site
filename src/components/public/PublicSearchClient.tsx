"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  Search, Loader2, Video, Building2, Shield, ChevronRight, MapPin,
} from "lucide-react";
import type { PublicSearchResult } from "@/lib/public-search";
import PublicResultCard from "@/components/public/PublicResultCard";
import {
  seoSlugToSpecialtyLabel,
  citySlugToLabel,
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

export default function PublicSearchClient({
  especialidade,
  cidade,
}: {
  especialidade: string;
  cidade: string;
}) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [results, setResults] = useState<PublicSearchResult[]>([]);
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [convenio, setConvenio] = useState(searchParams.get("convenio") || "");
  const [teleconsult, setTeleconsult] = useState(searchParams.get("teleconsult") === "1");
  const [presencial, setPresencial] = useState(searchParams.get("presencial") === "1");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const specialtyLabel = seoSlugToSpecialtyLabel(especialidade, lang);
  const cityLabel = citySlugToLabel(cidade);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        especialidade,
        cidade,
        lang,
      });
      if (convenio) params.set("convenio", convenio);
      if (teleconsult) params.set("teleconsult", "1");
      if (presencial) params.set("presencial", "1");

      const [searchRes, plansRes] = await Promise.all([
        fetch(`/api/public/search?${params}`),
        fetch("/api/public/health-plans"),
      ]);

      if (searchRes.ok) {
        const data = await searchRes.json();
        setResults(data.results || []);
      }
      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [especialidade, cidade, convenio, teleconsult, presencial, lang]);

  useEffect(() => { load(); }, [load]);

  function applyConvenio(slug: string) {
    const next = convenio === slug ? "" : slug;
    setConvenio(next);
    const params = new URLSearchParams();
    if (next) params.set("convenio", next);
    if (teleconsult) params.set("teleconsult", "1");
    if (presencial) params.set("presencial", "1");
    const qs = params.toString();
    router.replace(`/especialistas/${especialidade}/${cidade}${qs ? `?${qs}` : ""}`);
  }

  function toggleFilter(key: "teleconsult" | "presencial") {
    const params = new URLSearchParams();
    const nextTele = key === "teleconsult" ? !teleconsult : teleconsult;
    const nextPres = key === "presencial" ? !presencial : presencial;
    setTeleconsult(nextTele);
    setPresencial(nextPres);
    if (convenio) params.set("convenio", convenio);
    if (nextTele) params.set("teleconsult", "1");
    if (nextPres) params.set("presencial", "1");
    const qs = params.toString();
    router.replace(`/especialistas/${especialidade}/${cidade}${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-brand-500 text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link href="/especialistas" className="text-xl font-black shrink-0">
              Doctor<span className="text-accent-400">8</span>
            </Link>
            <div className="flex items-center gap-3 text-sm shrink-0">
              <Link href="/login" className="hover:underline opacity-90">{t("pub.headerLogin")}</Link>
              <Link href="/register" className="bg-white text-brand-600 font-semibold px-4 py-2 rounded-full">
                {t("pub.headerRegister")}
              </Link>
            </div>
          </div>
          <div className="mt-3">
            <h1 className="text-lg font-bold">
              {specialtyLabel} <span className="opacity-80">?</span> {cityLabel}
            </h1>
            <p className="text-sm text-brand-100 mt-0.5">
              {loading ? "..." : t("pubSearch.resultCount").replace("{n}", String(results.length))}
            </p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b border-slate-100 sticky top-[88px] z-10">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => toggleFilter("teleconsult")}
            className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border transition ${
              teleconsult ? "bg-brand-50 border-brand-300 text-brand-700" : "border-slate-200 text-slate-600"
            }`}
          >
            <Video size={13} /> {t("pubSearch.filterTele")}
          </button>
          <button
            type="button"
            onClick={() => toggleFilter("presencial")}
            className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border transition ${
              presencial ? "bg-brand-50 border-brand-300 text-brand-700" : "border-slate-200 text-slate-600"
            }`}
          >
            <Building2 size={13} /> {t("pubSearch.filterInPerson")}
          </button>
        </div>
      </div>

      {/* Insurance banner */}
      {plans.length > 0 && (
        <div className="bg-brand-600 text-white">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <p className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Shield size={16} /> {t("pubSearch.insuranceTitle")}
            </p>
            <div className="flex flex-wrap gap-2">
              {plans.slice(0, 8).map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => applyConvenio(p.slug)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                    convenio === p.slug
                      ? "bg-white text-brand-600"
                      : "bg-brand-500/50 text-white hover:bg-brand-500"
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
        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
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
                  href="/especialistas"
                  className="inline-flex items-center gap-1 text-brand-600 font-semibold text-sm mt-4"
                >
                  {t("pubSearch.newSearch")} <ChevronRight size={14} />
                </Link>
              </div>
            ) : (
              results.map((pro) => (
                <div
                  key={`${pro.providerType}-${pro.providerId}`}
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
