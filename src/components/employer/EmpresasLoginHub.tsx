import Link from "next/link";
import { ArrowRight, Brain, Building2, Stethoscope, UserPlus } from "lucide-react";

const ACCENT = {
  indigo: {
    border: "border-indigo-200 hover:border-indigo-300",
    subtitle: "text-indigo-600",
    cta: "text-indigo-700 group-hover:text-indigo-800",
    iconBox: "bg-indigo-100 text-indigo-700",
  },
  teal: {
    border: "border-teal-200 hover:border-teal-300",
    subtitle: "text-teal-600",
    cta: "text-teal-700 group-hover:text-teal-800",
    iconBox: "bg-teal-100 text-teal-700",
  },
  violet: {
    border: "border-violet-200 hover:border-violet-300",
    subtitle: "text-violet-600",
    cta: "text-violet-700 group-hover:text-violet-800",
    iconBox: "bg-violet-100 text-violet-700",
  },
} as const;

const PROFILES = [
  {
    href: "/empresas/login",
    icon: Building2,
    title: "Empresa",
    subtitle: "RH, SST e gestão",
    description: "Painel NR-1, EAP, exames/ASO, eSocial, pesquisas e documentação exportável.",
    cta: "Entrar como empresa",
    accent: "indigo" as const,
  },
  {
    href: "/empresas/medico/login",
    icon: Stethoscope,
    title: "Médico do trabalho",
    subtitle: "Coordenador PCMSO",
    description: "Integração PGR ↔ PCMSO, alertas de risco e acompanhamento.",
    cta: "Entrar como médico",
    accent: "teal" as const,
  },
  {
    href: "/empresas/psicologo/login",
    icon: Brain,
    title: "Psicólogo",
    subtitle: "Rede EAP corporativa",
    description: "Empresas credenciadas, sessões e repasse financeiro.",
    cta: "Entrar como psicólogo",
    accent: "violet" as const,
  },
] as const;

export default function EmpresasLoginHub() {
  return (
    <section id="acesso" className="relative overflow-hidden border-b border-slate-200/80 bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/40 via-slate-950 to-slate-950" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-60" />

      <div className="relative max-w-6xl mx-auto px-4 py-10 sm:py-14">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-sky-400 text-sm font-semibold tracking-wide uppercase mb-2">
            Acesso ao portal
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Entre com seu perfil
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-xl mx-auto">
            Um único endereço — <span className="text-slate-300">doctor8.org/empresas</span> — para empresa, médico do trabalho e psicólogo.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
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

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 pt-6 border-t border-white/10">
          <Link
            href="/empresas/cadastro"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 transition shadow-lg shadow-black/20"
          >
            <UserPlus size={18} />
            Cadastrar minha empresa
          </Link>
          <p className="text-xs sm:text-sm text-slate-300 text-center sm:text-left">
            Colaborador com benefício EAP? Ative pelo convite recebido por e-mail.
          </p>
        </div>
      </div>
    </section>
  );
}
