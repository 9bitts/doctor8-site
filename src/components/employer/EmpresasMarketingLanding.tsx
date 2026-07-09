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
  BookOpen,
  Plug,
  FileSignature,
  Activity,
  TrendingUp,
  Hospital,
  FileCode,
  Sparkles,
  Target,
} from "lucide-react";

const PSICOLOGOS_URL = "https://app.doctor8.org/psicologos";

const PILLARS = [
  {
    icon: Scale,
    title: "Conformidade NR-1",
    body: "PGR, AEP, GRO, plano de ação, denúncias e documentação com assinatura técnica — pronto para auditoria MTE.",
  },
  {
    icon: HeartPulse,
    title: "Saúde mental que gera ROI",
    body: "EAP sigiloso, trilhas de bem-estar, pulse check-in e analytics de adoção — cuidado mensurável, não só discurso.",
  },
  {
    icon: Stethoscope,
    title: "SST ocupacional integrado",
    body: "PCMSO, exames/ASO, rede de clínicas e eSocial — o que outras empresas fazem separadamente, no mesmo ecossistema do EAP.",
  },
  {
    icon: Plug,
    title: "Pronto para escalar",
    body: "Integrações ICP-Brasil, parceiro eSocial, Stripe metered e webhooks RH — contrate o terceiro, ligue a chave.",
  },
];

const MODULES = [
  {
    icon: ClipboardList,
    tag: "NR-1",
    title: "Inventário de riscos psicossociais",
    body: "Matriz de risco, fatores MTE, classificação S×P e exportação PGR em PDF/JSON para o dossiê de conformidade.",
  },
  {
    icon: Target,
    tag: "GRO",
    title: "Critérios GRO documentados",
    body: "Critérios de Grau de Risco Ocupacional alinhados à NR-1 — exportáveis e assináveis para auditoria.",
  },
  {
    icon: BarChart3,
    tag: "HSE-IT",
    title: "Pesquisas COPSOQ / HSE-IT",
    body: "Diagnóstico anônimo com importação automática de achados para o inventário — paridade com players enterprise.",
  },
  {
    icon: FileText,
    tag: "NR-17",
    title: "AEP ergonômica completa",
    body: "Versões, aprovação, vínculo com pesquisas e riscos psicossociais no PGR.",
  },
  {
    icon: ClipboardList,
    tag: "PDCA",
    title: "Plano de ação rastreável",
    body: "Medidas, responsáveis, prazos e status — o que o fiscal espera ver além da planilha.",
  },
  {
    icon: Brain,
    tag: "EAP",
    title: "Atendimento psicológico corporativo",
    body: "Teleconsulta sigilosa, cotas por colaborador, rede credenciada, JIT de urgência e repasse transparente.",
  },
  {
    icon: BookOpen,
    tag: "Bem-estar",
    title: "Trilhas psicoeducativas",
    body: "Conteúdo por dimensão de risco (sobrecarga, assédio, autonomia) com player de áudio e progresso do colaborador.",
  },
  {
    icon: Activity,
    tag: "Pulse",
    title: "Check-in de bem-estar",
    body: "Pulse anônimo no portal do colaborador — sinais precoces sem violar sigilo clínico.",
  },
  {
    icon: TrendingUp,
    tag: "Analytics",
    title: "Inteligência RH / SST",
    body: "Painel 30 dias: adoção EAP, pesquisas, trilhas, conformidade e alertas de exames vencidos.",
  },
  {
    icon: LineChart,
    tag: "Benchmark",
    title: "Comparativo setorial",
    body: "Sua empresa vs. média do setor em conformidade NR-1, EAP e plano de ação — argumento para board e diretoria.",
  },
  {
    icon: Hospital,
    tag: "PCMSO",
    title: "Exames ocupacionais / ASO",
    body: "Agenda admissional, periódico e demissional; rede de clínicas parceiras; laudo PDF e ASO exportável.",
  },
  {
    icon: FileCode,
    tag: "eSocial",
    title: "eSocial S-2220 e S-2240",
    body: "XML validável, fila de transmissão e integração com parceiro DP — feche o ciclo SST digital.",
  },
  {
    icon: FileSignature,
    tag: "ICP",
    title: "Assinatura PGR / PCMSO / ASO",
    body: "Assinatura digital ICP-Brasil (Lacuna) ou registro técnico — validade jurídica no dossiê.",
  },
  {
    icon: Stethoscope,
    tag: "NR-7",
    title: "Portal médico do trabalho",
    body: "Convite ao coordenador PCMSO, checklist PGR ↔ PCMSO, riscos altos e conclusão de ASO.",
  },
  {
    icon: MessageSquareWarning,
    tag: "Ética",
    title: "Canal de denúncias",
    body: "Link público anônimo, protocolo automático e triagem no painel SST.",
  },
  {
    icon: Users,
    tag: "Gestão",
    title: "Colaboradores + dados SST",
    body: "CSV em lote, CPF/matrícula eSocial, convites EAP e controle de cotas — sem expor prontuário.",
  },
  {
    icon: FileDown,
    tag: "Auditoria",
    title: "Documentação exportável",
    body: "PGR, GRO, PCMSO e histórico de assinaturas — pacote único para fiscalização interna e externa.",
  },
  {
    icon: CreditCard,
    tag: "B2B",
    title: "Planos e cobrança EAP",
    body: "Starter / Growth / Enterprise, snapshots mensais de uso e cobrança metered por sessão (Stripe).",
  },
  {
    icon: Webhook,
    tag: "API",
    title: "Webhooks RH + log de entregas",
    body: "SI-RH recebe eventos de denúncia, colaborador e conformidade — HMAC e histórico de entregas.",
  },
  {
    icon: Plug,
    tag: "Hub",
    title: "Central de integrações",
    body: "Status Lacuna, eSocial, Stripe metered e clínicas — modo demo para apresentação, live após contrato.",
  },
];

const VS_MARKET = [
  {
    name: "Outras empresas",
    focus: "EAP + bem-estar",
    doctor8: "EAP + NR-1 completo + PCMSO + eSocial",
  },
  {
    name: "Outras empresas",
    focus: "SST ocupacional",
    doctor8: "SST + saúde mental + EAP na mesma plataforma",
  },
  {
    name: "Planilhas + consultoria",
    focus: "Projeto pontual",
    doctor8: "Software contínuo, métricas e documentação viva",
  },
];

const JOURNEY = [
  {
    step: "01",
    title: "Contrata e configura",
    body: "Cadastro CNPJ, equipe SST/RH, colaboradores (CSV), cotas EAP e convite ao médico PCMSO.",
  },
  {
    step: "02",
    title: "Diagnostica riscos",
    body: "Pesquisa HSE-IT, inventário NR-1, AEP e benchmark setorial — dados para o board.",
  },
  {
    step: "03",
    title: "Executa e documenta",
    body: "Plano de ação, denúncias, exames/ASO, assinatura PGR e fila eSocial.",
  },
  {
    step: "04",
    title: "Cuida das pessoas",
    body: "EAP sigiloso, trilhas de bem-estar e pulse — adoção visível, conteúdo clínico protegido.",
  },
  {
    step: "05",
    title: "Fatura e integra",
    body: "Snapshot EAP, metered billing, webhooks ao SI-RH e integrações live quando contratadas.",
  },
];

const TRUST = [
  "Psicólogos CRP verificados no ecossistema Doctor8",
  "Separação técnica: gestão corporativa ≠ prontuário clínico",
  "LGPD: denúncias anônimas, dados mínimos, exportação auditável",
  "Referência MTE: NR-1, NR-7, NR-17 e Guia de Riscos Psicossociais",
  "Paridade funcional com outras empresas em SST + diferencial EAP integrado",
  "Hub de integrações pronto para Lacuna, eSocial e Stripe",
];

export default function EmpresasMarketingLanding() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-sky-50">
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold mb-6">
              <Shield size={14} />
              Doctor8 Empresas — SST + saúde mental integrados
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-[1.1] tracking-tight">
              A plataforma que une{" "}
              <span className="text-sky-600">NR-1, EAP, PCMSO e eSocial</span>{" "}
              — sem três fornecedores diferentes
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 mt-6 leading-relaxed">
              Enquanto outras empresas cuidam só do EAP ou só do ASO, o Doctor8 Empresas entrega{" "}
              <strong className="text-slate-800">conformidade regulatória</strong>,{" "}
              <strong className="text-slate-800">atendimento psicológico sigiloso</strong> e{" "}
              <strong className="text-slate-800">medicina do trabalho digital</strong> em um único contrato —
              com documentação exportável e integrações prontas para produção.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href="/empresas/cadastro"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700 transition shadow-lg shadow-sky-600/25"
              >
                Agendar demonstração grátis <ArrowRight size={18} />
              </Link>
              <a
                href="#modulos"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition"
              >
                Ver 20+ módulos
              </a>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Piloto sem cartão · Onboarding guiado · Export PGR no primeiro dia
            </p>
          </div>
        </div>
      </section>

      {/* Banner psicólogos */}
      <section className="bg-violet-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-violet-200 text-xs font-semibold uppercase tracking-wide mb-3">
                <Sparkles size={14} />
                Ecossistema Doctor8
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold leading-tight">
                Seu EAP merece psicólogos de verdade — não uma lista genérica
              </h3>
              <p className="text-violet-100 mt-3 leading-relaxed text-sm sm:text-base">
                O Doctor8 Empresas conecta sua empresa à mesma rede de psicólogos que usa teleconsulta CFP,
                escalas clínicas, plantão JIT e prontuário seguro. Para o RH: credenciamento formal.
                Para o colaborador: atendimento de qualidade. Para você: um argumento de venda que fecha contrato.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <a
                href={PSICOLOGOS_URL}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-violet-700 font-semibold hover:bg-violet-50 transition shadow-lg"
              >
                Conheça a rede de psicólogos <ArrowRight size={18} />
              </a>
              <Link
                href="/empresas/cadastro"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/40 text-white font-medium hover:bg-white/10 transition"
              >
                Credenciar na minha empresa
              </Link>
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
                NR-1 não é só “saúde mental” — é obrigação documentada
              </h3>
              <p className="text-slate-300 mt-4 leading-relaxed">
                A Portaria MTE nº 1.419/2024 exige riscos psicossociais no PGR, integração com PCMSO quando
                aplicável, e evidências que resistem à fiscalização. Empresas que tratam isso só com
                pesquisa de clima <strong className="text-white">pagam duas vezes</strong>: na consultoria e na multa.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                "Inventário + critérios GRO exportáveis",
                "Pesquisas HSE-IT com anonimato",
                "AEP (NR-17) e plano de ação PDCA",
                "Exames / ASO e eSocial S-2220",
                "Canal de denúncias e assinatura ICP",
                "EAP como medida complementar ao PGR",
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
          Proposta de valor
        </p>
        <h3 className="text-center text-3xl font-bold text-slate-900 mb-4">
          Um contrato. Quatro pilares. Zero silo entre RH, SST e medicina do trabalho.
        </h3>
        <p className="text-center text-slate-500 max-w-2xl mx-auto mb-12">
          Vendemos para quem precisa mostrar resultado: diretoria, jurídico, auditoria e colaboradores.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-sky-200 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-sky-100 flex items-center justify-center mb-4">
                <p.icon className="text-sky-600" size={22} />
              </div>
              <h4 className="font-bold text-slate-900">{p.title}</h4>
              <p className="text-slate-600 text-sm mt-2 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EAP + bem-estar */}
      <section className="bg-violet-50 border-y border-violet-100">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-violet-700 font-semibold text-sm mb-4">
                <Brain size={18} /> EAP + bem-estar mensurável
              </div>
              <h3 className="text-3xl font-bold text-slate-900">
                Outras empresas vendem bem-estar. Nós vendemos bem-estar{" "}
                <span className="text-violet-600">com compliance embutido</span>.
              </h3>
              <p className="text-slate-600 mt-4 leading-relaxed">
                Sessões sigilosas, trilhas psicoeducativas (texto e áudio), pulse de check-in e analytics
                de adoção — tudo vinculado ao inventário de riscos. O RH prova que a medida do PGR está
                em execução; o colaborador recebe cuidado real.
              </p>
              <ul className="mt-6 space-y-2">
                {[
                  "Rede credenciada com convite formal e repasse",
                  "Cotas anuais + cobrança metered por sessão excedente",
                  "Snapshots mensais para fechamento financeiro",
                  "Benchmark: sua adoção EAP vs. setor",
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
                  <p className="font-semibold text-slate-900">Sigilo que fecha contrato jurídico</p>
                  <p className="text-xs text-slate-500">Gestão ≠ prontuário — separação técnica</p>
                </div>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">RH / SST vê</span>
                  <span className="font-medium text-slate-800">Métricas agregadas</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Nunca vê</span>
                  <span className="font-medium text-slate-800">Conteúdo das sessões</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Colaborador acessa</span>
                  <span className="font-medium text-slate-800">EAP + trilhas + pulse</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Financeiro</span>
                  <span className="font-medium text-slate-800">Snapshot + Stripe metered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SST ocupacional */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="rounded-2xl bg-teal-50 border border-teal-100 p-6 sm:p-8">
            <Hospital className="text-teal-600 mb-4" size={32} />
            <h4 className="font-bold text-slate-900 text-xl">Exames, ASO e eSocial — paridade com outras empresas</h4>
            <p className="text-slate-600 text-sm mt-3 leading-relaxed">
              Agenda admissional, periódico e demissional. Rede de clínicas parceiras, upload de laudo,
              ASO em PDF, assinatura ICP e fila eSocial S-2220/S-2240 com XML exportável.
              O médico do trabalho conclui ASO no portal dedicado.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {["CPF e matrícula eSocial no cadastro", "Alertas de exames vencidos no painel", "Integração parceiro eSocial (plug-and-play)"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-teal-600 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-teal-600 font-semibold text-sm uppercase tracking-wide mb-2">
              SST digital
            </p>
            <h3 className="text-3xl font-bold text-slate-900">
              Pare de pagar um sistema para EAP e outro para medicina do trabalho
            </h3>
            <p className="text-slate-600 mt-4 leading-relaxed">
              O Doctor8 Empresas é a resposta para o comprador que quer{" "}
              <strong>uma fatura e um login</strong> para RH, SST, médico do trabalho e colaborador —
              com documentação que conversa entre si.
            </p>
            <Link
              href="/empresas/medico/login"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-teal-700 hover:underline"
            >
              Portal médico do trabalho <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* vs mercado */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-2">
            Por que não só outras empresas ou planilha?
          </h3>
          <p className="text-center text-slate-500 text-sm mb-10 max-w-xl mx-auto">
            Posicionamento claro para sua equipe comercial e para o comprador enterprise.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {VS_MARKET.map((row) => (
              <div key={row.focus} className="rounded-xl bg-white border border-slate-200 p-5">
                <p className="font-bold text-slate-900">{row.name}</p>
                <p className="text-xs text-slate-500 mt-1">Foco: {row.focus}</p>
                <p className="text-sm text-sky-700 font-medium mt-3 flex items-start gap-2">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-sky-500" />
                  Doctor8: {row.doctor8}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules grid */}
      <section id="modulos" className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <p className="text-center text-sky-600 font-semibold text-sm uppercase tracking-wide mb-2">
          Plataforma completa
        </p>
        <h3 className="text-center text-3xl font-bold text-slate-900 mb-4">
          20+ módulos — do diagnóstico ao eSocial
        </h3>
        <p className="text-center text-slate-500 max-w-2xl mx-auto mb-12">
          Tudo que implementamos está operacional: modo demonstração para pitch, integrações live após contratar parceiros.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MODULES.map((m) => (
            <div
              key={m.title}
              className="rounded-xl bg-white border border-slate-200 p-4 hover:shadow-md hover:border-sky-200 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <m.icon size={18} className="text-sky-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                  {m.tag}
                </span>
              </div>
              <h4 className="font-semibold text-slate-900 text-sm leading-snug">{m.title}</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Journey */}
      <section className="bg-sky-50 border-y border-sky-100">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
          <h3 className="text-center text-3xl font-bold text-slate-900 mb-12">
            Jornada de implementação — 30 a 90 dias
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {JOURNEY.map((j) => (
              <div key={j.step} className="relative">
                <span className="text-4xl font-black text-sky-200">{j.step}</span>
                <h4 className="font-bold text-slate-900 mt-2 text-sm">{j.title}</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{j.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrações CTA strip */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <Plug className="text-violet-600" size={22} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Hub de integrações pronto para contratação</h4>
              <p className="text-sm text-slate-600 mt-1">
                Lacuna (ICP), parceiro eSocial, Stripe metered e clínicas — demonstre hoje, ative amanhã.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100">ICP-Brasil</span>
            <span className="text-xs bg-sky-50 text-sky-700 px-2 py-1 rounded-lg border border-sky-100">eSocial</span>
            <span className="text-xs bg-violet-50 text-violet-700 px-2 py-1 rounded-lg border border-violet-100">Stripe</span>
            <span className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-lg border border-teal-100">Clínicas</span>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <h3 className="text-2xl font-bold text-center mb-8">Por que o comprador enterprise escolhe Doctor8</h3>
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
          Leve sua proposta comercial com produto na mão
        </h3>
        <p className="text-slate-600 mt-4 max-w-xl mx-auto">
          Cadastre a empresa, rode o onboarding guiado e mostre PGR, EAP, exames e eSocial na mesma demo —
          antes do concorrente voltar com a planilha.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link
            href="/empresas/cadastro"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700 transition shadow-lg"
          >
            Criar conta empresarial <ArrowRight size={18} />
          </Link>
          <a
            href={PSICOLOGOS_URL}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-violet-200 bg-violet-50 text-violet-800 font-medium hover:bg-violet-100 transition"
          >
            Ver rede de psicólogos
          </a>
          <a
            href="#acesso"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition"
          >
            Já tenho conta
          </a>
        </div>
      </section>

    </div>
  );
}
