"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogoLink } from "@/components/brand/BrandLogo";
import { Sora } from "next/font/google";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getLandingContent } from "@/lib/landing-content";
import { Search, MapPin, Stethoscope, Loader2, Menu, X, CreditCard, Map as MapIcon } from "lucide-react";
import { cityToSeoSlug, buildPublicSearchConvenioPath } from "@/lib/public-slugs";
import { matchSymptomQuery } from "@/lib/symptom-search";
import LandingMarketingSections from "@/components/public/LandingMarketingSections";
import AcuraVolunteerSearchBanner from "@/components/acura/AcuraVolunteerSearchBanner";
import CookieBanner from "@/components/public/CookieBanner";
import LandingOptionPicker from "@/components/public/LandingOptionPicker";
import type { Lang } from "@/lib/i18n/translations";

const LandingMapPanel = dynamic(() => import("@/components/public/LandingMapPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 items-center justify-center rounded-2xl bg-white shadow-2xl">
      <Loader2 size={28} className="animate-spin text-accent-500" />
    </div>
  ),
});

const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"] });

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

type SearchMode = "specialty" | "symptom" | "convenio" | "map";

function nextLang(current: Lang): Lang {
  if (current === "pt") return "en";
  if (current === "en") return "es";
  return "pt";
}

function langLabel(l: Lang): string {
  if (l === "pt") return "EN";
  if (l === "en") return "ES";
  return "PT";
}

export default function EspecialistasLandingClient() {
  const { t, lang, setLang } = useI18n();
  const lc = getLandingContent(lang);
  const router = useRouter();
  const [mode, setMode] = useState<SearchMode>("specialty");
  const [specialty, setSpecialty] = useState("ginecologista");
  const [city, setCity] = useState("Rio de Janeiro");
  const [symptom, setSymptom] = useState("");
  const [symptomLoading, setSymptomLoading] = useState(false);
  const [symptomError, setSymptomError] = useState("");
  const [convenio, setConvenio] = useState("");
  const [healthPlans, setHealthPlans] = useState<{ slug: string; name: string }[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [acuraVolunteersOnly, setAcuraVolunteersOnly] = useState(false);

  useEffect(() => {
    fetch("/api/public/health-plans")
      .then((r) => r.json())
      .then((d) => {
        const plans = d.plans || [];
        setHealthPlans(plans);
        if (plans.length > 0 && !convenio) setConvenio(plans[0].slug);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSpecialtySearch(e: React.FormEvent) {
    e.preventDefault();
    const esp = specialty.trim();
    const citySlug = cityToSeoSlug(city);
    if (!esp || !citySlug) return;
    const qs = acuraVolunteersOnly ? "?acuraVolunteers=1" : "";
    router.push(`/especialistas/${esp}/${citySlug}${qs}`);
  }

  function handleConvenioSearch(e: React.FormEvent) {
    e.preventDefault();
    const esp = specialty.trim();
    const citySlug = cityToSeoSlug(city);
    const plan = convenio.trim();
    if (!esp || !citySlug || !plan) return;
    router.push(buildPublicSearchConvenioPath(esp, citySlug, plan));
  }

  async function handleSymptomSearch(e: React.FormEvent) {
    e.preventDefault();
    setSymptomError("");
    const q = symptom.trim();
    if (q.length < 3) return;

    setSymptomLoading(true);
    try {
      let specialtySlug = matchSymptomQuery(q, lang)?.specialtySlug;
      if (!specialtySlug) {
        const res = await fetch(
          `/api/public/symptom-search?q=${encodeURIComponent(q)}&lang=${encodeURIComponent(lang)}`,
        );
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

  const specialtyOptions = POPULAR_SPECIALTIES.map((s) => ({
    value: s.slug,
    label: t(s.labelKey),
  }));

  const healthPlanOptions = healthPlans.map((p) => ({
    value: p.slug,
    label: p.name,
  }));

  const platformLabel = lang === "pt" ? "Plataforma" : lang === "es" ? "Plataforma" : "Platform";

  const navLinks = [
    { href: "#platform", label: platformLabel },
    { href: "#how", label: lc.nav.how },
    { href: "#specialties", label: lc.nav.specialties },
    { href: "#club", label: lc.nav.club },
    { href: "#cannabis", label: lc.nav.cannabis },
    { href: "#energy", label: lc.nav.energy },
  ];

  const disclaimer =
    lang === "en"
      ? "Club Doctor is not a health plan or emergency service."
      : lang === "es"
        ? "Club Doctor no es un plan de salud ni servicio de emergencia."
        : "O Club Doctor n\u00e3o \u00e9 plano de sa\u00fade nem servi\u00e7o de emerg\u00eancia.";

  return (
    <div className={`${sora.className} min-h-screen bg-d8-dark overflow-x-hidden`}>
      <CookieBanner />

      <nav className="sticky top-0 z-50 border-b border-white/10 bg-d8-dark/95 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-2 sm:gap-4 px-4 sm:px-6 min-w-0">
          <BrandLogoLink href="/" variant="on-dark" size="md" className="shrink-0" />

          <ul className={`${mobileOpen ? "flex" : "hidden"} absolute left-0 right-0 top-[68px] z-50 flex-col gap-3 border-b border-white/10 bg-d8-dark px-6 py-4 md:static md:flex md:flex-1 md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0`}>
            {navLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setMobileOpen(false)} className="text-sm font-medium text-white/70 transition hover:text-white">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(nextLang(lang))}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/20"
            >
              {langLabel(lang)}
            </button>
            <Link href="/login" className="hidden rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/85 transition hover:border-white/40 hover:text-white sm:inline-block">
              {lc.nav.signIn}
            </Link>
            <Link href="/register" className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-600">
              {lc.nav.signUp}
            </Link>
            <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="text-white md:hidden" aria-label="Menu">
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-x-hidden bg-d8-hero px-6 pb-14 pt-10">
        <div className="pointer-events-none absolute -right-16 top-0 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-brand-500/15 blur-3xl" />

        <div className={`relative z-10 mx-auto ${mode === "map" ? "max-w-6xl" : "max-w-3xl"}`}>
          <div className="mb-8 text-center text-white">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {t("pubSearch.landingTitle")}
            </h1>
            <p className="mt-3 text-lg text-white/70">{t("pubSearch.landingSubtitle")}</p>
          </div>

          <div className="mb-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setMode("specialty")}
              className={`rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                mode === "specialty" ? "bg-white text-accent-600" : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              {t("symptom.modeSpecialty")}
            </button>
            <button
              type="button"
              onClick={() => setMode("symptom")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                mode === "symptom" ? "bg-white text-accent-600" : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <Stethoscope size={14} /> {t("symptom.modeSymptom")}
            </button>
            <button
              type="button"
              onClick={() => setMode("convenio")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                mode === "convenio" ? "bg-white text-accent-600" : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <CreditCard size={14} /> {t("symptom.modeConvenio")}
            </button>
            <button
              type="button"
              onClick={() => setMode("map")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                mode === "map" ? "bg-white text-accent-600" : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <MapIcon size={14} /> {t("symptom.modeMap")}
            </button>
          </div>

          {mode === "map" ? (
            <LandingMapPanel defaultQuery={city} />
          ) : mode === "specialty" ? (
            <form onSubmit={handleSpecialtySearch} className="relative z-20 flex flex-col gap-3 overflow-visible rounded-2xl bg-white p-4 shadow-2xl sm:flex-row sm:p-6">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("pubSearch.specialty")}</label>
                <LandingOptionPicker
                  value={specialty}
                  onChange={setSpecialty}
                  options={specialtyOptions}
                  label={t("pubSearch.specialty")}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("pubSearch.city")}</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t("pubSearch.cityPlaceholder")}
                    className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                  />
                </div>
              </div>
              <div className="sm:self-end">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-8 py-3 font-bold text-white transition hover:bg-accent-600 sm:w-auto"
                >
                  <Search size={18} /> {t("pubSearch.search")}
                </button>
              </div>
            </form>
          ) : mode === "convenio" ? (
            <form onSubmit={handleConvenioSearch} className="relative z-20 flex flex-col gap-3 overflow-visible rounded-2xl bg-white p-4 shadow-2xl sm:flex-row sm:flex-wrap sm:p-6">
              <div className="min-w-[140px] flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("pubSearch.specialty")}</label>
                <LandingOptionPicker
                  value={specialty}
                  onChange={setSpecialty}
                  options={specialtyOptions}
                  label={t("pubSearch.specialty")}
                />
              </div>
              <div className="min-w-[140px] flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("pubSearch.city")}</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t("pubSearch.cityPlaceholder")}
                    className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                  />
                </div>
              </div>
              <div className="min-w-[140px] flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("pubSearch.healthPlan")}</label>
                <LandingOptionPicker
                  value={convenio}
                  onChange={setConvenio}
                  options={
                    healthPlanOptions.length > 0
                      ? healthPlanOptions
                      : [{ value: "", label: t("pubSearch.selectHealthPlan") }]
                  }
                  label={t("pubSearch.healthPlan")}
                  disabled={healthPlanOptions.length === 0}
                />
              </div>
              <div className="sm:self-end">
                <button
                  type="submit"
                  disabled={!convenio}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-8 py-3 font-bold text-white transition hover:bg-accent-600 disabled:opacity-50 sm:w-auto"
                >
                  <Search size={18} /> {t("pubSearch.search")}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSymptomSearch} className="space-y-3 rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("symptom.label")}</label>
                <input
                  value={symptom}
                  onChange={(e) => setSymptom(e.target.value)}
                  placeholder={t("symptom.placeholder")}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                />
                <p className="mt-1 text-[11px] text-slate-400">{t("symptom.hint")}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("pubSearch.city")}</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t("pubSearch.cityPlaceholder")}
                    className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                  />
                </div>
              </div>
              {symptomError && <p className="text-xs text-red-600">{symptomError}</p>}
              <button
                type="submit"
                disabled={symptomLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-8 py-3 font-bold text-white transition hover:bg-accent-600 disabled:opacity-60"
              >
                {symptomLoading ? <Loader2 size={18} className="animate-spin" /> : <Stethoscope size={18} />}
                {t("symptom.search")}
              </button>
            </form>
          )}

          <div className="mt-4">
            <AcuraVolunteerSearchBanner
              compact
              volunteersOnly={acuraVolunteersOnly}
              onToggleVolunteers={() => setAcuraVolunteersOnly((v) => !v)}
            />
          </div>

          <p className="mt-4 text-center text-xs text-white/40">* {disclaimer}</p>
        </div>
      </section>

      <LandingMarketingSections />
    </div>
  );
}
