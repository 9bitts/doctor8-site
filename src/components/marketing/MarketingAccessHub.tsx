import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
    spotlight: "bg-sky-50 border-sky-100",
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
    spotlight: "bg-accent-50 border-accent-100",
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
    spotlight: "bg-brand-50 border-brand-100",
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
    spotlight: "bg-emerald-50 border-emerald-100",
  },
} as const;

export default function MarketingAccessHub({ content }: { content: AudienceLandingContent }) {
  const styles = ACCENT_STYLES[content.accent];

  return (
    <section id="acesso" className="relative overflow-hidden border-b border-slate-200/80 bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/30 via-slate-950 to-slate-950" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-60" />

      <div className="relative max-w-6xl mx-auto px-4 py-10 sm:py-14">
        <div className="text-center mb-8 sm:mb-10">
          <p className={`text-sm font-semibold tracking-wide uppercase mb-2 ${styles.stat}`}>
            Acesso ao portal
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Como você quer acessar o Doctor8?
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-xl mx-auto">
            Selecione seu perfil para entrar ou criar conta.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
          {content.accessLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-2xl border-2 border-white/10 bg-white p-5 sm:p-6 shadow-lg shadow-black/20 hover:shadow-xl hover:scale-[1.02] hover:border-brand-200 transition-all duration-200"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {link.description}
              </p>
              <h2 className="text-lg font-bold text-slate-900 mt-1">{link.label}</h2>
              <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-brand-700 group-hover:gap-2.5 transition-all">
                Acessar <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
