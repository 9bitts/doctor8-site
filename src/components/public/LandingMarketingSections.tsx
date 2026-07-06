"use client";

import Link from "next/link";
import { BrandLogoLink } from "@/components/brand/BrandLogo";
import {
  Lock, Shield, Globe, CreditCard, Smartphone, Check, Star, Leaf, Zap,
  Stethoscope, Brain, Utensils, Heart, Dumbbell, ArrowRight, Instagram, MessageCircle, Mail,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getLandingContent } from "@/lib/landing-content";
import LandingPatientFeatures from "@/components/public/LandingPatientFeatures";

const TRUST_ICONS = [Lock, Shield, Globe, CreditCard, Smartphone];
const SPEC_ICONS = [Stethoscope, Brain, Utensils, Heart, Dumbbell, Leaf];

export default function LandingMarketingSections() {
  const { lang } = useI18n();
  const c = getLandingContent(lang);

  const clubSuffix = lang === "pt" ? " sua sa\u00fade" : lang === "es" ? " tu salud" : " your health";

  return (
    <div className="text-d8-text">
      {/* Trust bar */}
      <div className="border-y border-white/10 bg-d8-dark2 px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-8 gap-y-3">
          {c.trust.map((item, i) => {
            const Icon = TRUST_ICONS[i];
            return (
              <span key={item} className="flex items-center gap-2 text-sm font-medium text-white/70">
                <Icon size={15} className="text-accent-400" />
                {item}
              </span>
            );
          })}
        </div>
      </div>

      {/* Patient platform features */}
      <LandingPatientFeatures />

      {/* How it works */}
      <section id="how" className="bg-d8-off px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-accent-500">{c.how.eyebrow}</span>
            <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-d8-dark sm:text-4xl">{c.how.title}</h2>
            <p className="mx-auto max-w-xl text-base leading-relaxed text-d8-muted">{c.how.sub}</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {c.how.steps.map((step, i) => (
              <div key={step.title} className="rounded-2xl border border-d8-border bg-white p-6 text-center shadow-sm">
                <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-lg font-extrabold text-white ${i % 2 === 0 ? "bg-accent-500" : "bg-brand-500"}`}>
                  {i + 1}
                </div>
                <h3 className="mb-2 font-bold text-d8-dark">{step.title}</h3>
                <p className="text-sm leading-relaxed text-d8-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section id="specialties" className="bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-accent-500">{c.specialties.eyebrow}</span>
            <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-d8-dark sm:text-4xl">{c.specialties.title}</h2>
            <p className="max-w-xl text-base leading-relaxed text-d8-muted">{c.specialties.sub}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.specialties.items.map((item, i) => {
              const Icon = SPEC_ICONS[i];
              return (
                <div key={item.title} className="rounded-2xl border border-d8-border bg-d8-off p-6 transition hover:border-accent-400 hover:shadow-md">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
                    <Icon size={20} />
                  </div>
                  <h3 className="mb-1.5 font-bold text-d8-dark">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-d8-muted">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Club Doctor */}
      <section id="club" className="relative overflow-hidden bg-d8-club px-6 py-16 text-white">
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent-500/40 bg-accent-500/20 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-100">
              <Star size={12} className="fill-accent-400 text-accent-400" />
              {c.club.badge}
            </span>
            <h2 className="mb-4 text-3xl font-extrabold sm:text-4xl">
              {c.club.title}<span className="text-accent-400">{c.club.titleEm}</span>{clubSuffix}
            </h2>
            <p className="mb-6 text-base leading-relaxed text-white/65">{c.club.sub}</p>
            <ul className="mb-6 flex flex-col gap-2.5">
              {c.club.benefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-white/85">
                  <Check size={16} className="mt-0.5 shrink-0 text-accent-400" />
                  {b}
                </li>
              ))}
            </ul>
            <p className="text-xs text-white/40">{c.club.disclaimer}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <p className="mb-2 text-sm font-medium text-white/50">{c.club.priceLabel}</p>
            <div className="mb-1 text-5xl font-extrabold leading-none">
              <sup className="mr-0.5 text-xl">R$</sup>34<span className="text-xl font-normal text-white/40">,90</span>
            </div>
            <p className="mb-6 text-sm text-white/45">{c.club.period}</p>
            <ul className="mb-6 flex flex-col gap-2">
              {c.club.includes.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-white/75">
                  <Check size={14} className="shrink-0 text-accent-400" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register" className="block w-full rounded-xl bg-accent-500 py-3.5 text-center font-bold text-white transition hover:bg-accent-600">
              {c.club.cta}
            </Link>
            <p className="mt-2 text-center text-xs text-white/35">{c.club.cancel}</p>
          </div>
        </div>
      </section>

      {/* Cannabis */}
      <section id="cannabis" className="bg-d8-cannabis px-6 py-16 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300">
              <Leaf size={12} />
              {c.cannabis.badge}
            </span>
            <h2 className="mb-4 text-3xl font-extrabold sm:text-4xl">
              <span className="text-emerald-300">{c.cannabis.titleEm}</span>{c.cannabis.titleRest}
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-white/65">{c.cannabis.sub}</p>
            <ul className="mb-6 flex flex-col gap-2">
              {c.cannabis.points.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm text-white/85">
                  <Leaf size={14} className="shrink-0 text-emerald-400" />
                  {p}
                </li>
              ))}
            </ul>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold transition hover:bg-emerald-700">
              {c.cannabis.cta} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/45">{c.cannabis.conditionsHeader}</p>
            <div className="flex flex-wrap gap-2">
              {c.cannabis.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Doctor Energy */}
      <section id="energy" className="bg-d8-off px-6 py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-100 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
              <Zap size={12} />
              {c.energy.badge}
            </span>
            <h2 className="mb-4 text-3xl font-extrabold text-d8-dark sm:text-4xl">
              {lang === "en" ? (
                <>Exclusive partnership for <span className="text-accent-500">{c.energy.titleEm}</span> members</>
              ) : lang === "es" ? (
                <>Partnership exclusivo para suscriptores de <span className="text-accent-500">{c.energy.titleEm}</span></>
              ) : (
                <>Parceria exclusiva para assinantes do <span className="text-accent-500">{c.energy.titleEm}</span></>
              )}
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-d8-muted">{c.energy.sub}</p>
            <ul className="mb-6 flex flex-col gap-2">
              {c.energy.points.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm text-d8-text">
                  <Zap size={14} className="shrink-0 text-accent-500" />
                  {p}
                </li>
              ))}
            </ul>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-accent-600">
              {c.energy.cta} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="rounded-2xl border border-d8-border bg-white p-8 text-center shadow-sm">
            <div className="text-6xl font-extrabold leading-none text-accent-500">20%</div>
            <p className="mt-2 text-sm text-d8-muted">{c.energy.pctLabel}</p>
            <p className="mt-2 text-xs text-d8-muted/70">{c.energy.disclaimer}</p>
          </div>
        </div>
      </section>

      {/* LGPD */}
      <div id="lgpd" className="border-t-4 border-brand-500 bg-brand-50 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start gap-5">
          <Shield size={36} className="shrink-0 text-brand-600" />
          <div>
            <h3 className="mb-2 text-lg font-bold text-brand-700">{c.lgpd.title}</h3>
            <p className="text-sm leading-relaxed text-brand-700/90">
              {c.lgpd.body}{" "}
              <a href="mailto:dpo@doctor8.app" className="font-semibold text-brand-600 underline">dpo@doctor8.app</a>
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="bg-d8-club px-6 py-20 text-center">
        <h2 className="mb-4 text-3xl font-extrabold text-white sm:text-4xl">
          <span className="text-accent-400">{c.cta.titleEm}</span>{c.cta.titleRest}
        </h2>
        <p className="mb-8 text-base text-white/65">{c.cta.sub}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-8 py-4 font-bold text-white transition hover:bg-accent-600">
            {c.cta.primary} <ArrowRight size={18} />
          </Link>
          <a href="#club" className="rounded-xl border border-white/20 bg-white/10 px-8 py-4 font-semibold text-white transition hover:bg-white/15">
            {c.cta.secondary}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-d8-dark px-6 py-12 text-white/60">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <BrandLogoLink variant="on-dark" size="md" className="mb-3" />
              <p className="mb-4 text-sm leading-relaxed">{c.footer.desc}</p>
              <div className="flex gap-2">
                <a href="https://instagram.com/doctor8oficial" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20" aria-label="Instagram">
                  <Instagram size={16} />
                </a>
                <a href="https://wa.me/5531971720053" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20" aria-label="WhatsApp">
                  <MessageCircle size={16} />
                </a>
                <a href="mailto:contato@doctor8.app" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20" aria-label="Email">
                  <Mail size={16} />
                </a>
              </div>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold text-white">{c.footer.services}</h4>
              <ul className="flex flex-col gap-2 text-sm">
                <li><a href="#platform" className="transition hover:text-white">{lang === "pt" ? "Plataforma" : lang === "es" ? "Plataforma" : "Platform"}</a></li>
                <li><a href="#specialties" className="transition hover:text-white">{c.footer.serviceLinks[0]}</a></li>
                <li><a href="#club" className="transition hover:text-white">{c.footer.serviceLinks[1]}</a></li>
                <li><a href="#cannabis" className="transition hover:text-white">{c.footer.serviceLinks[2]}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold text-white">{c.footer.professionals}</h4>
              <ul className="flex flex-col gap-2 text-sm">
                <li><Link href="/register/professional/signup" className="transition hover:text-white">{c.footer.proLinks[0]}</Link></li>
                <li><Link href="/login?portal=doctor" className="transition hover:text-white">{c.footer.proDoctorLogin}</Link></li>
                <li><Link href="/login?portal=psychologist" className="transition hover:text-white">{c.footer.proPsychologistLogin}</Link></li>
                <li><Link href="/login?portal=psychoanalyst" className="transition hover:text-white">{c.footer.proPsychoanalystLogin}</Link></li>
                <li><Link href="/login?portal=integrative" className="transition hover:text-white">{c.footer.proIntegrativeLogin}</Link></li>
                <li><Link href="/login?portal=nutritionist" className="transition hover:text-white">{c.footer.proNutritionistLogin}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold text-white">{c.footer.legal}</h4>
              <ul className="flex flex-col gap-2 text-sm">
                <li><Link href="/privacy" className="transition hover:text-white">{c.footer.legalLinks[0]}</Link></li>
                <li><Link href="/terms" className="transition hover:text-white">{c.footer.legalLinks[1]}</Link></li>
                <li><a href="#lgpd" className="transition hover:text-white">{c.footer.legalLinks[2]}</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
            <p className="text-xs">{c.footer.copyright} · <a href="#lgpd" className="text-accent-500">LGPD</a></p>
            <div className="flex flex-wrap gap-2">
              {["LGPD", "HIPAA", "CFM", "SSL 256-bit"].map((b) => (
                <span key={b} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/50">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
