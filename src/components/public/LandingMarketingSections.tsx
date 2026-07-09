"use client";

import Link from "next/link";
import { BrandLogoLink } from "@/components/brand/BrandLogo";
import {
  Lock, Shield, Globe, CreditCard, Smartphone, Check, Star, Leaf, Zap,
  Stethoscope, Brain, Utensils, Heart, Dumbbell, ArrowRight, Instagram, MessageCircle, Mail,
  Video, Sparkles, Radio, Building2, Store, ShoppingBag, Smile, HeartPulse, Pill,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getLandingContent } from "@/lib/landing-content";
import LandingPatientFeatures from "@/components/public/LandingPatientFeatures";

const TRUST_ICONS = [Lock, Shield, Globe, CreditCard, Smartphone];
const ECOSYSTEM_ICONS = [Video, Shield, Sparkles, Leaf];
const SPEC_ICONS = [Stethoscope, Brain, Utensils, Heart, Dumbbell, Leaf, Smile, Sparkles, HeartPulse];

export default function LandingMarketingSections() {
  const { lang } = useI18n();
  const c = getLandingContent(lang);

  const clubSuffix = lang === "pt" ? " sua sa\u00fade" : lang === "es" ? " tu salud" : " your health";

  return (
    <div className="text-d8-text">
      {/* Stats bar */}
      <section className="border-y border-white/10 bg-d8-dark2 px-6 py-8">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 md:grid-cols-4">
          {c.stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-extrabold text-accent-400 sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs font-medium text-white/60 sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust bar */}
      <div className="border-b border-white/10 bg-d8-dark px-6 py-5">
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

      {/* Ecosystem pillars */}
      <section id="ecosystem" className="bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-accent-500">{c.ecosystem.eyebrow}</span>
            <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-d8-dark sm:text-4xl">{c.ecosystem.title}</h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-d8-muted">{c.ecosystem.sub}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {c.ecosystem.pillars.map((pillar, i) => {
              const Icon = ECOSYSTEM_ICONS[i];
              return (
                <div key={pillar.title} className="rounded-2xl border border-d8-border bg-d8-off p-6 transition hover:border-accent-400 hover:shadow-md">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
                    <Icon size={20} />
                  </div>
                  <h3 className="mb-1.5 font-bold text-d8-dark">{pillar.title}</h3>
                  <p className="text-sm leading-relaxed text-d8-muted">{pillar.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Patient platform features */}
      <LandingPatientFeatures />

      {/* JIT urgent care */}
      <section id="urgent" className="relative overflow-hidden bg-gradient-to-br from-red-950 via-d8-dark to-slate-900 px-6 py-16 text-white">
        <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-red-500/20 blur-3xl" />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/20 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-red-200">
              <Radio size={12} />
              {c.jit.badge}
            </span>
            <h2 className="mb-4 text-3xl font-extrabold sm:text-4xl">
              {c.jit.title}<span className="text-red-400">{c.jit.titleHighlight}</span>
            </h2>
            <p className="mb-6 text-base leading-relaxed text-white/65">{c.jit.sub}</p>
            <ul className="mb-8 flex flex-col gap-2.5">
              {c.jit.points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-white/85">
                  <Check size={16} className="mt-0.5 shrink-0 text-red-400" />
                  {p}
                </li>
              ))}
            </ul>
            <Link
              href="/register?callbackUrl=%2Furgent"
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-red-600"
            >
              {c.jit.cta} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                <Radio size={24} />
              </div>
              <div>
                <p className="font-bold text-white">JIT</p>
                <p className="text-sm text-white/50">
                  {lang === "pt" ? "Exclusivo Doctor8" : lang === "es" ? "Exclusivo Doctor8" : "Doctor8 exclusive"}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {["1", "2", "3"].map((n) => (
                <div key={n} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/30 text-xs font-bold text-red-200">{n}</span>
                  <div className="h-2 flex-1 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-red-400/60" style={{ width: `${Number(n) * 30}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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
              const Icon = SPEC_ICONS[i] ?? Stethoscope;
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

      {/* Pharmacy */}
      <section id="pharmacy" className="bg-d8-off px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-teal-700">
              <Store size={12} />
              {c.pharmacy.badge}
            </span>
            <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-d8-dark sm:text-4xl">{c.pharmacy.title}</h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-d8-muted">{c.pharmacy.sub}</p>
          </div>
          <div className="mb-8 grid gap-6 md:grid-cols-3">
            {c.pharmacy.steps.map((step, i) => (
              <div key={step.title} className="rounded-2xl border border-d8-border bg-white p-6 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-500 text-lg font-extrabold text-white">
                  {i + 1}
                </div>
                <h3 className="mb-2 font-bold text-d8-dark">{step.title}</h3>
                <p className="text-sm leading-relaxed text-d8-muted">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/farmacias/buscar" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-teal-700">
              {c.pharmacy.cta} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Buying Club */}
      <section id="buying-club" className="bg-white px-6 py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
              <ShoppingBag size={12} />
              {c.buyingClub.badge}
            </span>
            <h2 className="mb-4 text-3xl font-extrabold text-d8-dark sm:text-4xl">{c.buyingClub.title}</h2>
            <p className="mb-6 text-base leading-relaxed text-d8-muted">{c.buyingClub.sub}</p>
            <ul className="mb-6 flex flex-col gap-2.5">
              {c.buyingClub.points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-d8-text">
                  <Check size={16} className="mt-0.5 shrink-0 text-amber-500" />
                  {p}
                </li>
              ))}
            </ul>
            <Link href="/register?callbackUrl=%2Fpatient%2Fbuying-club" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-amber-600">
              {c.buyingClub.cta} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="rounded-2xl border border-d8-border bg-d8-off p-8">
            <div className="mb-4 flex items-center gap-3">
              <Pill size={28} className="text-amber-600" />
              <span className="font-bold text-d8-dark">Buying Club</span>
            </div>
            <div className="space-y-3">
              {[75, 50, 25].map((pct) => (
                <div key={pct} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="mb-2 flex justify-between text-xs font-semibold text-d8-muted">
                    <span>{lang === "pt" ? "Meta do grupo" : lang === "es" ? "Meta del grupo" : "Group goal"}</span>
                    <span className="text-amber-600">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EAP Corporate */}
      <section id="eap" className="bg-gradient-to-br from-sky-950 to-d8-dark px-6 py-16 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="mb-4 inline-block text-xs font-bold uppercase tracking-widest text-sky-300">{c.eap.eyebrow}</span>
            <h2 className="mb-4 text-3xl font-extrabold sm:text-4xl">{c.eap.title}</h2>
            <p className="mb-6 text-base leading-relaxed text-white/65">{c.eap.body}</p>
            <ul className="mb-8 flex flex-col gap-2.5">
              {c.eap.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-white/85">
                  <Check size={16} className="mt-0.5 shrink-0 text-sky-400" />
                  {b}
                </li>
              ))}
            </ul>
            <Link href="/empresas/colaborador" className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-sky-600">
              {c.eap.cta} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <div className="mb-4 flex items-center gap-3">
              <Building2 size={28} className="text-sky-400" />
              <span className="font-bold">EAP</span>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  {lang === "pt" ? "Sigilo total" : lang === "es" ? "Confidencialidad total" : "Full confidentiality"}
                </p>
                <p className="mt-1 text-sm text-white/80">
                  {lang === "pt"
                    ? "O RH vê apenas métricas agregadas — nunca o conteúdo das sessões."
                    : lang === "es"
                      ? "RRHH ve solo métricas agregadas — nunca el contenido de las sesiones."
                      : "HR sees only aggregate metrics — never session content."}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  {lang === "pt" ? "Psicólogos CRP" : lang === "es" ? "Psicólogos CRP" : "CRP psychologists"}
                </p>
                <p className="mt-1 text-sm text-white/80">
                  {lang === "pt"
                    ? "Rede credenciada com convite formal da empresa."
                    : lang === "es"
                      ? "Red acreditada con invitación formal de la empresa."
                      : "Credentialed network with formal employer invite."}
                </p>
              </div>
            </div>
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
            <Link href="/register?plan=club" className="block w-full rounded-xl bg-accent-500 py-3.5 text-center font-bold text-white transition hover:bg-accent-600">
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
            <Link href="/register?plan=club" className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-accent-600">
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

      {/* Compare */}
      <section id="compare" className="bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-accent-500">{c.compare.eyebrow}</span>
            <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-d8-dark sm:text-4xl">{c.compare.title}</h2>
            <p className="mx-auto max-w-xl text-base leading-relaxed text-d8-muted">{c.compare.sub}</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-d8-border shadow-sm">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-d8-border bg-d8-off">
                  <th className="px-5 py-4 font-bold text-d8-dark">{c.compare.headers.them}</th>
                  <th className="px-5 py-4 font-bold text-d8-muted">{c.compare.headers.focus}</th>
                  <th className="px-5 py-4 font-bold text-accent-600">{c.compare.headers.doctor8}</th>
                </tr>
              </thead>
              <tbody>
                {c.compare.rows.map((row) => (
                  <tr key={row.them} className="border-b border-d8-border last:border-0">
                    <td className="px-5 py-4 font-medium text-d8-dark">{row.them}</td>
                    <td className="px-5 py-4 text-d8-muted">{row.focus}</td>
                    <td className="px-5 py-4 font-medium text-d8-text">{row.doctor8}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <div className="mb-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
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
                {c.footer.serviceLinks.map((link) => (
                  <li key={link.href}>
                    {link.href.startsWith("#") ? (
                      <a href={link.href} className="transition hover:text-white">{link.label}</a>
                    ) : (
                      <Link href={link.href} className="transition hover:text-white">{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold text-white">{c.footer.ecosystem}</h4>
              <ul className="flex flex-col gap-2 text-sm">
                {c.footer.ecosystemLinks.map((link) => (
                  <li key={link.href}>
                    {link.href.startsWith("#") ? (
                      <a href={link.href} className="transition hover:text-white">{link.label}</a>
                    ) : (
                      <Link href={link.href} className="transition hover:text-white">{link.label}</Link>
                    )}
                  </li>
                ))}
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
