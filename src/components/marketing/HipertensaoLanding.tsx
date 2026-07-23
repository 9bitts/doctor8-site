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
  HIPERTENSAO_LANDING as C,
  HIPERTENSAO_WHATSAPP_DEFAULT_MESSAGE,
  HIPERTENSAO_WHATSAPP_DISPLAY,
  hipertensaoWhatsAppHref,
} from "@/lib/hipertensao-landing-content";

const waHref = hipertensaoWhatsAppHref(HIPERTENSAO_WHATSAPP_DEFAULT_MESSAGE);

export default function HipertensaoLanding() {
  return (
    <main>
      <section className="relative overflow-hidden bg-slate-950 min-h-[70vh] sm:min-h-[75vh] flex flex-col">
        <div className="absolute inset-0">
          <Image
            src={C.hero.image.src}
            alt={C.hero.image.alt}
            fill
            priority
            className="object-cover object-[center_28%] opacity-45"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-slate-950/55" />
        </div>

        <div className="relative flex flex-col flex-1">
          <IntentLandingHeader />
          <div className="flex-1 flex flex-col justify-center max-w-6xl mx-auto w-full px-4 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-24">
          <p className="text-sm font-semibold uppercase tracking-wide text-rose-200">
            {C.hero.eyebrow}
          </p>
          <h1 className="mt-4 max-w-2xl text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1]">
            {C.hero.title}
            <span className="block mt-2 text-rose-200 text-2xl sm:text-3xl font-semibold">
              com {C.hero.titleHighlight}
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base sm:text-lg text-slate-200 leading-relaxed">
            {C.hero.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={C.hero.primaryCta.href}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-800 transition shadow-lg shadow-rose-500/25 min-h-11"
            >
              {C.hero.primaryCta.label} <ArrowRight size={16} />
            </Link>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition min-h-11"
            >
              <MessageCircle size={16} /> {C.hero.secondaryCta.label}
            </a>
            <Link
              href={C.hero.browseCta.href}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-slate-100 hover:text-white transition min-h-11"
            >
              {C.hero.browseCta.label}
            </Link>
          </div>
          <p className="mt-6 max-w-lg text-sm text-slate-200 leading-relaxed flex gap-2">
            <Phone size={16} className="shrink-0 mt-0.5 text-rose-200" />
            {C.hero.emergencyNote}
          </p>
          </div>
        </div>
      </section>

      {/* When to book */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">
            {C.whenToBook.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 max-w-2xl">
            {C.whenToBook.title}
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600 leading-relaxed">
            {C.whenToBook.subtitle}
          </p>
          <ul className="mt-10 grid sm:grid-cols-2 gap-x-10 gap-y-8">
            {C.whenToBook.items.map((item) => (
              <li key={item.title} className="flex gap-3">
                <CheckCircle2
                  size={20}
                  className="text-rose-500 shrink-0 mt-0.5"
                />
                <div>
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works + photo */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="relative aspect-[16/10] sm:aspect-[16/9] overflow-hidden rounded-2xl">
              <Image
                src={C.howItWorks.image.src}
                alt={C.howItWorks.image.alt}
                fill
                className="object-cover object-[center_30%]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">
                {C.howItWorks.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
                {C.howItWorks.title}
              </h2>
              <p className="mt-3 text-slate-600 leading-relaxed">
                {C.howItWorks.subtitle}
              </p>
              <ol className="mt-8 space-y-5">
                {C.howItWorks.steps.map((s) => (
                  <li key={s.step} className="flex gap-4">
                    <span className="text-2xl font-bold text-rose-500 leading-none w-10 shrink-0">
                      {s.step}
                    </span>
                    <div>
                      <h3 className="font-semibold text-slate-900">{s.title}</h3>
                      <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">
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

      {/* Specialties */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">
            {C.specialties.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 max-w-2xl">
            {C.specialties.title}
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600 leading-relaxed">
            {C.specialties.subtitle}
          </p>
          <div className="mt-10 grid sm:grid-cols-2 gap-8">
            {C.specialties.items.map((item) => (
              <div key={item.title}>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <HeartPulse size={18} className="text-rose-500" />
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Risks + lifestyle image */}
      <section className="bg-slate-950 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-rose-300">
                {C.risks.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white max-w-md">
                {C.risks.title}
              </h2>
              <ul className="mt-8 space-y-6">
                {C.risks.items.map((item) => (
                  <li key={item.organ}>
                    <p className="text-rose-300 font-semibold">{item.organ}</p>
                    <p className="mt-1 text-sm text-slate-300 leading-relaxed">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-[16/10] sm:aspect-[16/9] overflow-hidden rounded-2xl order-first lg:order-last">
              <Image
                src={C.risks.image.src}
                alt={C.risks.image.alt}
                fill
                className="object-cover object-[center_30%]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pharmacy */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src={C.pharmacy.image.src}
                alt={C.pharmacy.image.alt}
                fill
                className="object-cover object-[center_30%]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">
                {C.pharmacy.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
                {C.pharmacy.title}
              </h2>
              <p className="mt-3 text-slate-600 leading-relaxed">{C.pharmacy.body}</p>
              <ul className="mt-6 space-y-3">
                {C.pharmacy.bullets.map((b) => (
                  <li key={b} className="flex gap-2.5 text-sm text-slate-700">
                    <CheckCircle2
                      size={18}
                      className="text-rose-500 shrink-0 mt-0.5"
                    />
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                href="/farmacias/buscar"
                className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-rose-600 hover:text-rose-700"
              >
                Buscar farmácias <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-14 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {C.faq.title}
          </h2>
          <dl className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
            {C.faq.items.map((item) => (
              <div key={item.q} className="py-5">
                <dt className="font-semibold text-slate-900">{item.q}</dt>
                <dd className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-slate-600">
            Também tem diabetes?{" "}
            <Link
              href="/diabetes"
              className="font-semibold text-rose-600 hover:text-rose-700"
            >
              Ver página de diabetes
            </Link>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-rose-600">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white max-w-2xl">
            {C.finalCta.title}
          </h2>
          <p className="mt-3 max-w-xl text-rose-100">{C.finalCta.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={C.finalCta.primary.href}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 transition"
            >
              {C.finalCta.primary.label} <ArrowRight size={16} />
            </Link>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              <MessageCircle size={16} /> {C.finalCta.secondary.label}
            </a>
            <Link
              href={C.finalCta.browse.href}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-rose-100 hover:text-white transition"
            >
              {C.finalCta.browse.label}
            </Link>
          </div>
          <p className="mt-6 text-xs text-rose-200">
            WhatsApp: {HIPERTENSAO_WHATSAPP_DISPLAY}
          </p>
        </div>
      </section>
    </main>
  );
}
