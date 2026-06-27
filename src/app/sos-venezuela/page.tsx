"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Heart, ChevronRight, Stethoscope, Users, ExternalLink,
  UserPlus, Radio,
} from "lucide-react";
import {
  DEFAULT_VENEZUELA_POOLS,
  HUMANITARIAN_LANDING_URL,
  VENEZUELA_CAMPAIGN_SLUG,
} from "@/lib/humanitarian/constants";
import { translate, Lang } from "@/lib/i18n/translations";
import HumanitarianLangSwitcher, {
  getHumanitarianLang,
} from "@/components/humanitarian/HumanitarianLangSwitcher";

function t(lang: Lang, key: string) {
  return translate(lang, key);
}

function poolName(slug: string, lang: Lang) {
  const p = DEFAULT_VENEZUELA_POOLS.find((x) => x.slug === slug);
  if (!p) return slug;
  if (lang === "pt") return p.labelPt;
  if (lang === "en") return p.labelEn;
  return p.labelEs;
}

export default function SosVenezuelaPage() {
  const [lang, setLang] = useState<Lang>("es");

  useEffect(() => {
    setLang(getHumanitarianLang());
  }, []);

  const campaignPath = `/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`;
  const patientRegister = `/register?region=VE&role=PATIENT&callbackUrl=${encodeURIComponent("/patient")}`;
  const patientLogin = `/login?callbackUrl=${encodeURIComponent("/patient")}`;
  const volRegister = `/register?region=VE&role=PROFESSIONAL&callbackUrl=${encodeURIComponent("/humanitarian/volunteer")}`;
  const volLogin = `/login?callbackUrl=${encodeURIComponent("/humanitarian/volunteer")}`;
  const psychoVolRegister = `/register?region=VE&role=PSYCHOANALYST&callbackUrl=${encodeURIComponent("/humanitarian/volunteer")}`;

  const steps = [
    "hum.landing.step1",
    "hum.landing.step2",
    "hum.landing.step3",
    "hum.landing.step4",
    "hum.landing.step5",
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
              <Heart size={18} className="text-rose-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-rose-300 uppercase tracking-wide truncate">
                {t(lang, "hum.landing.heroEyebrow")}
              </p>
              <p className="text-sm font-bold truncate">SOS Venezuela</p>
            </div>
          </div>
          <HumanitarianLangSwitcher lang={lang} onChange={setLang} dark />
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 pb-16">
        <section className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
            {t(lang, "hum.landing.heroTitle")}
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            {t(lang, "hum.landing.heroDesc")}
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Link
            href={patientRegister}
            className="group bg-emerald-500 hover:bg-emerald-400 rounded-2xl p-5 sm:p-6 transition shadow-lg shadow-emerald-900/30"
          >
            <UserPlus size={24} className="mb-3" />
            <p className="font-bold text-lg">{t(lang, "hum.landing.ctaPatient")}</p>
            <p className="text-sm text-emerald-950/80 mt-1">{t(lang, "hum.landing.ctaPatientHint")}</p>
            <ChevronRight size={18} className="mt-3 opacity-70 group-hover:translate-x-0.5 transition" />
          </Link>
          <Link
            href={volRegister}
            className="group bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl p-5 sm:p-6 transition"
          >
            <Stethoscope size={24} className="mb-3 text-rose-300" />
            <p className="font-bold text-lg">{t(lang, "hum.landing.ctaVolunteer")}</p>
            <p className="text-sm text-slate-400 mt-1">{t(lang, "hum.landing.ctaVolunteerHint")}</p>
            <ChevronRight size={18} className="mt-3 text-slate-500 group-hover:translate-x-0.5 transition" />
          </Link>
        </section>

        <p className="text-center text-sm text-slate-500">
          {t(lang, "hum.landing.hasAccount")}{" "}
          <Link href={patientLogin} className="text-emerald-400 hover:text-emerald-300 font-medium">
            {t(lang, "hum.landing.login")}
          </Link>
          {" ? "}
          <Link href={volLogin} className="text-emerald-400 hover:text-emerald-300 font-medium">
            {t(lang, "hum.shell.volunteer")}
          </Link>
          {" ? "}
          <Link href={psychoVolRegister} className="text-emerald-400 hover:text-emerald-300 font-medium">
            {t(lang, "hum.landing.psychoVolunteer")}
          </Link>
        </p>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Radio size={18} className="text-emerald-400" />
            {t(lang, "hum.landing.howTitle")}
          </h2>
          <ol className="space-y-3">
            {steps.map((key, i) => (
              <li key={key} className="flex gap-3 text-sm text-slate-300">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="pt-0.5">{t(lang, key)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Users size={18} className="text-rose-400" />
            {t(lang, "hum.landing.poolsTitle")}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEFAULT_VENEZUELA_POOLS.map((p) => (
              <div
                key={p.slug}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm"
              >
                <p className="font-medium">{poolName(p.slug, lang)}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === "en" ? "Up to" : lang === "pt" ? "At?" : "Hasta"} {p.maxWaiting}{" "}
                  {lang === "en" ? "in queue" : lang === "pt" ? "na fila" : "en fila"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <p className="text-xs text-slate-500 leading-relaxed text-center px-2">
          {t(lang, "hum.landing.disclaimer")}
        </p>

        <a
          href={HUMANITARIAN_LANDING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition py-2"
        >
          <ExternalLink size={14} />
          {t(lang, "hum.landing.partner")}
        </a>
      </main>
    </div>
  );
}
