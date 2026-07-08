import Link from "next/link";
import { Shield, ClipboardList, Brain, BarChart3, FileText, ArrowRight, CheckCircle2 } from "lucide-react";
import EmpresasAccessLinks from "@/components/employer/EmpresasAccessLinks";

export const metadata = {
  title: "Doctor8 Empresas — Conformidade NR-1 e saúde mental corporativa",
  description:
    "Gestão de riscos psicossociais (NR-1), AEP, plano de ação, pesquisas anônimas e atendimento psicológico (EAP) para empresas brasileiras.",
};

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Inventário NR-1 / PGR",
    body: "Mapeie riscos psicossociais, classifique severidade e probabilidade e gere documentação auditável para fiscalização do MTE.",
  },
  {
    icon: BarChart3,
    title: "Pesquisas organizacionais",
    body: "Aplique instrumentos validados (COPSOQ-lite) com anonimato garantido — foco em condições de trabalho, não diagnóstico individual.",
  },
  {
    icon: FileText,
    title: "Plano de ação PDCA",
    body: "Cronograma, responsáveis, evidências e monitoramento contínuo conforme Portaria MTE nº 1.419/2024.",
  },
  {
    icon: Brain,
    title: "EAP — Psicólogos Doctor8",
    body: "Atendimento psicológico sigiloso para colaboradores, com relatórios agregados para RH (sem conteúdo clínico).",
  },
];

const CHECKLIST = [
  "Riscos psicossociais no GRO/PGR",
  "AEP integrada à NR-17",
  "Canal de denúncia (assédio)",
  "Integração PCMSO (NR-7)",
  "Exportação documental para auditoria",
];

export default function EmpresasLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 bg-gradient-to-r from-sky-50 to-slate-50">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="flex items-center gap-2 text-sky-700 mb-4">
            <Shield size={24} />
            <span className="font-semibold">Doctor8 Empresas</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 leading-tight max-w-2xl">
            Adequação à NR-1 e saúde mental no trabalho — em uma plataforma
          </h1>
          <p className="text-lg text-slate-600 mt-4 max-w-2xl leading-relaxed">
            A partir de 26/05/2026, empresas CLT devem incluir riscos psicossociais no Programa de
            Gerenciamento de Riscos (PGR). O Doctor8 Empresas entrega o fluxo completo: diagnóstico
            organizacional, plano de ação, documentação e EAP com psicólogos credenciados.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              href="/empresas/cadastro"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700 transition"
            >
              Começar gratuitamente <ArrowRight size={18} />
            </Link>
            <Link
              href="/empresas/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition"
            >
              Entrar no portal
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16 space-y-16">
        <section className="grid sm:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 p-6">
              <f.icon className="text-sky-600 mb-3" size={24} />
              <h2 className="font-semibold text-slate-900">{f.title}</h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-slate-900 text-white p-8">
          <h2 className="text-xl font-bold mb-4">O que a fiscalização verifica</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-200">
                <CheckCircle2 size={16} className="text-sky-400 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400 mt-6">
            Referência: Portaria MTE nº 1.419/2024 · Guia NR-01 Riscos Psicossociais (MTE, 2025)
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 text-center">Acesso por perfil</h2>
          <p className="text-sm text-slate-500 text-center max-w-lg mx-auto">
            Compartilhe <strong className="text-slate-700">doctor8.org/empresas</strong> — cada perfil entra pelo seu login.
          </p>
          <EmpresasAccessLinks />
        </section>

        <section className="text-center pb-8">
          <p className="text-slate-500 text-sm">
            Clínica CNPJ (agenda, TISS)? Use{" "}
            <Link href="/register/organization" className="text-sky-600 underline">
              Doctor8 Organização
            </Link>
            . Psicólogos individuais:{" "}
            <Link href="/psicologos" className="text-sky-600 underline">
              Portal Psicologia
            </Link>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
