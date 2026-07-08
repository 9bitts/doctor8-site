import Link from "next/link";
import { ArrowRight, Brain, Building2, Stethoscope, UserPlus } from "lucide-react";

const PROFILES = [
  {
    href: "/empresas/login",
    icon: Building2,
    title: "Empresa",
    subtitle: "RH, SST e gestão",
    description: "Painel NR-1, EAP, pesquisas, denúncias e documentação.",
    cta: "Entrar como empresa",
    accent: "from-indigo-600 to-indigo-700",
    border: "border-indigo-200 hover:border-indigo-300",
    subtitleColor: "text-indigo-600",
    ctaColor: "text-indigo-700 group-hover:text-indigo-800",
  },
  {
    href: "/empresas/medico/login",
    icon: Stethoscope,
    title: "Médico do trabalho",
    subtitle: "Coordenador PCMSO",
    description: "Integração PGR ↔ PCMSO, alertas de risco e acompanhamento.",
    cta: "Entrar como médico",
    accent: "from-teal-600 to-teal-700",
    border: "border-teal-200 hover:border-teal-300",
    subtitleColor: "text-teal-600",
    ctaColor: "text-teal-700 group-hover:text-teal-800",
  },
  {
    href: "/empresas/psicologo/login",
    icon: Brain,
    title: "Psicólogo",
    subtitle: "Rede EAP corporativa",
    description: "Empresas credenciadas, sessões e repasse financeiro.",
    cta: "Entrar como psicólogo",
    accent: "from-violet-600 to-violet-700",
    border: "border-violet-200 hover:border-violet-300",
    subtitleColor: "text-violet-600",
    ctaColor: "text-violet-700 group-hover:text-violet-800",
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
          {PROFILES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className={`group relative rounded-2xl border-2 ${p.border} bg-white p-5 sm:p-6 shadow-lg shadow-black/20 hover:shadow-xl hover:scale-[1.02] transition-all duration-200`}
            >
              <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${p.accent} text-white shadow-md mb-4`}>
                <p.icon size={22} />
              </div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${p.subtitleColor}`}>{p.subtitle}</p>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">{p.title}</h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{p.description}</p>
              <span className={`inline-flex items-center gap-1.5 mt-4 text-sm font-semibold ${p.ctaColor} group-hover:gap-2.5 transition-all`}>
                {p.cta} <ArrowRight size={16} />
              </span>
            </Link>
          ))}
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
