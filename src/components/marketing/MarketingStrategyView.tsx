import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Target,
  Wrench,
} from "lucide-react";
import {
  getAdjacentStrategies,
  marketingStrategyWhatsAppHref,
  type MarketingStrategyPage,
} from "@/lib/marketing-strategy-content";

function CtaLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default function MarketingStrategyView({
  strategy,
}: {
  strategy: MarketingStrategyPage;
}) {
  const { prev, next } = getAdjacentStrategies(strategy.slug);
  const wa = marketingStrategyWhatsAppHref(strategy.whatsappMessage);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-white/10 bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/40 via-slate-950 to-slate-950" />
        <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-14 sm:pt-14 sm:pb-20">
          <Link
            href="/marketing/estrategias"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition"
          >
            <ArrowLeft size={14} /> Todas as estratégias
          </Link>
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-accent-400">
            {strategy.hero.eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1]">
            {strategy.hero.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed">
            {strategy.hero.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaLink
              href={strategy.ctas.primary.href}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-white hover:bg-accent-600 transition shadow-lg shadow-accent-500/25"
            >
              {strategy.ctas.primary.label} <ArrowRight size={16} />
            </CtaLink>
            <CtaLink
              href={wa}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              <MessageCircle size={16} /> Alinhar no WhatsApp
            </CtaLink>
          </div>
        </div>
      </section>

      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Pitch para este público
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 max-w-3xl leading-tight">
            {strategy.pitch.headline}
          </h2>
          <p className="mt-4 max-w-2xl text-slate-600 leading-relaxed">
            {strategy.pitch.body}
          </p>
          <ul className="mt-8 grid sm:grid-cols-2 gap-3 max-w-3xl">
            {strategy.pitch.promises.map((p) => (
              <li
                key={p}
                className="flex gap-2.5 text-sm text-slate-700 leading-snug"
              >
                <CheckCircle2
                  size={18}
                  className="text-brand-500 shrink-0 mt-0.5"
                />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Apresentação
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
            {strategy.presentation.title}
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-6">
            {strategy.presentation.points.map((point) => (
              <div key={point.title} className="space-y-2">
                <h3 className="text-base font-bold text-slate-900">{point.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{point.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-brand-600" />
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
              Canais
            </p>
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
            Por onde chegamos neste público
          </h2>
          <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
            {strategy.channels.map((ch) => (
              <div
                key={ch.name}
                className="py-4 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-6"
              >
                <p className="text-sm font-semibold text-slate-900">{ch.name}</p>
                <p className="text-sm text-slate-600 sm:text-right max-w-md">{ch.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Jornada
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
            Funil de ativação
          </h2>
          <ol className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {strategy.journey.map((j) => (
              <li key={j.step}>
                <p className="text-3xl font-bold text-slate-200">{j.step}</p>
                <h3 className="mt-2 text-base font-bold text-slate-900">{j.title}</h3>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">{j.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <div className="flex items-center gap-2">
            <Wrench size={18} className="text-brand-600" />
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
              Ferramentas
            </p>
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
            Criar vs. operar
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Criar (produto / growth)
              </p>
              <ul className="space-y-2.5">
                {strategy.tools
                  .filter((t) => t.kind === "criar")
                  .map((t) => (
                    <li key={t.label} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-500 shrink-0" />
                      {t.label}
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Operar (sem feature nova)
              </p>
              <ul className="space-y-2.5">
                {strategy.tools
                  .filter((t) => t.kind === "operar")
                  .map((t) => (
                    <li key={t.label} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
                      {t.label}
                    </li>
                  ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-200 grid sm:grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Métricas
              </p>
              <ul className="space-y-2">
                {strategy.metrics.map((m) => (
                  <li key={m} className="text-sm text-slate-700">
                    · {m}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Dependência
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {strategy.dependencies}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Próximo passo com este público
          </h2>
          <p className="mt-3 max-w-xl text-slate-300">
            Abra a landing de produto, o cadastro ou alinhe a apresentação no WhatsApp.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaLink
              href={strategy.ctas.primary.href}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-white hover:bg-accent-600 transition"
            >
              {strategy.ctas.primary.label}
            </CtaLink>
            {strategy.ctas.secondary && (
              <CtaLink
                href={strategy.ctas.secondary.href}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                {strategy.ctas.secondary.label}
              </CtaLink>
            )}
            {strategy.ctas.product && (
              <CtaLink
                href={strategy.ctas.product.href}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-slate-300 hover:text-white transition"
              >
                {strategy.ctas.product.label}
              </CtaLink>
            )}
            <CtaLink
              href={wa}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-slate-300 hover:text-white transition"
            >
              <MessageCircle size={16} /> WhatsApp
            </CtaLink>
          </div>
        </div>
      </section>

      <nav
        className="bg-white border-b border-slate-200"
        aria-label="Estratégias vizinhas"
      >
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row sm:justify-between gap-4">
          {prev ? (
            <Link
              href={`/marketing/estrategias/${prev.slug}`}
              className="group flex flex-col gap-1 text-left"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Anterior
              </span>
              <span className="text-sm font-semibold text-slate-900 group-hover:text-brand-600 inline-flex items-center gap-1">
                <ArrowLeft size={14} /> {prev.navLabel}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/marketing/estrategias/${next.slug}`}
              className="group flex flex-col gap-1 text-left sm:text-right sm:items-end"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Próxima
              </span>
              <span className="text-sm font-semibold text-slate-900 group-hover:text-brand-600 inline-flex items-center gap-1">
                {next.navLabel} <ArrowRight size={14} />
              </span>
            </Link>
          ) : (
            <span />
          )}
        </div>
      </nav>
    </main>
  );
}
