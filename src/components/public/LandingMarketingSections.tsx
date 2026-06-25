"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getLandingContent, SPECIALTY_ICONS } from "@/lib/landing-content";

function FadeIn({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) el.classList.add("visible"); },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`landing-fade-in ${className}`}>
      {children}
    </div>
  );
}

export default function LandingMarketingSections() {
  const { lang } = useI18n();
  const c = getLandingContent(lang);

  return (
    <div className="bg-white text-[#1a2f3f]">
      {/* Trust bar */}
      <div className="border-y border-white/6 bg-[#142333] px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-7">
          {c.trust.map((item) => (
            <span key={item} className="flex items-center gap-2 text-[13px] font-medium text-white/65">
              {item === c.trust[0] && "?? "}
              {item === c.trust[1] && "??? "}
              {item === c.trust[2] && "?? "}
              {item === c.trust[3] && "?? "}
              {item === c.trust[4] && "?? "}
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section id="how" className="bg-[#f5f9fc] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-accent-500">{c.how.eyebrow}</span>
            <h2 className="landing-heading mb-4 text-3xl font-extrabold tracking-tight text-[#0c1a27] sm:text-4xl">{c.how.title}</h2>
            <p className="mx-auto max-w-xl text-[17px] leading-relaxed text-[#5a7a8a]">{c.how.sub}</p>
          </div>
          <div className="relative grid gap-8 md:grid-cols-3">
            <div className="absolute left-[16%] right-[16%] top-7 hidden h-0.5 bg-gradient-to-r from-accent-500 to-brand-500 md:block" />
            {c.how.steps.map((step, i) => (
              <FadeIn key={step.title} className="relative z-10 text-center">
                <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full text-xl font-extrabold text-white shadow-[0_0_0_6px_#f5f9fc] ${i % 2 === 0 ? "bg-accent-500 shadow-[0_0_0_6px_#f5f9fc,0_0_0_8px_#e05930]" : "bg-brand-500 shadow-[0_0_0_6px_#f5f9fc,0_0_0_8px_#216a86]"}`}>
                  {i + 1}
                </div>
                <h3 className="landing-heading mb-2 text-base font-bold text-[#0c1a27]">{step.title}</h3>
                <p className="text-sm leading-relaxed text-[#5a7a8a]">{step.desc}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section id="specialties" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-accent-500">{c.specialties.eyebrow}</span>
            <h2 className="landing-heading mb-4 text-3xl font-extrabold tracking-tight text-[#0c1a27] sm:text-4xl">{c.specialties.title}</h2>
            <p className="max-w-xl text-[17px] leading-relaxed text-[#5a7a8a]">{c.specialties.sub}</p>
          </div>
          <FadeIn className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {c.specialties.items.map((item, i) => (
              <div key={item.title} className="rounded-[14px] border-[1.5px] border-[#dde8ee] bg-white p-6 transition hover:-translate-y-0.5 hover:border-accent-500 hover:shadow-[0_8px_24px_rgba(224,89,48,0.1)]">
                <div className="mb-3 text-[32px]">{SPECIALTY_ICONS[i]}</div>
                <h3 className="landing-heading mb-1.5 text-base font-bold text-[#0c1a27]">{item.title}</h3>
                <p className="text-[13px] leading-relaxed text-[#5a7a8a]">{item.desc}</p>
              </div>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* Club Doctor */}
      <section id="club" className="relative overflow-hidden bg-gradient-to-br from-[#0c1a27] to-[#142333] px-6 py-20 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(224,89,48,0.15)_0%,transparent_65%)]" />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
          <FadeIn>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent-500/40 bg-accent-500/20 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#f09070]">
              {"\u2b50"} {c.club.badge}
            </span>
            <h2 className="landing-heading mb-4 text-3xl font-extrabold sm:text-4xl">
              {c.club.title}<em className="not-italic text-accent-400">{c.club.titleEm}</em>
              {lang === "pt" ? " sua sa?de" : lang === "es" ? " tu salud" : " your health"}
            </h2>
            <p className="mb-7 text-base leading-relaxed text-white/60">{c.club.sub}</p>
            <ul className="mb-8 flex flex-col gap-3">
              {c.club.benefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-[15px] text-white/80">
                  <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-accent-500/25 text-[11px]">?</span>
                  {b}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-white/30">{c.club.disclaimer}</p>
          </FadeIn>
          <FadeIn>
            <div className="rounded-[20px] border border-white/10 bg-white/[0.06] p-8">
              <p className="mb-2 text-[13px] font-medium text-white/50">{c.club.priceLabel}</p>
              <div className="landing-heading mb-1 text-5xl font-extrabold leading-none text-white">
                <sup className="mr-0.5 text-xl">R$</sup>34<span className="text-xl font-normal text-white/40">,90</span>
              </div>
              <p className="mb-6 text-sm text-white/40">{c.club.period}</p>
              <ul className="mb-7 flex flex-col gap-2.5">
                {c.club.includes.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-white/70 before:font-bold before:text-accent-500 before:content-['?']">{item}</li>
                ))}
              </ul>
              <Link href="/register" className="block w-full rounded-[14px] bg-accent-500 py-3.5 text-center text-base font-bold text-white transition hover:bg-accent-600">
                {c.club.cta}
              </Link>
              <p className="mt-2.5 text-center text-[11px] text-white/30">{c.club.cancel}</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Cannabis */}
      <section id="cannabis" className="bg-gradient-to-br from-[#0f2718] to-[#1a3d20] px-6 py-20 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
          <FadeIn>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300">
              {"\uD83C\uDF3F"} {c.cannabis.badge}
            </span>
            <h2 className="landing-heading mb-4 text-3xl font-extrabold sm:text-4xl">
              <em className="not-italic text-emerald-300">{c.cannabis.titleEm}</em>{c.cannabis.titleRest}
            </h2>
            <p className="mb-7 text-[15px] leading-relaxed text-white/60">{c.cannabis.sub}</p>
            <ul className="mb-8 flex flex-col gap-2.5">
              {c.cannabis.points.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-sm text-white/80 before:content-['??']">{p}</li>
              ))}
            </ul>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-[14px] bg-emerald-600 px-7 py-3.5 text-[15px] font-bold text-white transition hover:bg-emerald-700">
              {c.cannabis.cta} ?
            </Link>
          </FadeIn>
          <FadeIn>
            <div className="rounded-[20px] border border-white/10 bg-white/[0.05] p-7">
              <p className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-white/40">{c.cannabis.conditionsHeader}</p>
              <div className="flex flex-wrap gap-2">
                {c.cannabis.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300">{tag}</span>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Doctor Energy */}
      <section id="energy" className="bg-[#f5f9fc] px-6 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
          <FadeIn>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-yellow-600">
              {"\u26a1"} {c.energy.badge}
            </span>
            <h2 className="landing-heading mb-4 text-3xl font-extrabold text-[#0c1a27] sm:text-4xl">
              {lang === "en" ? (
                <>Exclusive partnership for <em className="not-italic text-accent-500">{c.energy.titleEm}</em> members</>
              ) : lang === "es" ? (
                <>Partnership exclusivo para suscriptores de <em className="not-italic text-accent-500">{c.energy.titleEm}</em></>
              ) : (
                <>Parceria exclusiva para assinantes do <em className="not-italic text-accent-500">{c.energy.titleEm}</em></>
              )}
            </h2>
            <p className="mb-7 text-[15px] leading-relaxed text-[#5a7a8a]">{c.energy.sub}</p>
            <ul className="mb-6 flex flex-col gap-2.5">
              {c.energy.points.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-sm text-[#1a2f3f] before:content-['?']">{p}</li>
              ))}
            </ul>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-[14px] bg-accent-500 px-7 py-3.5 text-[15px] font-bold text-white transition hover:bg-accent-600">
              {c.energy.cta} ?
            </Link>
          </FadeIn>
          <FadeIn className="text-center">
            <div className="rounded-2xl border-[1.5px] border-[#dde8ee] bg-white p-6">
              <div className="landing-heading text-[56px] font-extrabold leading-none text-accent-500">20%</div>
              <p className="mt-1.5 text-sm text-[#5a7a8a]">{c.energy.pctLabel}</p>
              <p className="mt-2 text-[11px] text-[#5a7a8a]/60">{c.energy.disclaimer}</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* LGPD */}
      <div id="lgpd" className="border-t-[3px] border-brand-500 bg-brand-50 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start gap-6">
          <span className="text-4xl">???</span>
          <div>
            <h3 className="landing-heading mb-2 text-lg font-bold text-brand-700">{c.lgpd.title}</h3>
            <p className="text-sm leading-relaxed text-brand-700/85">
              {c.lgpd.body}{" "}
              <a href="mailto:dpo@doctor8.app" className="font-semibold text-brand-500 underline">dpo@doctor8.app</a>
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0c1a27] to-[#142333] px-6 py-24 text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[350px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(224,89,48,0.12)_0%,transparent_70%)]" />
        <h2 className="landing-heading relative z-10 mb-4 text-3xl font-extrabold text-white sm:text-4xl">
          <em className="not-italic text-accent-400">{c.cta.titleEm}</em>{c.cta.titleRest}
        </h2>
        <p className="relative z-10 mb-10 text-[17px] text-white/60">{c.cta.sub}</p>
        <div className="relative z-10 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="rounded-[14px] bg-accent-500 px-8 py-4 text-base font-bold text-white transition hover:bg-accent-600">
            {c.cta.primary} ?
          </Link>
          <a href="#club" className="rounded-[14px] border border-white/15 bg-white/8 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/14">
            {c.cta.secondary}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 bg-[#0c1a27] px-6 py-14 text-white/60">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 grid gap-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <div>
              <div className="landing-heading mb-3 text-xl font-extrabold text-white">
                Doctor<span className="text-accent-500">8</span>
              </div>
              <p className="mb-5 text-[13px] leading-relaxed">{c.footer.desc}</p>
              <div className="flex gap-2.5">
                <a href="https://instagram.com/doctor8oficial" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 text-base transition hover:bg-white/16">??</a>
                <a href="https://wa.me/5531971720053" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 text-base transition hover:bg-white/16">??</a>
                <a href="mailto:contato@doctor8.app" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 text-base transition hover:bg-white/16">??</a>
              </div>
            </div>
            <div>
              <h4 className="landing-heading mb-4 text-sm font-bold text-white">{c.footer.services}</h4>
              <ul className="flex flex-col gap-2.5 text-[13px]">
                <li><a href="#specialties" className="transition hover:text-white">{c.footer.serviceLinks[0]}</a></li>
                <li><a href="#club" className="transition hover:text-white">{c.footer.serviceLinks[1]}</a></li>
                <li><a href="#cannabis" className="transition hover:text-white">{c.footer.serviceLinks[2]}</a></li>
                <li><a href="#energy" className="transition hover:text-white">{c.footer.serviceLinks[3]}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="landing-heading mb-4 text-sm font-bold text-white">{c.footer.professionals}</h4>
              <ul className="flex flex-col gap-2.5 text-[13px]">
                <li><Link href="/register" className="transition hover:text-white">{c.footer.proLinks[0]}</Link></li>
                <li><Link href="/login" className="transition hover:text-white">{c.footer.proLinks[1]}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="landing-heading mb-4 text-sm font-bold text-white">{c.footer.legal}</h4>
              <ul className="flex flex-col gap-2.5 text-[13px]">
                <li><Link href="/privacy" className="transition hover:text-white">{c.footer.legalLinks[0]}</Link></li>
                <li><Link href="/terms" className="transition hover:text-white">{c.footer.legalLinks[1]}</Link></li>
                <li><a href="#lgpd" className="transition hover:text-white">{c.footer.legalLinks[2]}</a></li>
                <li><a href="mailto:dpo@doctor8.app" className="transition hover:text-white">{c.footer.legalLinks[3]}</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-6">
            <p className="text-xs">{c.footer.copyright} ? <a href="#lgpd" className="text-accent-500">LGPD</a></p>
            <div className="flex flex-wrap gap-2">
              {["LGPD", "HIPAA", "CFM", "SSL 256-bit"].map((b) => (
                <span key={b} className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/50">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
