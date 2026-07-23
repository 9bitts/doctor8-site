import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  MessageCircle,
  Phone,
} from "lucide-react";
import IntentLandingHeader from "@/components/marketing/IntentLandingHeader";
import {
  CONDITION_WHATSAPP_DISPLAY,
  conditionWhatsAppHref,
  type ConditionLandingContent,
} from "@/lib/condition-seo";

/** Shared spacing — works on iPhone notch, Samsung, desktop */
const SECTION =
  "max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 lg:py-20";
const CTA_BTN =
  "inline-flex items-center justify-center gap-2 min-h-11 rounded-xl px-5 py-3 text-sm font-semibold transition";

export default function ConditionLanding({
  content: C,
  heroSrc,
  careSrc,
}: {
  content: ConditionLandingContent;
  heroSrc: string;
  careSrc: string;
}) {
  const a = C.accent;
  const entry = C.entry;
  const waHref = conditionWhatsAppHref(entry.slug, entry.nomePopular);

  return (
    <main className="overflow-x-hidden">
      {/* HERO — header in flow (no absolute overlap) */}
      <section className="relative overflow-hidden bg-slate-950 min-h-[70vh] sm:min-h-[75vh] flex flex-col">
        <div className="absolute inset-0">
          <Image
            src={heroSrc}
            alt={C.hero.image.alt}
            fill
            priority
            className="object-cover object-[center_28%] opacity-45"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-slate-950/60" />
        </div>

        <div className="relative flex flex-col flex-1">
          <IntentLandingHeader />

          <div className="flex-1 flex flex-col justify-center max-w-6xl mx-auto w-full px-4 sm:px-6 pt-8 sm:pt-12 pb-14 sm:pb-20 lg:pb-24">
            <p
              className={`text-sm font-semibold uppercase tracking-wide ${a.heroEyebrow}`}
            >
              {C.hero.eyebrow}
            </p>
            <h1 className="mt-3 sm:mt-4 max-w-2xl text-[1.75rem] leading-tight sm:text-5xl font-bold tracking-tight text-white sm:leading-[1.1] break-words">
              {C.hero.title}
              <span
                className={`block mt-2 text-xl sm:text-3xl font-semibold ${a.heroHighlight}`}
              >
                com {C.hero.titleHighlight}
              </span>
            </h1>
            <p className="mt-4 sm:mt-5 max-w-xl text-base sm:text-lg text-slate-200 leading-relaxed">
              {C.hero.subtitle}
            </p>
            <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
              <Link
                href={C.hero.primaryCta.href}
                className={`${CTA_BTN} text-white shadow-lg ${a.ctaBg} hover:opacity-95 w-full sm:w-auto`}
              >
                {C.hero.primaryCta.label} <ArrowRight size={16} />
              </Link>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`${CTA_BTN} border border-white/30 bg-white/10 text-white hover:bg-white/15 w-full sm:w-auto`}
              >
                <MessageCircle size={16} /> {C.hero.secondaryCta.label}
              </a>
              <Link
                href={C.hero.browseCta.href}
                className={`${CTA_BTN} text-slate-100 hover:text-white hover:bg-white/10 w-full sm:w-auto`}
              >
                {C.hero.browseCta.label}
              </Link>
            </div>
            <p className="mt-6 max-w-lg text-sm text-slate-200 leading-relaxed flex gap-2.5">
              <Phone
                size={16}
                className={`shrink-0 mt-0.5 ${a.darkEyebrow}`}
                aria-hidden
              />
              <span>{C.hero.emergencyNote}</span>
            </p>
          </div>
        </div>
      </section>

      {/* WHEN TO BOOK — light */}
      <section className="bg-white border-b border-slate-200">
        <div className={SECTION}>
          <p
            className={`text-sm font-semibold uppercase tracking-wide ${a.section}`}
          >
            {C.whenToBook.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 max-w-2xl break-words">
            {C.whenToBook.title}
          </h2>
          <p className="mt-3 max-w-2xl text-slate-700 leading-relaxed">
            {C.whenToBook.subtitle}
          </p>
          <ul className="mt-8 sm:mt-10 grid sm:grid-cols-2 gap-x-8 sm:gap-x-10 gap-y-7 sm:gap-y-8">
            {C.whenToBook.items.map((item) => (
              <li key={item.title} className="flex gap-3">
                <CheckCircle2
                  size={20}
                  className={`${a.icon} shrink-0 mt-0.5`}
                  aria-hidden
                />
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-700 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* HOW IT WORKS — light gray */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className={SECTION}>
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-14 items-center">
            <div className="relative aspect-[16/10] sm:aspect-[16/9] overflow-hidden rounded-2xl bg-slate-200">
              <Image
                src={C.howItWorks.image.src}
                alt={C.howItWorks.image.alt}
                fill
                className="object-cover object-[center_30%]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="min-w-0">
              <p
                className={`text-sm font-semibold uppercase tracking-wide ${a.section}`}
              >
                {C.howItWorks.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 break-words">
                {C.howItWorks.title}
              </h2>
              <p className="mt-3 text-slate-700 leading-relaxed">
                {C.howItWorks.subtitle}
              </p>
              <ol className="mt-7 sm:mt-8 space-y-5">
                {C.howItWorks.steps.map((s) => (
                  <li key={s.step} className="flex gap-4">
                    <span
                      className={`text-2xl font-bold leading-none w-10 shrink-0 ${a.step}`}
                    >
                      {s.step}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900">{s.title}</h3>
                      <p className="mt-0.5 text-sm text-slate-700 leading-relaxed">
                        {s.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* CARE — light */}
      <section className="bg-white border-b border-slate-200">
        <div className={SECTION}>
          <p
            className={`text-sm font-semibold uppercase tracking-wide ${a.section}`}
          >
            {C.care.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 max-w-2xl break-words">
            {C.care.title}
          </h2>
          <p className="mt-3 max-w-2xl text-slate-700 leading-relaxed">
            {C.care.subtitle}
          </p>
          <div className="mt-8 sm:mt-10 grid sm:grid-cols-2 gap-6 sm:gap-8">
            {C.care.items.map((item) => (
              <div key={item.title} className="min-w-0">
                <h3 className="font-semibold text-slate-900 flex items-start gap-2">
                  <HeartPulse
                    size={18}
                    className={`${a.icon} shrink-0 mt-0.5`}
                    aria-hidden
                  />
                  <span>{item.title}</span>
                </h3>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed pl-6 sm:pl-0 sm:ml-6">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY — dark canvas: only light text */}
      <section className="bg-slate-950 border-b border-white/10">
        <div className={SECTION}>
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-14 items-center">
            <div className="min-w-0">
              <p
                className={`text-sm font-semibold uppercase tracking-wide ${a.darkEyebrow}`}
              >
                {C.why.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white max-w-md break-words">
                {C.why.title}
              </h2>
              <ul className="mt-7 sm:mt-8 space-y-5 sm:space-y-6">
                {C.why.items.map((item) => (
                  <li key={item.label}>
                    <p className={`font-semibold ${a.darkItem}`}>{item.label}</p>
                    <p className="mt-1 text-sm text-slate-200 leading-relaxed">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-[16/10] sm:aspect-[16/9] overflow-hidden rounded-2xl order-first lg:order-last bg-slate-800">
              <Image
                src={careSrc}
                alt={C.why.image.alt}
                fill
                className="object-cover object-[center_30%]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — light */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {C.faq.title}
          </h2>
          <dl className="mt-7 sm:mt-8 divide-y divide-slate-200 border-y border-slate-200">
            {C.faq.items.map((item) => (
              <div key={item.q} className="py-5">
                <dt className="font-semibold text-slate-900">{item.q}</dt>
                <dd className="mt-2 text-sm text-slate-700 leading-relaxed">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
          {C.related.length > 0 && (
            <div className="mt-8">
              <p className="text-sm font-semibold text-slate-800 mb-3">
                Também pode interessar
              </p>
              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {C.related.map((r) => (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      className={`text-sm font-semibold ${a.section} underline-offset-2 hover:underline`}
                    >
                      {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* FINAL CTA — colored dark band: white / near-white only */}
      <section className={a.ctaBg}>
        <div className={SECTION}>
          <h2 className="text-2xl sm:text-3xl font-bold text-white max-w-2xl break-words">
            {C.finalCta.title}
          </h2>
          <p className={`mt-3 max-w-xl leading-relaxed ${a.ctaSub}`}>
            {C.finalCta.subtitle}
          </p>
          <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
            <Link
              href={C.finalCta.primary.href}
              className={`${CTA_BTN} w-full sm:w-auto ${a.ctaBtn} ${a.ctaBtnHover}`}
            >
              {C.finalCta.primary.label} <ArrowRight size={16} />
            </Link>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`${CTA_BTN} w-full sm:w-auto border border-white/50 text-white hover:bg-white/10`}
            >
              <MessageCircle size={16} /> {C.finalCta.secondary.label}
            </a>
            <Link
              href={C.finalCta.browse.href}
              className={`${CTA_BTN} w-full sm:w-auto text-white/90 hover:text-white hover:bg-white/10`}
            >
              {C.finalCta.browse.label}
            </Link>
          </div>
          <p className={`mt-6 text-sm ${a.footnote}`}>
            WhatsApp: {CONDITION_WHATSAPP_DISPLAY}
          </p>
        </div>
      </section>
    </main>
  );
}
