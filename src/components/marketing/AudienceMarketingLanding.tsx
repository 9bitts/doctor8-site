import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";
import type { AudienceLandingContent } from "@/lib/audience-landing-content";

const ACCENT_STYLES = {
  sky: {
    badge: "bg-sky-100 text-sky-800",
    highlight: "text-sky-600",
    cta: "bg-sky-600 hover:bg-sky-700 shadow-sky-600/25",
    stat: "text-sky-600",
    icon: "bg-sky-100 text-sky-600",
    section: "bg-sky-50 border-sky-100",
    tag: "text-sky-600 bg-sky-50",
    step: "text-sky-200",
    trust: "text-sky-400",
    spotlightBg: "bg-violet-50 border-violet-100",
    spotlightIcon: "text-violet-500",
    heroBg: "bg-sky-50",
    eyebrow: "text-sky-600",
  },
  accent: {
    badge: "bg-accent-50 text-accent-700",
    highlight: "text-accent-500",
    cta: "bg-accent-500 hover:bg-accent-600 shadow-accent-500/25",
    stat: "text-accent-500",
    icon: "bg-accent-50 text-accent-600",
    section: "bg-accent-50/50 border-accent-100",
    tag: "text-accent-600 bg-accent-50",
    step: "text-accent-200",
    trust: "text-accent-400",
    spotlightBg: "bg-brand-50 border-brand-100",
    spotlightIcon: "text-brand-500",
    heroBg: "bg-d8-off",
    eyebrow: "text-accent-500",
  },
  brand: {
    badge: "bg-brand-50 text-brand-700",
    highlight: "text-brand-500",
    cta: "bg-brand-500 hover:bg-brand-600 shadow-brand-500/25",
    stat: "text-brand-500",
    icon: "bg-brand-50 text-brand-600",
    section: "bg-brand-50/50 border-brand-100",
    tag: "text-brand-600 bg-brand-50",
    step: "text-brand-200",
    trust: "text-brand-400",
    spotlightBg: "bg-violet-50 border-violet-100",
    spotlightIcon: "text-violet-500",
    heroBg: "bg-brand-50/30",
    eyebrow: "text-brand-600",
  },
  emerald: {
    badge: "bg-emerald-100 text-emerald-800",
    highlight: "text-emerald-600",
    cta: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25",
    stat: "text-emerald-600",
    icon: "bg-emerald-100 text-emerald-600",
    section: "bg-emerald-50 border-emerald-100",
    tag: "text-emerald-600 bg-emerald-50",
    step: "text-emerald-200",
    trust: "text-emerald-400",
    spotlightBg: "bg-teal-50 border-teal-100",
    spotlightIcon: "text-teal-500",
    heroBg: "bg-emerald-50/40",
    eyebrow: "text-emerald-600",
  },
} as const;

export default function AudienceMarketingLanding({ content }: { content: AudienceLandingContent }) {
  const s = ACCENT_STYLES[content.accent];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className={`relative overflow-hidden ${s.heroBg}`}>
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-3xl">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6 ${s.badge}`}>
              {content.hero.badge}
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-[1.1] tracking-tight">
              {content.hero.title}{" "}
              <span className={s.highlight}>{content.hero.titleHighlight}</span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 mt-6 leading-relaxed">
              {content.hero.subtitle}
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href={content.hero.primaryCta.href}
                className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-semibold transition shadow-lg ${s.cta}`}
              >
                {content.hero.primaryCta.label} <ArrowRight size={18} />
              </Link>
              {content.hero.secondaryCta && (
                <Link
                  href={content.hero.secondaryCta.href}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition"
                >
                  {content.hero.secondaryCta.label}
                </Link>
              )}
            </div>
            {content.hero.note && (
              <p className="text-xs text-slate-500 mt-4">{content.hero.note}</p>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
          <p className="text-center text-slate-400 text-sm font-semibold uppercase tracking-wide mb-8">
            Cuidamos da saúde com tecnologia e ciência
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {content.stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className={`text-4xl sm:text-5xl font-black ${s.trust}`}>{stat.value}</p>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <p className={`text-center font-semibold text-sm uppercase tracking-wide mb-2 ${s.eyebrow}`}>
          {content.pillarsEyebrow}
        </p>
        <h3 className="text-center text-3xl font-bold text-slate-900 mb-4">
          {content.pillarsTitle}
        </h3>
        <p className="text-center text-slate-500 max-w-2xl mx-auto mb-12">
          {content.pillarsSubtitle}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {content.pillars.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-300"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${s.icon}`}>
                <p.icon size={22} />
              </div>
              <h4 className="font-bold text-slate-900">{p.title}</h4>
              <p className="text-slate-600 text-sm mt-2 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Spotlight */}
      <section className={`border-y ${s.spotlightBg}`}>
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className={`inline-flex items-center gap-2 font-semibold text-sm mb-4 ${s.eyebrow}`}>
                <Zap size={18} className={s.spotlightIcon} />
                {content.spotlight.eyebrow}
              </div>
              <h3 className="text-3xl font-bold text-slate-900">{content.spotlight.title}</h3>
              <p className="text-slate-600 mt-4 leading-relaxed">{content.spotlight.body}</p>
              <ul className="mt-6 space-y-2">
                {content.spotlight.bullets.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <Zap size={16} className={`${s.spotlightIcon} shrink-0 mt-0.5`} />
                    {item}
                  </li>
                ))}
              </ul>
              {content.spotlight.cta && (
                <Link
                  href={content.spotlight.cta.href}
                  className={`inline-flex items-center gap-2 mt-6 text-sm font-semibold hover:underline ${s.highlight}`}
                >
                  {content.spotlight.cta.label} <ArrowRight size={14} />
                </Link>
              )}
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8">
              <p className="font-semibold text-slate-900 mb-4">Diferencial Doctor8</p>
              <div className="space-y-4 text-sm">
                {content.trust.slice(0, 4).map((item) => (
                  <div key={item} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                    <CheckCircle2 size={18} className={`${s.trust} shrink-0 mt-0.5`} />
                    <span className="text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modulos" className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <p className={`text-center font-semibold text-sm uppercase tracking-wide mb-2 ${s.eyebrow}`}>
          {content.modulesEyebrow}
        </p>
        <h3 className="text-center text-3xl font-bold text-slate-900 mb-4">
          {content.modulesTitle}
        </h3>
        <p className="text-center text-slate-500 max-w-2xl mx-auto mb-12">
          {content.modulesSubtitle}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {content.modules.map((m) => (
            <div
              key={m.title}
              className="rounded-xl bg-white border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <m.icon size={18} className={s.highlight} />
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${s.tag}`}>
                  {m.tag}
                </span>
              </div>
              <h4 className="font-semibold text-slate-900 text-sm leading-snug">{m.title}</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Journey */}
      <section className={`border-y ${s.section}`}>
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
          <h3 className="text-center text-3xl font-bold text-slate-900 mb-12">
            {content.journeyTitle}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {content.journey.map((j) => (
              <div key={j.step} className="relative">
                <span className={`text-4xl font-black ${s.step}`}>{j.step}</span>
                <h4 className="font-bold text-slate-900 mt-2 text-sm">{j.title}</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{j.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compare */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-2">
            {content.compareTitle}
          </h3>
          <p className="text-center text-slate-500 text-sm mb-10 max-w-xl mx-auto">
            {content.compareSubtitle}
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {content.compare.map((row) => (
              <div key={row.focus} className="rounded-xl bg-white border border-slate-200 p-5">
                <p className="font-bold text-slate-900">{row.them}</p>
                <p className="text-xs text-slate-500 mt-1">Foco: {row.focus}</p>
                <p className={`text-sm font-medium mt-3 flex items-start gap-2 ${s.highlight}`}>
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  Doctor8: {row.doctor8}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <h3 className="text-2xl font-bold text-center mb-8">
            Por que escolher Doctor8
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.trust.map((t) => (
              <div key={t} className="flex items-start gap-3 text-sm text-slate-300">
                <CheckCircle2 size={18} className={`${s.trust} shrink-0 mt-0.5`} />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center">
        <h3 className="text-3xl sm:text-4xl font-bold text-slate-900">
          {content.finalCta.title}
        </h3>
        <p className="text-slate-600 mt-4 max-w-xl mx-auto">{content.finalCta.subtitle}</p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link
            href={content.finalCta.primary.href}
            className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold transition shadow-lg ${s.cta}`}
          >
            {content.finalCta.primary.label} <ArrowRight size={18} />
          </Link>
          {content.finalCta.secondary && (
            <Link
              href={content.finalCta.secondary.href}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition"
            >
              {content.finalCta.secondary.label}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
