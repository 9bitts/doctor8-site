"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogoLink } from "@/components/brand/BrandLogo";
import { Sora } from "next/font/google";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getLandingContent } from "@/lib/landing-content";
import {
  Search,
  MapPin,
  Stethoscope,
  Loader2,
  Menu,
  X,
  CreditCard,
  Map as MapIcon,
  HeartHandshake,
} from "lucide-react";
import { cityToSeoSlug, buildPublicSearchConvenioPath } from "@/lib/public-slugs";
import LandingMarketingSections from "@/components/public/LandingMarketingSections";
import AcuraVolunteerBadge from "@/components/acura/AcuraVolunteerBadge";
import CookieBanner from "@/components/public/CookieBanner";
import LandingOptionPicker from "@/components/public/LandingOptionPicker";
import SymptomMatchPicker, { type SymptomMatchOption } from "@/components/public/SymptomMatchPicker";
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

type SearchMode = "specialty" | "symptom" | "convenio" | "map";

type SpecialtyRow = { slug: string; label: string; count: number };

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

const MODE_TABS: { id: SearchMode; icon?: typeof Stethoscope }[] = [
  { id: "specialty" },
  { id: "symptom", icon: Stethoscope },
  { id: "convenio", icon: CreditCard },
  { id: "map", icon: MapIcon },
];

function modeLabel(mode: SearchMode, t: (k: string) => string): string {
  if (mode === "specialty") return t("symptom.modeSpecialty");
  if (mode === "symptom") return t("symptom.modeSymptom");
  if (mode === "convenio") return t("symptom.modeConvenio");
  return t("symptom.modeMap");
}

function CityField({
  city,
  onChange,
  placeholder,
}: {
  city: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={city}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
      />
    </div>
  );
}

export default function EspecialistasLandingClient() {
  const { t, lang, setLang } = useI18n();
  const lc = getLandingContent(lang);
  const router = useRouter();

  const [mode, setMode] = useState<SearchMode>("specialty");
  const [specialty, setSpecialty] = useState("");
  const [acuraSpecialty, setAcuraSpecialty] = useState("");
  const [city, setCity] = useState("Rio de Janeiro");
  const [acuraCity, setAcuraCity] = useState("Rio de Janeiro");
  const [symptom, setSymptom] = useState("");
  const [symptomLoading, setSymptomLoading] = useState(false);
  const [symptomError, setSymptomError] = useState("");
  const [symptomMatches, setSymptomMatches] = useState<SymptomMatchOption[]>([]);
  const [symptomAiUsed, setSymptomAiUsed] = useState(false);
  const [convenio, setConvenio] = useState("");
  const [specialties, setSpecialties] = useState<SpecialtyRow[]>([]);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(true);
  const [healthPlans, setHealthPlans] = useState<{ slug: string; name: string }[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const loadCatalogs = useCallback(async () => {
    setSpecialtiesLoading(true);
    try {
      const [specRes, plansRes] = await Promise.all([
        fetch(`/api/public/specialties?lang=${encodeURIComponent(lang)}`),
        fetch("/api/public/health-plans?usedOnly=1"),
      ]);
      if (specRes.ok) {
        const data = await specRes.json();
        const rows: SpecialtyRow[] = (data.specialties || []).map(
          (s: { slug: string; label: string; count: number }) => ({
            slug: s.slug,
            label: s.label,
            count: s.count,
          }),
        );
        setSpecialties(rows);
        if (rows.length > 0) {
          setSpecialty((prev) => prev || rows[0].slug);
          setAcuraSpecialty((prev) => prev || rows[0].slug);
        }
      }
      if (plansRes.ok) {
        const data = await plansRes.json();
        const plans = data.plans || [];
        setHealthPlans(plans);
        if (plans.length > 0) setConvenio((prev) => prev || plans[0].slug);
      }
    } catch {
      /* ignore */
    }
    setSpecialtiesLoading(false);
  }, [lang]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  const specialtyOptions = specialties.map((s) => ({
    value: s.slug,
    label: s.label,
    meta: s.count > 0 ? `${s.count}` : undefined,
  }));

  const healthPlanOptions = healthPlans.map((p) => ({
    value: p.slug,
    label: p.name,
  }));

  function goSearch(esp: string, cityInput: string, acuraOnly = false) {
    const citySlug = cityToSeoSlug(cityInput);
    if (!esp || !citySlug) return;
    const qs = acuraOnly ? "?acuraVolunteers=1" : "";
    router.push(`/especialistas/${esp}/${citySlug}${qs}`);
  }

  function handleSpecialtySearch(e: React.FormEvent) {
    e.preventDefault();
    goSearch(specialty.trim(), city);
  }

  function handleAcuraSearch(e: React.FormEvent) {
    e.preventDefault();
    goSearch(acuraSpecialty.trim(), acuraCity, true);
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
    setSymptomMatches([]);
    const q = symptom.trim();
    if (q.length < 2) return;

    setSymptomLoading(true);
    try {
      const res = await fetch(
        `/api/public/symptom-search?q=${encodeURIComponent(q)}&lang=${encodeURIComponent(lang)}`,
      );
      const data = await res.json();
      const matches: SymptomMatchOption[] = (data.matches || []).map(
        (m: { specialtySlug: string; label: string; reason?: string }) => ({
          specialtySlug: m.specialtySlug,
          label: m.label,
          reason: m.reason,
        }),
      );
      setSymptomAiUsed(!!data.aiUsed);
      if (matches.length === 0) {
        setSymptomError(t("symptom.noMatch"));
        return;
      }
      if (matches.length === 1) {
        goSearch(matches[0].specialtySlug, city);
        return;
      }
      setSymptomMatches(matches);
    } catch {
      setSymptomError(t("symptom.noMatch"));
    } finally {
      setSymptomLoading(false);
    }
  }

  function pickSymptomMatch(slug: string) {
    goSearch(slug, city);
  }

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
        : "O Club Doctor não é plano de saúde nem serviço de emergência.";

  const formShell = "relative z-20 overflow-visible rounded-2xl bg-white p-5 shadow-2xl sm:p-6";
  const fieldLabel = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className={`${sora.className} min-h-screen bg-d8-dark overflow-x-hidden`}>
      <CookieBanner />

      <nav className="sticky top-0 z-50 border-b border-white/10 bg-d8-dark/95 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-2 sm:gap-4 px-4 sm:px-6 min-w-0">
          <BrandLogoLink href="/" variant="on-dark" size="md" className="shrink-0" />
          <ul
            className={`${mobileOpen ? "flex" : "hidden"} absolute left-0 right-0 top-[68px] z-50 flex-col gap-3 border-b border-white/10 bg-d8-dark px-6 py-4 md:static md:flex md:flex-1 md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0`}
          >
            {navLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-medium text-white/70 transition hover:text-white"
                >
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
            <Link
              href="/login"
              className="hidden rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/85 transition hover:border-white/40 hover:text-white sm:inline-block"
            >
              {lc.nav.signIn}
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-600"
            >
              {lc.nav.signUp}
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-white md:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-x-hidden bg-d8-hero px-4 pb-14 pt-10 sm:px-6">
        <div className="pointer-events-none absolute -right-16 top-0 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-brand-500/15 blur-3xl" />

        <div className={`relative z-10 mx-auto ${mode === "map" ? "max-w-6xl" : "max-w-3xl"}`}>
          <div className="mb-8 text-center text-white">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {t("pubSearch.landingTitle")}
            </h1>
            <p className="mt-3 text-lg text-white/70">{t("pubSearch.landingSubtitle")}</p>
          </div>

          <div className="mb-5 flex flex-wrap justify-center gap-2">
            {MODE_TABS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setMode(id);
                  setSymptomMatches([]);
                  setSymptomError("");
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  mode === id
                    ? "bg-white text-accent-600 shadow-lg"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                {Icon && <Icon size={14} />}
                {modeLabel(id, t)}
              </button>
            ))}
          </div>

          {mode === "map" ? (
            <LandingMapPanel defaultQuery={city} />
          ) : mode === "specialty" ? (
            <form onSubmit={handleSpecialtySearch} className={`${formShell} space-y-4`}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={fieldLabel}>{t("pubSearch.specialty")}</label>
                  <LandingOptionPicker
                    value={specialty}
                    onChange={setSpecialty}
                    options={specialtyOptions}
                    label={t("pubSearch.specialty")}
                    searchable
                    searchPlaceholder={t("pubSearch.searchSpecialty")}
                    loading={specialtiesLoading}
                    disabled={specialtyOptions.length === 0}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>{t("pubSearch.city")}</label>
                  <CityField city={city} onChange={setCity} placeholder={t("pubSearch.cityPlaceholder")} />
                </div>
              </div>
              <button
                type="submit"
                disabled={!specialty || specialtiesLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-8 py-3.5 font-bold text-white transition hover:bg-accent-600 disabled:opacity-50"
              >
                <Search size={18} /> {t("pubSearch.search")}
              </button>
            </form>
          ) : mode === "convenio" ? (
            <form onSubmit={handleConvenioSearch} className={`${formShell} space-y-4`}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={fieldLabel}>{t("pubSearch.specialty")}</label>
                  <LandingOptionPicker
                    value={specialty}
                    onChange={setSpecialty}
                    options={specialtyOptions}
                    label={t("pubSearch.specialty")}
                    searchable
                    searchPlaceholder={t("pubSearch.searchSpecialty")}
                    loading={specialtiesLoading}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>{t("pubSearch.city")}</label>
                  <CityField city={city} onChange={setCity} placeholder={t("pubSearch.cityPlaceholder")} />
                </div>
                <div className="sm:col-span-2">
                  <label className={fieldLabel}>{t("pubSearch.healthPlan")}</label>
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
              </div>
              <button
                type="submit"
                disabled={!convenio || !specialty}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-8 py-3.5 font-bold text-white transition hover:bg-accent-600 disabled:opacity-50"
              >
                <Search size={18} /> {t("pubSearch.search")}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSymptomSearch} className={`${formShell} space-y-4`}>
              <div>
                <label className={fieldLabel}>{t("symptom.label")}</label>
                <input
                  value={symptom}
                  onChange={(e) => {
                    setSymptom(e.target.value);
                    setSymptomMatches([]);
                    setSymptomError("");
                  }}
                  placeholder={t("symptom.placeholder")}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">{t("symptom.aiHint")}</p>
              </div>
              <div>
                <label className={fieldLabel}>{t("pubSearch.city")}</label>
                <CityField city={city} onChange={setCity} placeholder={t("pubSearch.cityPlaceholder")} />
              </div>
              {symptomError && <p className="text-xs text-red-600">{symptomError}</p>}
              {symptomMatches.length > 0 && (
                <SymptomMatchPicker
                  matches={symptomMatches}
                  aiUsed={symptomAiUsed}
                  onSelect={pickSymptomMatch}
                />
              )}
              <button
                type="submit"
                disabled={symptomLoading || symptom.trim().length < 2}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-8 py-3.5 font-bold text-white transition hover:bg-accent-600 disabled:opacity-60"
              >
                {symptomLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Stethoscope size={18} />
                )}
                {t("symptom.search")}
              </button>
            </form>
          )}

          {/* AcuraBrasil volunteer search — separate block */}
          {mode !== "map" && (
            <div className="mt-5 rounded-2xl border border-sky-300/40 bg-sky-950/40 p-5 backdrop-blur-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <HeartHandshake size={18} className="text-sky-300" />
                <h2 className="text-sm font-bold text-white">{t("acura.vol.landingSectionTitle")}</h2>
                <AcuraVolunteerBadge size="sm" showInfoIcon={false} />
              </div>
              <p className="mb-4 text-xs leading-relaxed text-sky-100/90">
                {t("acura.vol.landingSectionDesc")}
              </p>
              <form onSubmit={handleAcuraSearch} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <LandingOptionPicker
                  value={acuraSpecialty}
                  onChange={setAcuraSpecialty}
                  options={specialtyOptions}
                  label={t("pubSearch.specialty")}
                  searchable
                  searchPlaceholder={t("pubSearch.searchSpecialty")}
                  loading={specialtiesLoading}
                />
                <CityField
                  city={acuraCity}
                  onChange={setAcuraCity}
                  placeholder={t("pubSearch.cityPlaceholder")}
                />
                <button
                  type="submit"
                  disabled={!acuraSpecialty || specialtiesLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-400 disabled:opacity-50 sm:self-end"
                >
                  <Search size={16} /> {t("acura.vol.landingSearch")}
                </button>
              </form>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-white/40">* {disclaimer}</p>
        </div>
      </section>

      <LandingMarketingSections />
    </div>
  );
}
