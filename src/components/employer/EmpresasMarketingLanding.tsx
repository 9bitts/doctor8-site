import Link from "next/link";
import {
  Shield,
  ClipboardList,
  BarChart3,
  FileText,
  Brain,
  Stethoscope,
  MessageSquareWarning,
  Users,
  Zap,
  FileDown,
  Webhook,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Lock,
  Scale,
  HeartPulse,
  Building2,
  LineChart,
} from "lucide-react";

const PILLARS = [
  {
    icon: Scale,
    title: "Conformidade NR-1",
    body: "Inventário de riscos psicossociais, AEP, plano de ação e exportação documental pronta para auditoria e fiscalização.",
  },
  {
    icon: HeartPulse,
    title: "Saúde mental no trabalho",
    body: "EAP com psicólogos credenciados Doctor8 — sigilo total para o colaborador, métricas agregadas para o RH.",
  },
  {
    icon: Stethoscope,
    title: "PCMSO integrado",
    body: "Portal do médico do trabalho conecta riscos psicossociais ao programa de saúde ocupacional da empresa.",
  },
];

const MODULES = [
  {
    icon: ClipboardList,
    tag: "NR-1",
    title: "Inventário de riscos psicossociais",
    body: "Mapeie fatores de risco, classifique severidade e probabilidade e mantenha o PGR atualizado conforme a Portaria MTE nº 1.419/2024.",
  },
  {
    icon: BarChart3,
    tag: "Diagnóstico",
    title: "Pesquisas organizacionais",
    body: "Instrumentos validados (COPSOQ-lite) com anonimato garantido. Importe resultados direto para o inventário de riscos.",
  },
  {
    icon: FileText,
    tag: "NR-17",
    title: "AEP — Avaliação Ergonômica Preliminar",
    body: "Fluxo completo com versões, aprovação, vínculo com pesquisas e riscos no inventário NR-1.",
  },
  {
    icon: FileText,
    tag: "PDCA",
    title: "Plano de ação",
    body: "Medidas corretivas com responsáveis, prazos e acompanhamento — o que a fiscalização espera ver na prática.",
  },
  {
    icon: Brain,
    tag: "EAP",
    title: "Atendimento psicológico corporativo",
    body: "Sessões sigilosas por teleconsulta, cotas por colaborador, rede de psicólogos credenciados e plantão de urgência (JIT) corporativo.",
  },
  {
    icon: Users,
    tag: "Gestão",
    title: "Colaboradores e elegibilidade",
    body: "Cadastro individual ou importação em lote (CSV). Convites por e-mail e controle de sessões utilizadas — sem expor conteúdo clínico.",
  },
  {
    icon: MessageSquareWarning,
    tag: "Ética",
    title: "Canal de denúncias",
    body: "Link público anônimo para assédio e condições adversas. Protocolo automático e painel para o time de SST.",
  },
  {
    icon: Stethoscope,
    tag: "PCMSO",
    title: "Médico do trabalho",
    body: "Convite ao coordenador PCMSO, alertas de risco alto e checklist de integração PGR ↔ saúde ocupacional.",
  },
  {
    icon: FileDown,
    tag: "Auditoria",
    title: "Documentação exportável",
    body: "Gere inventário PGR em PDF e JSON — AEP, pesquisas, EAP, PCMSO e denúncias em um pacote para arquivo e fiscalização.",
  },
  {
    icon: LineChart,
    tag: "Painel",
    title: "Onboarding e score de conformidade",
    body: "Roteiro guiado passo a passo e indicador de completude do programa — saiba exatamente o que falta.",
  },
  {
    icon: CreditCard,
    tag: "Comercial",
    title: "Planos e assinatura",
    body: "Starter, Growth e Enterprise com limites claros de colaboradores e pesquisas. Cobrança recorrente via Stripe.",
  },
  {
    icon: Webhook,
    tag: "Integração",
    title: "Webhooks para RH",
    body: "Notifique seu SI-RH sobre denúncias, novos colaboradores e mudanças de conformidade — assinatura HMAC segura.",
  },
];

const JOURNEY = [
  {
    step: "01",
    title: "A empresa contrata e configura",
    body: "RH cadastra colaboradores, define cotas do EAP, credencia psicólogos e inicia o inventário de riscos.",
  },
  {
    step: "02",
    title: "Diagnóstico e conformidade",
    body: "Pesquisas anônimas, AEP, plano de ação e canal de denúncias — tudo documentado na plataforma.",
  },
  {
    step: "03",
    title: "Médico do trabalho integra",
    body: "O coordenador PCMSO acompanha riscos psicossociais e valida a integração com a saúde ocupacional.",
  },
  {
    step: "04",
    title: "Colaborador é atendido",
    body: "Sessões sigilosas com psicólogo da rede. O RH vê apenas números agregados — nunca o que foi dito na consulta.",
  },
];

const TRUST = [
  "Psicólogos verificados (CRP) na plataforma Doctor8",
  "Sigilo clínico do EAP separado do painel de gestão",
  "LGPD: denúncias anônimas e dados mínimos",
  "Referência MTE: NR-1, NR-17 e Guia de Riscos Psicossociais",
  "Exportação documental para auditoria interna e externa",
];

export default function EmpresasMarketingLanding() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-50/80 to-white" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold mb-6">
              <Shield size={14} />
              Doctor8 Empresas — novo produto
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-[1.1] tracking-tight">
              NR-1, saúde mental e PCMSO —{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">
                uma plataforma, zero improviso
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 mt-6 leading-relaxed">
              A adequação às novas exigências de riscos psicossociais não precisa ser um projeto de planilhas
              e consultorias desconectadas. O Doctor8 Empresas une{" "}
              <strong className="text-slate-800">conformidade regulatória</strong>,{" "}
              <strong className="text-slate-800">cuidado real com pessoas</strong> e{" "}
              <strong className="text-slate-800">gestão integrada</strong> para RH, SST e médico do trabalho.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href="/empresas/cadastro"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700 transition shadow-lg shadow-sky-600/25"
              >
                Começar agora <ArrowRight size={18} />
              </Link>
              <a
                href="#modulos"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition"
              >
                Ver todos os módulos
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Urgency */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold">
                O que mudou — e por que sua empresa precisa agir
              </h3>
              <p className="text-slate-300 mt-4 leading-relaxed">
                A NR-1 passou a exigir que <strong className="text-white">riscos psicossociais</strong> façam
                parte do Programa de Gerenciamento de Riscos (PGR). Isso inclui identificação, avaliação,
                controle e monitoramento — com documentação que resiste a uma fiscalização do Ministério do Trabalho.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                "Inventário de riscos psicossociais no PGR",
                "AEP integrada (NR-17) quando aplicável",
                "Plano de ação com medidas e prazos",
                "Canal para denúncias de assédio",
                "Integração com PCMSO (NR-7)",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-200">
                  <CheckCircle2 size={18} className="text-sky-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <p className="text-center text-sky-600 font-semibold text-sm uppercase tracking-wide mb-2">
          Três pilares
        </p>
        <h3 className="text-center text-3xl font-bold text-slate-900 mb-12">
          Compliance, cuidado e integração — sem silos
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-sky-200 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center mb-4">
                <p.icon className="text-sky-600" size={24} />
              </div>
              <h4 className="font-bold text-slate-900 text-lg">{p.title}</h4>
              <p className="text-slate-600 text-sm mt-2 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EAP highlight */}
      <section className="bg-gradient-to-br from-violet-50 via-white to-sky-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-violet-700 font-semibold text-sm mb-4">
                <Brain size={18} /> EAP Doctor8
              </div>
              <h3 className="text-3xl font-bold text-slate-900">
                Apoio psicológico que o colaborador confia — e o RH respeita
              </h3>
              <p className="text-slate-600 mt-4 leading-relaxed">
                O Programa de Assistência ao Empregado (EAP) não é luxo: é medida complementar ao PGR e
                resposta concreta aos riscos psicossociais. No Doctor8, cada sessão é sigilosa; a empresa
                vê apenas <strong>quantas sessões foram utilizadas</strong>, nunca o conteúdo clínico.
              </p>
              <ul className="mt-6 space-y-2">
                {[
                  "Psicólogos credenciados com convite e aceite formal",
                  "Cotas anuais por colaborador com reset automático",
                  "Plantão de urgência (JIT) para crises",
                  "Repasse financeiro transparente ao profissional",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <Zap size={16} className="text-violet-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white border border-violet-100 shadow-xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                  <Lock size={18} className="text-violet-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Sigilo garantido</p>
                  <p className="text-xs text-slate-500">Separação técnica entre gestão e clínica</p>
                </div>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">O que o RH vê</span>
                  <span className="font-medium text-slate-800">Métricas agregadas</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">O que o RH não vê</span>
                  <span className="font-medium text-slate-800">Conteúdo das sessões</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Quem atende</span>
                  <span className="font-medium text-slate-800">Psicólogo CRP verificado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Médico do trabalho */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 rounded-2xl bg-teal-50 border border-teal-100 p-6 sm:p-8">
            <Stethoscope className="text-teal-600 mb-4" size={32} />
            <h4 className="font-bold text-slate-900 text-xl">Portal do médico do trabalho</h4>
            <p className="text-slate-600 text-sm mt-3 leading-relaxed">
              O coordenador do PCMSO recebe convite da empresa e acessa painel dedicado: riscos
              psicossociais mapeados, alertas de severidade alta, checklist PGR ↔ PCMSO e contexto
              para decisões de saúde ocupacional — <strong>sem acesso ao EAP clínico</strong>.
            </p>
            <Link
              href="/empresas/medico/login"
              className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold text-teal-700 hover:underline"
            >
              Acesso médico do trabalho <ArrowRight size={14} />
            </Link>
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-teal-600 font-semibold text-sm uppercase tracking-wide mb-2">
              PCMSO + NR-1
            </p>
            <h3 className="text-3xl font-bold text-slate-900">
              O médico do trabalho não fica de fora
            </h3>
            <p className="text-slate-600 mt-4 leading-relaxed">
              Muitas soluções de “saúde mental corporativa” ignoram o PCMSO. Nós integramos: o inventário
              de riscos alimenta a visão do médico coordenador, que valida a integração com o programa
              de saúde ocupacional — exatamente como a legislação espera.
            </p>
          </div>
        </div>
      </section>

      {/* Modules grid */}
      <section id="modulos" className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
          <p className="text-center text-sky-600 font-semibold text-sm uppercase tracking-wide mb-2">
            Plataforma completa
          </p>
          <h3 className="text-center text-3xl font-bold text-slate-900 mb-4">
            Tudo que construímos — pronto para operar
          </h3>
          <p className="text-center text-slate-500 max-w-2xl mx-auto mb-12">
            Do diagnóstico à documentação, do EAP à cobrança B2B. Um ecossistema para empresas que levam
            saúde mental e conformidade a sério.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map((m) => (
              <div
                key={m.title}
                className="rounded-xl bg-white border border-slate-200 p-5 hover:shadow-md hover:border-sky-200 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <m.icon size={20} className="text-sky-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                    {m.tag}
                  </span>
                </div>
                <h4 className="font-semibold text-slate-900 text-sm">{m.title}</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <h3 className="text-center text-3xl font-bold text-slate-900 mb-12">
          Como funciona na prática
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {JOURNEY.map((j) => (
            <div key={j.step} className="relative">
              <span className="text-5xl font-black text-sky-100">{j.step}</span>
              <h4 className="font-bold text-slate-900 mt-2">{j.title}</h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{j.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <h3 className="text-2xl font-bold text-center mb-8">Por que confiar no Doctor8 Empresas</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TRUST.map((t) => (
              <div key={t} className="flex items-start gap-3 text-sm text-slate-300">
                <CheckCircle2 size={18} className="text-sky-400 shrink-0 mt-0.5" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center">
        <Building2 className="mx-auto text-sky-600 mb-4" size={40} />
        <h3 className="text-3xl sm:text-4xl font-bold text-slate-900">
          Pronto para colocar sua empresa em conformidade?
        </h3>
        <p className="text-slate-600 mt-4 max-w-xl mx-auto">
          Cadastre-se em minutos. Configure o EAP, convide o médico do trabalho e comece o inventário
          de riscos hoje — com documentação exportável quando precisar.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link
            href="/empresas/cadastro"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700 transition shadow-lg"
          >
            Criar conta empresarial <ArrowRight size={18} />
          </Link>
          <a
            href="#acesso"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition"
          >
            Já tenho conta — entrar
          </a>
        </div>
      </section>

      {/* Footer note */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-slate-500 space-y-2">
          <p>
            Clínica com CNPJ e agenda médica?{" "}
            <Link href="/register/organization" className="text-sky-600 hover:underline">
              Doctor8 Organização
            </Link>
            {" · "}
            Psicólogos autônomos:{" "}
            <Link href="/psicologos" className="text-sky-600 hover:underline">
              Portal Psicologia
            </Link>
          </p>
          <p className="text-xs text-slate-400">
            Referências: Portaria MTE nº 1.419/2024 · NR-1 · NR-7 (PCMSO) · NR-17 (AEP)
          </p>
        </div>
      </footer>
    </div>
  );
}
