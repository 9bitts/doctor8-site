"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Calendar, Video, ClipboardList, Pill, CreditCard, BadgeCheck,
  Stethoscope, Brain, Sparkles, Leaf, Dumbbell, Utensils, Heart,
  Menu, X, ArrowRight, ChevronRight, Shield, Lock,
  Instagram, MessageCircle, Mail, Check,
  type LucideIcon,
} from "lucide-react";
import { LANGUAGES, Lang } from "@/lib/i18n/translations";
import { getProLandingContent, ProLandingContent } from "@/lib/professional-landing-content";
import { DEFAULT_VENEZUELA_POOLS } from "@/lib/humanitarian/constants";
import { detectInitialLang, LANG_KEY } from "@/components/auth/register-shared";

const FEAT_ICONS: Record<string, LucideIcon> = {
  calendar: Calendar,
  video: Video,
  clipboard: ClipboardList,
  pill: Pill,
  credit: CreditCard,
  badge: BadgeCheck,
  stethoscope: Stethoscope,
  brain: Brain,
  sparkles: Sparkles,
  leaf: Leaf,
  dumbbell: Dumbbell,
  utensils: Utensils,
  heart: Heart,
};

const COOKIE_KEY = "d8ck";

function useProLang() {
  const [lang, setLang] = useState<Lang>("pt");
  useEffect(() => { setLang(detectInitialLang()); }, []);
  const change = useCallback((l: Lang) => {
    setLang(l);
    try { window.localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  }, []);
  return { lang, setLang: change, c: getProLandingContent(lang) };
}

function LangSwitcher({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-white/15 bg-white/5 p-0.5">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => onChange(l.code)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            lang === l.code ? "bg-accent-500 text-white" : "text-white/60 hover:text-white"
          }`}
        >
          {l.flag}
        </button>
      ))}
    </div>
  );
}

function CookieBanner({ c }: { c: ProLandingContent }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem(COOKIE_KEY)) setVisible(true); } catch { setVisible(true); }
  }, []);
  if (!visible) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999] flex flex-wrap items-center gap-4 border-t-2 border-accent-500 bg-d8-dark px-6 py-3.5">
      <p className="min-w-[200px] flex-1 text-[13px] text-white/75">{c.cookie.text}</p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => { localStorage.setItem(COOKIE_KEY, "ok"); setVisible(false); }}
          className="rounded-lg bg-accent-500 px-5 py-2 text-[13px] font-semibold text-white hover:bg-accent-600"
        >
          {c.cookie.accept}
        </button>
        <button
          type="button"
          onClick={() => { localStorage.setItem(COOKIE_KEY, "no"); setVisible(false); }}
          className="rounded-lg border border-white/25 px-5 py-2 text-[13px] font-semibold text-white/70 hover:text-white"
        >
          {c.cookie.decline}
        </button>
      </div>
    </div>
  );
}

export function ProNav({ c, lang, onLangChange }: { c: ProLandingContent; lang: Lang; onLangChange: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const links = [
    { href: "#funcionalidades", label: c.nav.features },
    { href: "#como-funciona", label: c.nav.how },
    { href: "#prescricoes", label: c.nav.prescriptions },
    { href: "#agenda", label: c.nav.schedule },
    { href: "#voluntariado", label: c.nav.volunteer },
    { href: "#planos", label: c.nav.plans },
  ];

  return (
    <nav className="sticky top-0 z-[200] border-b border-white/[0.07] bg-d8-dark/95 backdrop-blur-md">
      <div className="mx-auto flex h-[66px] max-w-[1180px] items-center gap-6 px-6">
        <Link href="/register/professional" className="shrink-0 text-[21px] font-extrabold tracking-tight text-white">
          Doctor<span className="text-accent-500">8</span>
        </Link>
        <ul className={`${open ? "flex" : "hidden"} absolute left-0 right-0 top-[66px] flex-col gap-4 border-b border-white/10 bg-d8-dark p-6 md:static md:flex md:flex-1 md:flex-row md:border-0 md:bg-transparent md:p-0`}>
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)} className="whitespace-nowrap text-sm font-medium text-white/65 transition hover:text-white">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          <div className="hidden sm:block"><LangSwitcher lang={lang} onChange={onLangChange} /></div>
          <Link href="/login" className="hidden rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/75 transition hover:border-white/45 hover:text-white sm:inline-block">
            {c.nav.signIn}
          </Link>
          <Link href="/register/professional/signup" className="rounded-lg bg-accent-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-accent-600">
            {c.nav.signUp}
          </Link>
          <button type="button" onClick={() => setOpen(!open)} className="text-white md:hidden" aria-label="Menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </nav>
  );
}

export function ProFooter({ c }: { c: ProLandingContent }) {
  const anchors = ["#funcionalidades", "#como-funciona", "#prescricoes", "#agenda", "#planos"];
  return (
    <footer className="border-t border-white/[0.07] bg-d8-dark px-6 pb-8 pt-14">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-12 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="mb-3 text-xl font-extrabold text-white">Doctor<span className="text-accent-500">8</span></p>
            <p className="mb-5 text-[13px] leading-relaxed text-white/50">{c.footer.desc}</p>
            <div className="flex gap-2.5">
              <a href="https://instagram.com/doctor8oficial" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.07] text-white/70 transition hover:bg-white/15">
                <Instagram size={15} />
              </a>
              <a href="https://wa.me/5531971720053" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.07] text-white/70 transition hover:bg-white/15">
                <MessageCircle size={15} />
              </a>
              <a href="mailto:contato@doctor8.org" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.07] text-white/70 transition hover:bg-white/15">
                <Mail size={15} />
              </a>
            </div>
          </div>
          <div>
            <h4 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-white">{c.footer.platform}</h4>
            <ul className="flex flex-col gap-2.5">
              {c.footer.platformLinks.map((label, i) => (
                <li key={label}><a href={anchors[i]} className="text-[13px] text-white/50 transition hover:text-white">{label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-white">{c.footer.patients}</h4>
            <ul className="flex flex-col gap-2.5">
              {c.footer.patientLinks.map((label) => (
                <li key={label}><Link href="/" className="text-[13px] text-white/50 transition hover:text-white">{label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-white">{c.footer.legal}</h4>
            <ul className="flex flex-col gap-2.5">
              {c.footer.legalLinks.map((label) => (
                <li key={label}><Link href="/privacy" className="text-[13px] text-white/50 transition hover:text-white">{label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-6">
          <p className="text-xs text-white/35">{c.footer.copyright}</p>
          <div className="flex flex-wrap gap-2">
            {c.footer.badges.map((b) => (
              <span key={b} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-bold text-white/40">{b}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) node.classList.add("opacity-100", "translate-y-0"); }, { threshold: 0.08 });
    obs.observe(node);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`translate-y-5 opacity-0 transition-all duration-500 ease-out ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function VolunteerBanner({ c, lang }: { c: ProLandingContent; lang: Lang }) {
  const volSignup = `/register/professional/signup?region=VE&role=PROFESSIONAL&callbackUrl=${encodeURIComponent("/humanitarian/volunteer")}`;
  return (
    <section id="voluntariado" className="relative overflow-hidden bg-gradient-to-br from-rose-950 via-d8-dark to-d8-dark px-6 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(224,89,48,0.12),transparent_60%)]" />
      <div className="relative z-10 mx-auto max-w-[1180px]">
        <div className="mb-10 grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-300">
              <Heart size={12} className="fill-rose-400 text-rose-400" />
              {c.volunteerBanner.eyebrow}
            </span>
            <h2 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              {c.volunteerBanner.title}
            </h2>
            <p className="mb-6 text-base leading-relaxed text-white/60">{c.volunteerBanner.desc}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={volSignup} className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-900/40 transition hover:bg-rose-400">
                {c.volunteerBanner.cta}
                <ArrowRight size={16} />
              </Link>
              <Link href="/sos-venezuela" className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-6 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white">
                {c.volunteerBanner.link}
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {DEFAULT_VENEZUELA_POOLS.map((pool) => {
              const Icon = FEAT_ICONS[pool.slug === "medico" ? "stethoscope" : pool.slug === "psicologo" ? "brain" : pool.slug === "psicanalista" ? "sparkles" : pool.slug === "terapeuta_integrativo" ? "leaf" : pool.slug === "fisioterapeuta" ? "dumbbell" : pool.slug === "nutricionista" ? "utensils" : "heart"];
              const label = lang === "pt" ? pool.labelPt : lang === "en" ? pool.labelEn : pool.labelEs;
              return (
                <Link
                  key={pool.slug}
                  href={`/register/professional/${pool.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-rose-500/40 hover:bg-rose-500/10"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{label}</p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-rose-400" />
                </Link>
              );
            })}
          </div>
        </div>
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-white/40">{c.volunteerBanner.professionsTitle}</p>
      </div>
    </section>
  );
}

export default function ProfessionalLandingClient() {
  const { lang, setLang, c } = useProLang();
  const signup = "/register/professional/signup";
  const currency = lang === "pt" ? "R$" : "$";

  return (
    <div className="min-h-screen bg-white font-sans text-d8-text antialiased">
      <CookieBanner c={c} />
      <ProNav c={c} lang={lang} onLangChange={setLang} />

      {/* Hero */}
      <section className="relative flex min-h-[88vh] items-center overflow-hidden bg-d8-dark px-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-gradient-to-br from-brand-500/15 to-accent-500/10" style={{ clipPath: "polygon(12% 0, 100% 0, 100% 100%, 0% 100%)" }} />
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 60px),repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 1px,transparent 1px 60px)" }} />
        <div className="relative z-10 mx-auto grid w-full max-w-[1180px] items-center gap-16 py-20 lg:grid-cols-[1fr_420px]">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent-500/40 bg-accent-500/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-accent-400">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
              {c.hero.pill}
            </span>
            <h1 className="mb-5 text-[clamp(2.5rem,5.5vw,3.875rem)] font-extrabold leading-[1.1] tracking-tight text-white">
              {c.hero.title}
              <em className="mt-1 block not-italic text-accent-500">{c.hero.titleEm}</em>
            </h1>
            <p className="mb-9 max-w-[540px] text-lg text-white/60">{c.hero.sub}</p>
            <div className="mb-10 flex flex-wrap gap-3">
              <Link href={signup} className="inline-flex items-center gap-2 rounded-2xl bg-accent-500 px-8 py-4 text-[15px] font-bold text-white transition hover:-translate-y-px hover:bg-accent-600 hover:shadow-[0_8px_28px_rgba(224,89,48,0.4)]">
                {c.hero.ctaPrimary} <ArrowRight size={16} />
              </Link>
              <a href="#como-funciona" className="rounded-2xl border border-white/20 px-7 py-4 text-[15px] font-semibold text-white/85 transition hover:border-white/50 hover:text-white">
                {c.hero.ctaSecondary}
              </a>
            </div>
            <div className="flex flex-wrap gap-6">
              {c.hero.proof.map((p) => (
                <span key={p} className="flex items-center gap-2 text-[13px] font-medium text-white/55">
                  <Check size={14} className="text-accent-500" /> {p}
                </span>
              ))}
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="relative hidden lg:block">
            <div className="absolute -left-8 -top-5 z-10 flex min-w-[190px] items-center gap-2.5 rounded-xl bg-white p-3.5 shadow-2xl">
              <CreditCard size={22} className="text-accent-500" />
              <div>
                <p className="text-xs font-semibold text-d8-dark">{c.hero.notifTitle}</p>
                <p className="text-[11px] text-d8-muted">{c.hero.notifSub}</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-[20px] border border-white/10 bg-d8-dark2 shadow-[0_40px_80px_rgba(0,0,0,0.5)] transition-transform duration-500 hover:[transform:perspective(1200px)_rotateY(-2deg)_rotateX(0deg)]" style={{ transform: "perspective(1200px) rotateY(-6deg) rotateX(2deg)" }}>
              <div className="flex items-center gap-2.5 border-b border-white/[0.08] bg-white/[0.04] px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>
                <span className="ml-1.5 text-[11px] font-semibold text-white/40">{c.hero.dashTitle}</span>
              </div>
              <div className="p-4">
                <div className="mb-3.5 grid grid-cols-2 gap-2.5">
                  <div className="rounded-[10px] border border-white/[0.07] bg-white/[0.05] p-3">
                    <p className="text-2xl font-extrabold text-white">{c.hero.stat1Val}</p>
                    <p className="text-[11px] text-white/40">{c.hero.stat1Label}</p>
                    <p className="text-[10px] font-bold text-emerald-400">{c.hero.stat1Up}</p>
                  </div>
                  <div className="rounded-[10px] border border-white/[0.07] bg-white/[0.05] p-3">
                    <p className="text-2xl font-extrabold text-white">{c.hero.stat2Val}</p>
                    <p className="text-[11px] text-white/40">{c.hero.stat2Label}</p>
                    <p className="text-[10px] font-bold text-emerald-400">{c.hero.stat2Up}</p>
                  </div>
                </div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">{c.hero.nextAppts}</p>
                {c.hero.appts.map((a) => (
                  <div key={a.name} className="mb-1.5 flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.04] p-2.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${a.color === "green" ? "bg-emerald-400" : a.color === "blue" ? "bg-blue-400" : "bg-accent-500"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white/85">{a.name}</p>
                      <p className="text-[10px] text-white/40">{a.meta}</p>
                    </div>
                    <span className={`rounded-xl px-2 py-0.5 text-[10px] font-bold ${a.color === "green" ? "bg-emerald-500/15 text-emerald-400" : a.color === "blue" ? "bg-blue-500/15 text-blue-300" : "bg-accent-500/20 text-accent-400"}`}>
                      {a.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div className="border-y border-white/[0.06] bg-d8-dark2 px-6 py-4">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-7">
          {c.trust.map((item, i) => (
            <span key={item} className="flex items-center gap-2 text-[13px] font-medium text-white/60">
              {i > 0 && <span className="mr-7 hidden h-[18px] w-px bg-white/10 sm:inline" />}
              {item}
            </span>
          ))}
        </div>
      </div>

      <VolunteerBanner c={c} lang={lang} />

      {/* Features */}
      <section id="funcionalidades" className="bg-d8-off px-6 py-20">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-14">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-accent-500">{c.features.eyebrow}</span>
            <h2 className="mb-3.5 whitespace-pre-line text-[clamp(1.875rem,3.5vw,2.75rem)] font-extrabold tracking-tight text-d8-dark">{c.features.title}</h2>
            <p className="max-w-[560px] text-[17px] text-d8-muted">{c.features.sub}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {c.features.items.map((feat, i) => {
              const Icon = FEAT_ICONS[feat.icon] ?? Calendar;
              return (
                <FadeIn key={feat.title} delay={i * 100}>
                  <div className="group relative overflow-hidden rounded-2xl border-[1.5px] border-d8-border bg-white p-7 transition hover:-translate-y-1 hover:border-brand-500 hover:shadow-lg">
                    <div className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-gradient-to-r from-accent-500 to-brand-500 transition-transform group-hover:scale-x-100" />
                    <div className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-accent-50 text-accent-500">
                      <Icon size={24} />
                    </div>
                    <h3 className="mb-2.5 text-[17px] font-bold text-d8-dark">{feat.title}</h3>
                    <p className="text-sm leading-relaxed text-d8-muted">{feat.desc}</p>
                    <ul className="mt-3.5 flex flex-col gap-1.5 border-t border-d8-border pt-3.5">
                      {feat.details.map((d) => (
                        <li key={d} className="relative pl-4 text-[13px] text-d8-text before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-accent-500">{d}</li>
                      ))}
                    </ul>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-accent-500">{c.how.eyebrow}</span>
              <h2 className="mb-3.5 text-[clamp(1.875rem,3.5vw,2.75rem)] font-extrabold tracking-tight text-d8-dark">{c.how.title}</h2>
              <p className="mb-8 max-w-[560px] text-[17px] text-d8-muted">{c.how.sub}</p>
              <div className="flex flex-col">
                {c.how.steps.map((step, i) => (
                  <div key={step.title} className="flex gap-5 border-b border-d8-border py-5 last:border-0">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-base font-extrabold text-white ${i === 0 ? "border-accent-500 bg-accent-500" : "border-d8-border bg-d8-dark"}`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="mb-1.5 text-base font-bold text-d8-dark">{step.title}</p>
                      <p className="text-sm text-d8-muted">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden justify-center lg:flex">
              <div className="w-[260px] rounded-[32px] border-[6px] border-[#1e3045] bg-d8-dark p-4 shadow-2xl">
                <div className="mx-auto mb-3.5 h-[22px] w-20 rounded-xl bg-d8-dark" />
                <div className="min-h-[380px] rounded-[18px] bg-white p-4">
                  <p className="text-[10px] text-d8-muted">{c.how.phoneGreeting}</p>
                  <p className="mb-3.5 text-[15px] font-bold text-d8-dark">{c.how.phoneName}</p>
                  <div className="mb-3.5 flex gap-2">
                    {c.how.phoneStats.map((s) => (
                      <div key={s.lbl} className="flex-1 rounded-[10px] border border-d8-border bg-d8-off p-2 text-center">
                        <p className="text-lg font-extrabold text-d8-dark">{s.val}</p>
                        <p className="text-[9px] font-semibold text-d8-muted">{s.lbl}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-d8-muted">{c.how.phoneSection}</p>
                  {c.how.phoneAppts.map((a) => (
                    <div key={a.name} className="mb-1.5 flex items-center gap-2 rounded-lg border border-d8-border bg-d8-off p-2.5">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-accent-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-d8-dark">{a.name}</p>
                        <p className="text-[10px] text-d8-muted">{a.time}</p>
                      </div>
                      <span className="ml-auto rounded-lg bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">{"\u2713"}</span>
                    </div>
                  ))}
                  <div className="mt-2.5 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 p-3.5 text-white">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider opacity-70">{c.how.phoneRxLabel}</p>
                    <p className="text-[13px] font-bold">{c.how.phoneRxName}</p>
                    <p className="mt-1 text-[10px] opacity-65">{c.how.phoneRxDetail}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prescriptions deep dive */}
      <section id="prescricoes" className="bg-d8-off px-6 py-20">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-accent-500">{c.prescriptions.eyebrow}</span>
              <h2 className="mb-3.5 text-[clamp(1.5rem,2.8vw,2.125rem)] font-extrabold tracking-tight text-d8-dark">{c.prescriptions.title}</h2>
              <p className="mb-5 text-base leading-relaxed text-d8-muted">{c.prescriptions.desc}</p>
              <ul className="flex flex-col gap-2.5">
                {c.prescriptions.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[15px] text-d8-text">
                    <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-accent-500 text-[11px] font-extrabold text-white">{"\u2713"}</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[20px] border border-d8-border bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-3 border-b-2 border-d8-border pb-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-extrabold text-white">D8</div>
                <div>
                  <p className="text-sm font-bold text-d8-dark">{c.prescriptions.rxDoc}</p>
                  <p className="text-xs text-d8-muted">{c.prescriptions.rxMeta}</p>
                </div>
              </div>
              <div className="mb-3.5 rounded-[10px] bg-d8-off p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-d8-muted">{c.prescriptions.rxPatient}</p>
                <p className="text-sm font-bold text-d8-dark">{c.prescriptions.rxPatientName}</p>
                <p className="text-xs text-d8-muted">{c.prescriptions.rxPatientDetail}</p>
              </div>
              {c.prescriptions.rxDrugs.map((drug) => (
                <div key={drug.name} className="flex items-start justify-between border-b border-dashed border-d8-border py-3 last:border-0">
                  <div>
                    <p className="text-sm font-bold text-d8-dark">{drug.name}</p>
                    <p className="mt-0.5 text-xs text-d8-muted">{drug.dose}</p>
                  </div>
                  {drug.tag && <span className="rounded-lg bg-accent-500/10 px-2 py-0.5 text-[10px] font-bold text-accent-500">{drug.tag}</span>}
                </div>
              ))}
              <div className="mt-4 flex items-center gap-2 border-t border-d8-border pt-3.5 text-[11px] text-d8-muted">
                <Lock size={12} /> {c.prescriptions.rxSig}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Schedule deep dive */}
      <section id="agenda" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <div className="rounded-[20px] border border-white/[0.08] bg-d8-dark2 p-6 shadow-2xl">
                <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/30">{c.schedule.weekLabel}</p>
                <div className="mb-3.5 grid grid-cols-5 gap-1.5">
                  {["SEG", "TER", "QUA", "QUI", "SEX"].map((d, i) => (
                    <div key={d} className="text-center">
                      <p className="mb-1.5 text-[10px] font-semibold text-white/40">{d}</p>
                      <div className={`mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i === 1 ? "bg-accent-500 text-white" : "text-white/80"}`}>
                        {16 + i}
                      </div>
                      <div className={`mb-1 rounded-md px-1 py-0.5 text-[9px] font-semibold ${i % 2 === 0 ? "bg-brand-500/50 text-blue-300" : "bg-white/[0.06] text-white/70"}`}>09:00</div>
                      <div className={`mb-1 rounded-md px-1 py-0.5 text-[9px] font-semibold ${i === 1 ? "bg-accent-500/40 text-orange-300" : "bg-brand-500/50 text-blue-300"}`}>14:00</div>
                    </div>
                  ))}
                </div>
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/30">{c.schedule.nextLabel}</p>
                <div className="mb-2.5 flex gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500 text-[11px] font-bold text-white">DR</span>
                  <div className="rounded-xl rounded-bl-sm bg-accent-500 px-3 py-2 text-xs leading-relaxed text-white">{c.schedule.msgDoc}</div>
                </div>
                <div className="flex flex-row-reverse gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">MA</span>
                  <div className="rounded-xl rounded-br-sm bg-white/[0.08] px-3 py-2 text-xs leading-relaxed text-white/85">{c.schedule.msgPat}</div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-accent-500">{c.schedule.eyebrow}</span>
              <h2 className="mb-3.5 text-[clamp(1.5rem,2.8vw,2.125rem)] font-extrabold tracking-tight text-d8-dark">{c.schedule.title}</h2>
              <p className="mb-5 text-base leading-relaxed text-d8-muted">{c.schedule.desc}</p>
              <ul className="flex flex-col gap-2.5">
                {c.schedule.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[15px] text-d8-text">
                    <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-accent-500 text-[11px] font-extrabold text-white">{"\u2713"}</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Professions grid */}
      <section className="bg-d8-off px-6 py-20">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-accent-500">{c.professions.eyebrow}</span>
            <h2 className="mb-3.5 text-[clamp(1.875rem,3.5vw,2.75rem)] font-extrabold tracking-tight text-d8-dark">{c.professions.title}</h2>
            <p className="mx-auto max-w-[560px] text-[17px] text-d8-muted">{c.professions.sub}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {DEFAULT_VENEZUELA_POOLS.map((pool) => {
              const prof = c.professionPages[pool.slug];
              const Icon = FEAT_ICONS[prof.icon] ?? Stethoscope;
              return (
                <Link key={pool.slug} href={`/register/professional/${pool.slug}`} className="group rounded-2xl border border-d8-border bg-white p-6 transition hover:-translate-y-1 hover:border-brand-500 hover:shadow-lg">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                    <Icon size={22} />
                  </div>
                  <h3 className="mb-1.5 font-bold text-d8-dark">{prof.title}</h3>
                  <p className="mb-3 text-sm leading-relaxed text-d8-muted line-clamp-2">{prof.subtitle}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-500 group-hover:gap-2 transition-all">
                    {c.professions.cta} <ChevronRight size={14} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="bg-d8-dark px-6 py-20">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-accent-400">{c.pricing.eyebrow}</span>
            <h2 className="mb-3.5 text-[clamp(1.875rem,3.5vw,2.75rem)] font-extrabold tracking-tight text-white">{c.pricing.title}</h2>
            <p className="mx-auto max-w-[560px] text-[17px] text-white/50">{c.pricing.sub}</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {c.pricing.plans.map((plan) => (
              <div key={plan.name} className={`rounded-[20px] border-[1.5px] p-8 transition ${plan.featured ? "scale-[1.03] border-accent-500 bg-accent-500" : "border-white/10 bg-white/[0.04]"}`}>
                <span className="mb-5 inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">{plan.badge}</span>
                <p className="text-[22px] font-extrabold text-white">{plan.name}</p>
                <p className="my-3 text-[44px] font-extrabold leading-none text-white">
                  <sup className="mr-0.5 text-xl">{currency}</sup>{plan.price}
                  <small className="text-base font-medium opacity-70">{lang === "pt" ? "/m\u00eas" : lang === "es" ? "/mes" : "/mo"}</small>
                </p>
                <p className="mb-6 text-[13px] text-white/55">{plan.period}</p>
                <div className="mb-6 h-px bg-white/10" />
                <ul className="mb-7 flex flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f.text} className={`flex items-center gap-2.5 text-sm ${f.included ? "text-white/80" : "text-white/35"}`}>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${f.included ? "bg-white/20 text-white" : "bg-white/10 text-white/40"}`}>
                        {f.included ? "\u2713" : "\u00d7"}
                      </span>
                      {f.text}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href ?? signup}
                  className={`block w-full rounded-[10px] py-3.5 text-center text-[15px] font-bold transition ${plan.featured ? "bg-white text-accent-500 hover:bg-white/90" : "border-[1.5px] border-white/30 text-white hover:bg-white/10"}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[13px] text-white/40">{c.pricing.note}</p>
        </div>
      </section>

      {/* LGPD */}
      <div id="lgpd" className="border-t-[3px] border-brand-500 bg-brand-50 px-6 py-9">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-start gap-6">
          <Shield size={40} className="shrink-0 text-brand-600" />
          <div>
            <h3 className="mb-2 text-lg font-bold text-brand-700">{c.lgpd.title}</h3>
            <p className="text-sm leading-relaxed text-brand-700/85">
              {c.lgpd.body.split("dpo@doctor8.org")[0]}
              <a href="mailto:dpo@doctor8.org" className="font-semibold text-brand-500 underline">dpo@doctor8.org</a>
            </p>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-d8-dark px-6 py-24 text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse,rgba(224,89,48,0.14),transparent_65%)]" />
        <h2 className="relative z-10 mb-4 text-[clamp(2.125rem,4.5vw,3.375rem)] font-extrabold text-white">
          {c.ctaFinal.title} <em className="not-italic text-accent-500">{c.ctaFinal.titleEm}</em><br />{c.ctaFinal.sub}
        </h2>
        <p className="relative z-10 mx-auto mb-10 max-w-[540px] text-lg text-white/55" />
        <div className="relative z-10 flex flex-wrap justify-center gap-3.5">
          <Link href={signup} className="inline-flex items-center gap-2 rounded-2xl bg-accent-500 px-9 py-4 text-base font-bold text-white transition hover:bg-accent-600">
            {c.ctaFinal.primary} <ArrowRight size={16} />
          </Link>
          <a href="mailto:contato@doctor8.org" className="rounded-2xl border border-white/20 px-7 py-4 text-base font-semibold text-white/85 transition hover:border-white/50 hover:text-white">
            {c.ctaFinal.secondary}
          </a>
        </div>
      </section>

      <ProFooter c={c} />
    </div>
  );
}
