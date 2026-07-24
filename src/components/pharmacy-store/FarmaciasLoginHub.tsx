import Link from "next/link";
import { ArrowRight, Building2, Pill, UserPlus } from "lucide-react";

const ACCENT = {
  emerald: {
    border: "border-emerald-200 hover:border-emerald-300",
    subtitle: "text-emerald-600",
    cta: "text-emerald-700 group-hover:text-emerald-800",
    iconBox: "bg-emerald-100 text-emerald-700",
  },
  teal: {
    border: "border-teal-200 hover:border-teal-300",
    subtitle: "text-teal-600",
    cta: "text-teal-700 group-hover:text-teal-800",
    iconBox: "bg-teal-100 text-teal-700",
  },
} as const;

const PROFILES = [
  {
    href: "/farmacias/login",
    icon: Building2,
    title: "Farmácia",
    subtitle: "CNPJ da drogaria",
    description: "Cadastre endereço, preços e estoque. Grátis — sem mensalidade e sem taxa por venda nesta fase.",
    cta: "Entrar como farmácia",
    accent: "emerald" as const,
  },
  {
    href: "/farmacias/farmaceutico/login",
    icon: Pill,
    title: "Farmacêutico",
    subtitle: "Profissional CRF",
    description: "Valide receitas, acompanhe pedidos e acesse o portal clínico Doctor8.",
    cta: "Entrar como farmacêutico",
    accent: "teal" as const,
  },
] as const;

export default function FarmaciasLoginHub() {
  return (
    <section id="acesso" className="relative overflow-hidden border-b border-slate-200/80 bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/40 via-slate-950 to-slate-950" />

      <div className="relative max-w-6xl mx-auto px-4 py-10 sm:py-14">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-emerald-400 text-sm font-semibold tracking-wide uppercase mb-2">
            Doctor8 Farmácias · Pilar 3
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Entre com seu perfil
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-xl mx-auto">
            Um endereço — <span className="text-slate-300">doctor8.org/farmacias</span> — para drogaria e farmacêutico.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-5 max-w-3xl mx-auto">
          {PROFILES.map((profile) => {
            const styles = ACCENT[profile.accent];
            const Icon = profile.icon;

            return (
              <Link
                key={profile.href}
                href={profile.href}
                className={`group relative rounded-2xl border-2 ${styles.border} bg-white p-5 sm:p-6 shadow-lg shadow-black/20 hover:shadow-xl hover:scale-[1.02] transition-all duration-200`}
              >
                <div className={`inline-flex p-2.5 rounded-xl mb-4 ${styles.iconBox}`}>
                  <Icon size={22} strokeWidth={2} aria-hidden />
                </div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${styles.subtitle}`}>
                  {profile.subtitle}
                </p>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">{profile.title}</h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{profile.description}</p>
                <span className={`inline-flex items-center gap-1.5 mt-4 text-sm font-semibold ${styles.cta} group-hover:gap-2.5 transition-all`}>
                  {profile.cta} <ArrowRight size={16} />
                </span>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/farmacias/cadastro"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200 transition"
          >
            <UserPlus size={16} />
            Cadastrar minha farmácia grátis
          </Link>
        </div>
      </div>
    </section>
  );
}
