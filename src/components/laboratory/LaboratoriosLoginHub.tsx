import Link from "next/link";
import { ArrowRight, FlaskConical, UserPlus } from "lucide-react";
import { LABORATORY_LOGIN, LABORATORY_REGISTER } from "@/lib/laboratory-portal";

export default function LaboratoriosLoginHub() {
  return (
    <section id="acesso" className="relative overflow-hidden border-b border-slate-200/80 bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/40 via-slate-950 to-slate-950" />

      <div className="relative max-w-6xl mx-auto px-4 py-10 sm:py-14">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-violet-400 text-sm font-semibold tracking-wide uppercase mb-2">
            Doctor8 Laboratórios
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Entre no portal do seu laboratório
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-xl mx-auto">
            Um endereço — <span className="text-slate-300">doctor8.org/laboratorios</span> — para
            análises clínicas, exames de imagem ou ambos.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <Link
            href={LABORATORY_LOGIN}
            className="group relative block rounded-2xl border-2 border-violet-200 hover:border-violet-300 bg-white p-5 sm:p-6 shadow-lg shadow-black/20 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
          >
            <div className="inline-flex p-2.5 rounded-xl mb-4 bg-violet-100 text-violet-700">
              <FlaskConical size={22} strokeWidth={2} aria-hidden />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
              CNPJ do laboratório
            </p>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">Laboratório parceiro</h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Cadastre endereço, publique preços de exames em CSV e prepare-se para receber
              solicitações Doctor8 — sangue, imagem ou os dois.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-violet-700 group-hover:text-violet-800 group-hover:gap-2.5 transition-all">
              Entrar no portal <ArrowRight size={16} />
            </span>
          </Link>
        </div>

        <div className="text-center mt-8">
          <Link
            href={LABORATORY_REGISTER}
            className="inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-violet-200 transition"
          >
            <UserPlus size={16} />
            Cadastrar meu laboratório grátis
          </Link>
        </div>
      </div>
    </section>
  );
}
