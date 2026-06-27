"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Check, Heart, ChevronRight,
  Stethoscope, Brain, Sparkles, Leaf, Dumbbell, Utensils,
  type LucideIcon,
} from "lucide-react";
import type { HumanitarianPoolSlug } from "@/lib/humanitarian/constants";
import { getProLandingContent } from "@/lib/professional-landing-content";
import { detectInitialLang } from "@/components/auth/register-shared";
import { ProNav, ProFooter } from "@/components/professional/ProfessionalLandingClient";

const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  brain: Brain,
  sparkles: Sparkles,
  leaf: Leaf,
  dumbbell: Dumbbell,
  utensils: Utensils,
  heart: Heart,
};

export default function ProfessionalProfessionClient({ slug }: { slug: HumanitarianPoolSlug }) {
  const [lang, setLang] = useState<"pt" | "en" | "es">("pt");
  useEffect(() => { setLang(detectInitialLang()); }, []);

  const c = getProLandingContent(lang);
  const prof = c.professionPages[slug];
  const Icon = ICONS[prof.icon] ?? Stethoscope;
  const isPsycho = slug === "psicanalista";
  const signupRole = isPsycho ? "PSYCHOANALYST" : "PROFESSIONAL";
  const signup = `/register/professional/signup?role=${signupRole}`;
  const volSignup = `/register/professional/signup?region=VE&role=${signupRole}&callbackUrl=${encodeURIComponent("/humanitarian/volunteer")}`;

  return (
    <div className="min-h-screen bg-white font-sans text-d8-text antialiased">
      <ProNav c={c} lang={lang} onLangChange={setLang} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-d8-dark px-6 py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(23,106,136,0.2),transparent_55%)]" />
        <div className="relative z-10 mx-auto max-w-[1180px]">
          <Link href="/register/professional" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-white/50 transition hover:text-white">
            <ArrowLeft size={16} /> Doctor8 Profissionais
          </Link>
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-400">
                <Icon size={32} />
              </div>
              <h1 className="mb-4 text-[clamp(2rem,4vw,3rem)] font-extrabold leading-tight tracking-tight text-white">
                {prof.title}
              </h1>
              <p className="mb-2 text-xl font-semibold text-accent-400">{prof.subtitle}</p>
              <p className="mb-8 max-w-2xl text-base leading-relaxed text-white/60">{prof.heroDesc}</p>
              <div className="flex flex-wrap gap-3">
                <Link href={signup} className="inline-flex items-center gap-2 rounded-2xl bg-accent-500 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-accent-600">
                  {prof.ctaPrimary} <ArrowRight size={16} />
                </Link>
                <Link href={volSignup} className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-7 py-3.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20">
                  <Heart size={16} /> {prof.ctaVolunteer}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="bg-d8-off px-6 py-16">
        <div className="mx-auto max-w-[1180px]">
          <h2 className="mb-10 text-2xl font-extrabold tracking-tight text-d8-dark sm:text-3xl">
            {lang === "pt" ? "Como usar a Doctor8" : lang === "es" ? "C?mo usar Doctor8" : "How to use Doctor8"}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {prof.useCases.map((uc, i) => (
              <div key={uc.title} className="rounded-2xl border border-d8-border bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-d8-dark text-sm font-extrabold text-white">
                  {i + 1}
                </div>
                <h3 className="mb-2 text-[17px] font-bold text-d8-dark">{uc.title}</h3>
                <p className="text-sm leading-relaxed text-d8-muted">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform features */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-accent-500">
                {lang === "pt" ? "Na plataforma" : lang === "es" ? "En la plataforma" : "On the platform"}
              </span>
              <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-d8-dark sm:text-3xl">
                {lang === "pt" ? "Ferramentas pensadas para voc?" : lang === "es" ? "Herramientas pensadas para ti" : "Tools built for you"}
              </h2>
              <ul className="flex flex-col gap-3">
                {prof.platformFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[15px] text-d8-text">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-500 text-[10px] font-extrabold text-white">
                      <Check size={12} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-d8-border bg-d8-off p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                  <Icon size={24} />
                </div>
                <div>
                  <p className="font-bold text-d8-dark">{prof.title}</p>
                  <p className="text-sm text-d8-muted">doctor8.org</p>
                </div>
              </div>
              <div className="space-y-2">
                {["Teleconsulta integrada", "Prontu?rio digital", "Agenda 24/7", "Documentos e prescri??es"].map((item, i) => (
                  <div key={item} className="flex items-center justify-between rounded-xl border border-d8-border bg-white px-4 py-3">
                    <span className="text-sm text-d8-text">
                      {lang === "en"
                        ? ["Integrated telehealth", "Digital records", "24/7 scheduling", "Documents & prescriptions"][i]
                        : lang === "es"
                          ? ["Teleconsulta integrada", "Historial digital", "Agenda 24/7", "Documentos y prescripciones"][i]
                          : item}
                    </span>
                    <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">?</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Volunteer CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-950 via-d8-dark to-d8-dark px-6 py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(244,63,94,0.15),transparent_60%)]" />
        <div className="relative z-10 mx-auto max-w-[1180px] text-center">
          <Heart size={32} className="mx-auto mb-4 text-rose-400" />
          <h2 className="mb-4 text-2xl font-extrabold text-white sm:text-3xl">{prof.volunteerTitle}</h2>
          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-white/60">{prof.volunteerDesc}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={volSignup} className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-rose-900/30 transition hover:bg-rose-400">
              {prof.ctaVolunteer} <ChevronRight size={16} />
            </Link>
            <Link href="/sos-venezuela" className="rounded-2xl border border-white/20 px-8 py-4 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white">
              SOS Venezuela
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom nav */}
      <section className="border-t border-d8-border bg-d8-off px-6 py-10">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4">
          <Link href="/register/professional#voluntariado" className="text-sm font-semibold text-brand-500 hover:text-brand-600">
            {lang === "pt" ? "? Ver todas as especialidades" : lang === "es" ? "? Ver todas las especialidades" : "? See all specialties"}
          </Link>
          <Link href={signup} className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-6 py-3 text-sm font-bold text-white hover:bg-accent-600">
            {prof.ctaPrimary} <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <ProFooter c={c} />
    </div>
  );
}
