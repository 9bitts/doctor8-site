import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Droplets,
  MessageCircle,
  Phone,
} from "lucide-react";
import {
  DIABETES_LANDING as C,
  DIABETES_WHATSAPP_DEFAULT_MESSAGE,
  DIABETES_WHATSAPP_DISPLAY,
  diabetesWhatsAppHref,
} from "@/lib/diabetes-landing-content";

const waHref = diabetesWhatsAppHref(DIABETES_WHATSAPP_DEFAULT_MESSAGE);

export default function DiabetesLanding() {
  return (
    <main>
      <section className="relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          <Image
            src={C.hero.image.src}
            alt={C.hero.image.alt}
            fill
            priority
            className="object-cover object-center opacity-55"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">
            {C.hero.eyebrow}
          </p>
          <h1 className="mt-4 max-w-2xl text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1]">
            {C.hero.title}
            <span className="block mt-2 text-teal-300 text-2xl sm:text-3xl font-semibold">
              {C.hero.titleHighlight}
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base sm:text-lg text-slate-300 leading-relaxed">
            {C.hero.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={C.hero.primaryCta.href}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-600 transition shadow-lg shadow-teal-500/25"
            >
              {C.hero.primaryCta.label} <ArrowRight size={16} />
            </Link>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              <MessageCircle size={16} /> {C.hero.secondaryCta.label}
            </a>
            <Link
              href={C.hero.browseCta.href}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-slate-100 hover:text-white transition"
            >
              {C.hero.browseCta.label}
            </Link>
          </div>
          <p className="mt-6 max-w-lg text-xs text-slate-200 leading-relaxed flex gap-2">
            <Phone size={14} className="shrink-0 mt-0.5 text-teal-400" />
            {C.hero.emergencyNote}
          </p>
        </div>
      </section>

      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
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
                  className="text-teal-600 shrink-0 mt-0.5"
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

      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
              <Image
                src={C.howItWorks.image.src}
                alt={C.howItWorks.image.alt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
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
                    <span className="text-2xl font-bold text-teal-600 leading-none w-10 shrink-0">
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

      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
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
                  <Droplets size={18} className="text-teal-600" />
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

      <section className="bg-slate-950 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">
                {C.risks.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white max-w-md">
                {C.risks.title}
              </h2>
              <ul className="mt-8 space-y-6">
                {C.risks.items.map((item) => (
                  <li key={item.organ}>
                    <p className="text-teal-300 font-semibold">{item.organ}</p>
                    <p className="mt-1 text-sm text-slate-300 leading-relaxed">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl order-first lg:order-last">
              <Image
                src={C.risks.image.src}
                alt={C.risks.image.alt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src={C.nutrition.image.src}
                alt={C.nutrition.image.alt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                {C.nutrition.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
                {C.nutrition.title}
              </h2>
              <p className="mt-3 text-slate-600 leading-relaxed">{C.nutrition.body}</p>
              <ul className="mt-6 space-y-3">
                {C.nutrition.bullets.map((b) => (
                  <li key={b} className="flex gap-2.5 text-sm text-slate-700">
                    <CheckCircle2
                      size={18}
                      className="text-teal-600 shrink-0 mt-0.5"
                    />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

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
            Também tem pressão alta?{" "}
            <Link
              href="/hipertensao"
              className="font-semibold text-teal-700 hover:text-teal-800"
            >
              Ver página de hipertensão
            </Link>
          </p>
        </div>
      </section>

      <section className="bg-teal-700">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white max-w-2xl">
            {C.finalCta.title}
          </h2>
          <p className="mt-3 max-w-xl text-teal-100">{C.finalCta.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={C.finalCta.primary.href}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50 transition"
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
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-teal-100 hover:text-white transition"
            >
              {C.finalCta.browse.label}
            </Link>
            <Link
              href={C.finalCta.crossLink.href}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-teal-100 hover:text-white transition"
            >
              {C.finalCta.crossLink.label}
            </Link>
          </div>
          <p className="mt-6 text-xs text-teal-200">
            WhatsApp: {DIABETES_WHATSAPP_DISPLAY}
          </p>
        </div>
      </section>
    </main>
  );
}
