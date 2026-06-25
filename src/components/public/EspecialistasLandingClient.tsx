"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sora } from "next/font/google";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getLandingContent } from "@/lib/landing-content";
import { Search, MapPin, Stethoscope, Loader2, Menu, X } from "lucide-react";
import { cityToSeoSlug } from "@/lib/public-slugs";
import { matchSymptomQuery } from "@/lib/symptom-search";
import LandingMarketingSections from "@/components/public/LandingMarketingSections";
import CookieBanner from "@/components/public/CookieBanner";
import type { Lang } from "@/lib/i18n/translations";

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

type SearchMode = "specialty" | "symptom";

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
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const navLinks = [
    { href: "#how", label: lc.nav.how },
    { href: "#specialties", label: lc.nav.specialties },
    { href: "#club", label: lc.nav.club },
    { href: "#cannabis", label: lc.nav.cannabis },
    { href: "#energy", label: lc.nav.energy },
  ];

  return (
    <div className={`${sora.className} min-h-screen`}>
      <style jsx global>{`
        .landing-heading { font-family: ${sora.style.fontFamily}, sans-serif; }
        .landing-fade-in { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .landing-fade-in.visible { opacity: 1; transform: translateY(0); }
      `}</style>

      <CookieBanner />

      {/* Nav */}
      <nav className="sticky top-0 z-[100] border-b border-white/8 bg-[#0c1a27]/97 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-6 px-6">
          <Link href="/" className="text-[22px] font-extrabold text-white">
            Doctor<span className="text-accent-500">8</span>
          </Link>

          <ul className={`${mobileOpen ? "flex" : "hidden"} absolute left-0 right-0 top-[68px] flex-col gap-4 border-b border-white/10 bg-[#0c1a27] px-6 py-4 md:static md:flex md:flex-1 md:flex-row md:border-0 md:bg-transparent md:p-0`}>
            {navLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setMobileOpen(false)} className="text-sm font-medium text-white/70 transition hover:text-white">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="ml-auto flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setLang(nextLang(lang))}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/20"
            >
              {langLabel(lang)}
            </button>
            <Link href="/login" className="hidden rounded-[10px] border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/50 hover:text-white sm:inline-block">
              {lc.nav.signIn}
            </Link>
            <Link href="/register" className="rounded-[10px] bg-accent-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-600">
              {lc.nav.signUp}
            </Link>
            <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="text-white md:hidden" aria-label="Menu">
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero + Search */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0c1a27] via-[#0d2d42] to-[#0f4d66] px-6 pb-16 pt-12">
        <div className="pointer-events-none absolute -right-10 -top-20 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(224,89,48,0.25)_0%,transparent_65%)]" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-[350px] w-[350px] rounded-full bg-[radial-gradient(circle,rgba(224,89,48,0.12)_0%,transparent_65%)]" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="mb-8 text-center text-white">
            <h1 className="landing-heading text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {t("pubSearch.landingTitle")}
            </h1>
            <p className="mt-3 text-lg text-white/65">{t("pubSearch.landingSubtitle")}</p>
          </div>

          <div className="mb-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setMode("specialty")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === "specialty" ? "bg-white text-accent-600" : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              {t("symptom.modeSpecialty")}
            </button>
            <button
              type="button"
              onClick={() => setMode("symptom")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === "symptom" ? "bg-white text-accent-600" : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <Stethoscope size={15} /> {t("symptom.modeSymptom")}
            </button>
          </div>

          {mode === "specialty" ? (
            <form onSubmit={handleSpecialtySearch} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-2xl sm:flex-row sm:p-6">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("pubSearch.specialty")}</label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                >
                  {POPULAR_SPECIALTIES.map((s) => (
                    <option key={s.slug} value={s.slug}>{t(s.labelKey)}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("pubSearch.city")}</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t("pubSearch.cityPlaceholder")}
                    className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/40"
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
          ) : (
            <form onSubmit={handleSymptomSearch} className="space-y-3 rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("symptom.label")}</label>
                <input
                  value={symptom}
                  onChange={(e) => setSymptom(e.target.value)}
                  placeholder={t("symptom.placeholder")}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/40"
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
                    className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/40"
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

          <p className="mt-5 text-center text-xs text-white/35">
            * {lang === "en" ? "Club Doctor is not a health plan or emergency service." : lang === "es" ? "Club Doctor no es un plan de salud ni servicio de emergencia." : "O Club Doctor não é plano de saúde nem serviço de emergência."}
          </p>
        </div>
      </section>

      <LandingMarketingSections />
    </div>
  );
}
