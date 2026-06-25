"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Search, MapPin, ChevronRight, Stethoscope, Loader2 } from "lucide-react";
import { cityToSeoSlug } from "@/lib/public-slugs";
import { matchSymptomQuery } from "@/lib/symptom-search";

const POPULAR_SPECIALTIES = [
  { slug: "ginecologista", labelKey: "pubSearch.spec.ginecologista" },
  { slug: "psiquiatra", labelKey: "pubSearch.spec.psiquiatra" },
  { slug: "psicologo", labelKey: "pubSearch.spec.psicologo" },
  { slug: "psicanalista", labelKey: "pubSearch.spec.psicanalista" },
  { slug: "nutricionista", labelKey: "pubSearch.spec.nutricionista" },
  { slug: "dermatologista", labelKey: "pubSearch.spec.dermatologista" },
  { slug: "ortopedista", labelKey: "pubSearch.spec.ortopedista" },
  { slug: "cardiologista", labelKey: "pubSearch.spec.cardiologista" },
];

const POPULAR_CITIES = [
  { slug: "rio-de-janeiro", label: "Rio de Janeiro" },
  { slug: "sao-paulo", label: "São Paulo" },
  { slug: "brasilia", label: "Brasília" },
  { slug: "belo-horizonte", label: "Belo Horizonte" },
  { slug: "online", labelKey: "pubSearch.cityOnline" },
];

type SearchMode = "specialty" | "symptom";

export default function EspecialistasLandingClient() {
  const { t } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<SearchMode>("specialty");
  const [specialty, setSpecialty] = useState("ginecologista");
  const [city, setCity] = useState("Rio de Janeiro");
  const [symptom, setSymptom] = useState("");
  const [symptomLoading, setSymptomLoading] = useState(false);
  const [symptomError, setSymptomError] = useState("");

  function handleSpecialtySearch(e: React.FormEvent) {
    e.preventDefault();
    const esp = specialty.trim();
    const citySlug = cityToSeoSlug(city);
    if (!esp || !citySlug) return;
    router.push(`/especialistas/${esp}/${citySlug}`);
  }

  async function handleSymptomSearch(e: React.FormEvent) {
    e.preventDefault();
    setSymptomError("");
    const q = symptom.trim();
    if (q.length < 3) return;

    setSymptomLoading(true);
    try {
      let specialtySlug = matchSymptomQuery(q)?.specialtySlug;
      if (!specialtySlug) {
        const res = await fetch(`/api/public/symptom-search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        specialtySlug = data.match?.specialtySlug;
      }
      if (!specialtySlug) {
        setSymptomError(t("symptom.noMatch"));
        return;
      }
      const citySlug = cityToSeoSlug(city) || "online";
      router.push(`/especialistas/${specialtySlug}/${citySlug}`);
    } catch {
      setSymptomError(t("symptom.noMatch"));
    } finally {
      setSymptomLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-500 to-brand-700">
      <header className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between text-white">
        <span className="text-xl font-black">
          Doctor<span className="text-accent-400">8</span>
        </span>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/login" className="hover:underline opacity-90">{t("pub.headerLogin")}</Link>
          <Link href="/register" className="bg-white text-brand-600 font-semibold px-4 py-2 rounded-full">
            {t("pub.headerRegister")}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pb-16">
        <div className="text-center text-white pt-8 pb-6">
          <h1 className="text-3xl sm:text-4xl font-black">{t("pubSearch.landingTitle")}</h1>
          <p className="text-brand-100 mt-3 text-lg">{t("pubSearch.landingSubtitle")}</p>
        </div>

        <div className="flex justify-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode("specialty")}
            className={`text-sm font-semibold px-4 py-2 rounded-full transition ${
              mode === "specialty" ? "bg-white text-brand-600" : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            {t("symptom.modeSpecialty")}
          </button>
          <button
            type="button"
            onClick={() => setMode("symptom")}
            className={`text-sm font-semibold px-4 py-2 rounded-full transition inline-flex items-center gap-1.5 ${
              mode === "symptom" ? "bg-white text-brand-600" : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            <Stethoscope size={15} /> {t("symptom.modeSymptom")}
          </button>
        </div>

        {mode === "specialty" ? (
          <form
            onSubmit={handleSpecialtySearch}
            className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 flex flex-col sm:flex-row gap-3"
          >
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 mb-1 block">{t("pubSearch.specialty")}</label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                {POPULAR_SPECIALTIES.map((s) => (
                  <option key={s.slug} value={s.slug}>{t(s.labelKey)}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 mb-1 block">{t("pubSearch.city")}</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("pubSearch.cityPlaceholder")}
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
            </div>
            <div className="sm:self-end">
              <button
                type="submit"
                className="w-full sm:w-auto bg-brand-500 hover:bg-brand-400 text-white font-bold px-8 py-3 rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Search size={18} /> {t("pubSearch.search")}
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={handleSymptomSearch}
            className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 space-y-3"
          >
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">{t("symptom.label")}</label>
              <input
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
                placeholder={t("symptom.placeholder")}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
              <p className="text-[11px] text-slate-400 mt-1">{t("symptom.hint")}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">{t("pubSearch.city")}</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("pubSearch.cityPlaceholder")}
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
            </div>
            {symptomError && <p className="text-xs text-red-600">{symptomError}</p>}
            <button
              type="submit"
              disabled={symptomLoading}
              className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white font-bold px-8 py-3 rounded-xl flex items-center justify-center gap-2 transition"
            >
              {symptomLoading ? <Loader2 size={18} className="animate-spin" /> : <Stethoscope size={18} />}
              {t("symptom.search")}
            </button>
          </form>
        )}

        <div className="mt-10">
          <p className="text-brand-100 text-sm font-medium mb-3">{t("pubSearch.popularTitle")}</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SPECIALTIES.map((s) =>
              POPULAR_CITIES.slice(0, 3).map((c) => (
                <Link
                  key={`${s.slug}-${c.slug}`}
                  href={`/especialistas/${s.slug}/${c.slug}`}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-full transition inline-flex items-center gap-1"
                >
                  {t(s.labelKey)} · {c.label || t(c.labelKey!)}
                  <ChevronRight size={12} />
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
