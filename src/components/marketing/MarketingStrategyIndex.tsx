import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  MARKETING_STRATEGIES,
  MARKETING_STRATEGY_META,
} from "@/lib/marketing-strategy-content";

export default function MarketingStrategyIndex() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-white/10 bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/40 via-slate-950 to-slate-950" />
        <div className="relative max-w-6xl mx-auto px-4 pt-14 pb-16 sm:pt-20 sm:pb-24">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent-400">
            Distribuição Doctor8
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1]">
            Estratégias por público
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed">
            {MARKETING_STRATEGY_META.description}
          </p>
          <Link
            href="/marketing"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition"
          >
            Voltar ao mapa do ecossistema <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <ol className="space-y-0 divide-y divide-slate-200 border-y border-slate-200">
            {MARKETING_STRATEGIES.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/marketing/estrategias/${s.slug}`}
                  className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 py-5 hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition"
                >
                  <span className="text-xs font-bold text-slate-300 w-8 shrink-0">
                    {String(s.order).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition">
                      {s.navLabel}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">
                      {s.hero.subtitle}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 shrink-0">
                    Ver estratégia <ArrowRight size={14} />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
