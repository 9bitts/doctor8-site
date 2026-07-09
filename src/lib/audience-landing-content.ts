import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  Building2,
  Calendar,
  ClipboardList,
  Globe,
  HeartPulse,
  Leaf,
  Plug,
  Shield,
  Sparkles,
  Stethoscope,
  Store,
  Users,
  Video,
  Zap,
} from "lucide-react";

export type AudienceId = "empresas" | "pacientes" | "especialistas" | "parceiros";

export type AudienceStat = { value: string; label: string };
export type AudiencePillar = { icon: LucideIcon; title: string; body: string };
export type AudienceModule = { icon: LucideIcon; tag: string; title: string; body: string };
export type AudienceStep = { step: string; title: string; body: string };
export type AudienceCompare = { them: string; focus: string; doctor8: string };

export type AudienceLandingContent = {
  id: AudienceId;
  meta: { title: string; description: string };
  accent: "sky" | "accent" | "brand" | "emerald";
  hero: {
    badge: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    primaryCta: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
    note?: string;
  };
  stats: AudienceStat[];
  pillarsEyebrow: string;
  pillarsTitle: string;
  pillarsSubtitle: string;
  pillars: AudiencePillar[];
  spotlight: {
    eyebrow: string;
    title: string;
    body: string;
    bullets: string[];
    cta?: { label: string; href: string };
  };
  modulesEyebrow: string;
  modulesTitle: string;
  modulesSubtitle: string;
  modules: AudienceModule[];
  journeyTitle: string;
  journey: AudienceStep[];
  compareTitle: string;
  compareSubtitle: string;
  compare: AudienceCompare[];
  trust: string[];
  finalCta: {
    title: string;
    subtitle: string;
    primary: { label: string; href: string };
    secondary?: { label: string; href: string };
  };
  accessLinks: { label: string; href: string; description: string }[];
};

const EMPRESAS: AudienceLandingContent = {
  id: "empresas",
  meta: {
    title: "Doctor8 Empresas — NR-1, EAP, PCMSO e eSocial integrados",
    description:
      "Plataforma B2B que une conformidade NR-1, EAP com psicólogos CRP, medicina do trabalho, exames/ASO e eSocial em um único contrato.",
  },
  accent: "sky",
  hero: {
    badge: "Doctor8 Empresas — SST + saúde mental integrados",
    title: "A plataforma que une",
    titleHighlight: "NR-1, EAP, PCMSO e eSocial",
    subtitle:
      "Enquanto outras soluções cuidam só do bem-estar ou só do ASO, o Doctor8 entrega conformidade regulatória, atendimento psicológico sigiloso e medicina do trabalho digital — com documentação exportável e integrações prontas.",
    primaryCta: { label: "Agendar demonstração grátis", href: "/empresas/cadastro" },
    secondaryCta: { label: "Ver módulos", href: "#modulos" },
    note: "Piloto sem cartão · Onboarding guiado · Export PGR no primeiro dia",
  },
  stats: [
    { value: "20+", label: "módulos SST e EAP no mesmo painel" },
    { value: "NR-1", label: "inventário, GRO, AEP e plano de ação PDCA" },
    { value: "24/7", label: "rede de psicólogos CRP para EAP corporativo" },
    { value: "3,67x", label: "ROI médio em saúde mental corporativa*" },
  ],
  pillarsEyebrow: "Proposta de valor",
  pillarsTitle: "Um contrato. Quatro pilares. Zero silo entre RH, SST e medicina do trabalho.",
  pillarsSubtitle: "Vendemos para quem precisa mostrar resultado: diretoria, jurídico, auditoria e colaboradores.",
  pillars: [
    {
      icon: Shield,
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
      body: "PCMSO, exames/ASO, rede de clínicas e eSocial — o que o mercado faz separado, no mesmo ecossistema do EAP.",
    },
    {
      icon: Plug,
      title: "Pronto para escalar",
      body: "Integrações ICP-Brasil, parceiro eSocial, Stripe metered e webhooks RH — contrate o terceiro, ligue a chave.",
    },
  ],
  spotlight: {
    eyebrow: "EAP + bem-estar mensurável",
    title: "Outras empresas vendem bem-estar. Nós vendemos bem-estar com compliance embutido.",
    body:
      "Sessões sigilosas, trilhas psicoeducativas, pulse de check-in e analytics de adoção — tudo vinculado ao inventário de riscos. O RH prova que a medida do PGR está em execução; o colaborador recebe cuidado real.",
    bullets: [
      "Rede credenciada com convite formal e repasse transparente",
      "Cotas anuais + cobrança metered por sessão excedente",
      "Separação técnica: gestão corporativa ≠ prontuário clínico",
      "Benchmark: sua adoção EAP vs. média do setor",
    ],
    cta: { label: "Credenciar na minha empresa", href: "/empresas/cadastro" },
  },
  modulesEyebrow: "Plataforma completa",
  modulesTitle: "20+ módulos — do diagnóstico ao eSocial",
  modulesSubtitle: "Tudo operacional: modo demonstração para pitch, integrações live após contratar parceiros.",
  modules: [
    { icon: ClipboardList, tag: "NR-1", title: "Inventário de riscos psicossociais", body: "Matriz S×P, fatores MTE e exportação PGR em PDF/JSON." },
    { icon: BarChart3, tag: "HSE-IT", title: "Pesquisas COPSOQ / HSE-IT", body: "Diagnóstico anônimo com importação automática para o inventário." },
    { icon: Brain, tag: "EAP", title: "Atendimento psicológico corporativo", body: "Teleconsulta sigilosa, cotas por colaborador e rede credenciada." },
    { icon: Activity, tag: "Pulse", title: "Check-in de bem-estar", body: "Sinais precoces sem violar sigilo clínico." },
    { icon: BookOpen, tag: "Bem-estar", title: "Trilhas psicoeducativas", body: "Conteúdo por dimensão de risco com player de áudio." },
    { icon: Stethoscope, tag: "PCMSO", title: "Exames ocupacionais / ASO", body: "Agenda admissional, periódico e demissional com rede de clínicas." },
    { icon: Plug, tag: "eSocial", title: "eSocial S-2220 e S-2240", body: "XML validável, fila de transmissão e integração com parceiro DP." },
    { icon: Users, tag: "Gestão", title: "Colaboradores + dados SST", body: "CSV em lote, convites EAP e controle de cotas." },
  ],
  journeyTitle: "Jornada de implementação — 30 a 90 dias",
  journey: [
    { step: "01", title: "Contrata e configura", body: "Cadastro CNPJ, equipe SST/RH, colaboradores e cotas EAP." },
    { step: "02", title: "Diagnostica riscos", body: "Pesquisa HSE-IT, inventário NR-1, AEP e benchmark setorial." },
    { step: "03", title: "Executa e documenta", body: "Plano de ação, denúncias, exames/ASO e assinatura PGR." },
    { step: "04", title: "Cuida das pessoas", body: "EAP sigiloso, trilhas e pulse — adoção visível, conteúdo protegido." },
    { step: "05", title: "Fatura e integra", body: "Snapshot EAP, metered billing e webhooks ao SI-RH." },
  ],
  compareTitle: "Por que não só EAP genérico ou planilha?",
  compareSubtitle: "Posicionamento claro para sua equipe comercial e para o comprador enterprise.",
  compare: [
    { them: "Players de bem-estar", focus: "EAP + conteúdo", doctor8: "EAP + NR-1 completo + PCMSO + eSocial" },
    { them: "Sistemas de SST", focus: "ASO e exames", doctor8: "SST + saúde mental + EAP na mesma plataforma" },
    { them: "Planilhas + consultoria", focus: "Projeto pontual", doctor8: "Software contínuo, métricas e documentação viva" },
  ],
  trust: [
    "Psicólogos CRP verificados no ecossistema Doctor8",
    "Separação técnica: gestão corporativa ≠ prontuário clínico",
    "LGPD: denúncias anônimas, dados mínimos, exportação auditável",
    "Referência MTE: NR-1, NR-7, NR-17 e Guia de Riscos Psicossociais",
    "Hub de integrações pronto para Lacuna, eSocial e Stripe",
    "Conformidade NR-1 com evidências para fiscalização",
  ],
  finalCta: {
    title: "Leve sua proposta comercial com produto na mão",
    subtitle:
      "Cadastre a empresa, rode o onboarding guiado e mostre PGR, EAP, exames e eSocial na mesma demo — antes do concorrente voltar com a planilha.",
    primary: { label: "Criar conta empresarial", href: "/empresas/cadastro" },
    secondary: { label: "Já tenho conta", href: "#acesso" },
  },
  accessLinks: [
    { label: "Entrar como empresa", href: "/empresas/login", description: "RH, SST e gestão corporativa" },
    { label: "Médico do trabalho", href: "/empresas/medico/login", description: "Coordenador PCMSO" },
    { label: "Psicólogo EAP", href: "/empresas/psicologo/login", description: "Rede corporativa credenciada" },
  ],
};

const PACIENTES: AudienceLandingContent = {
  id: "pacientes",
  meta: {
    title: "Doctor8 para Pacientes — Consultas online, Club Doctor e prontuário digital",
    description:
      "Agende médicos, psicólogos e nutricionistas online. Club Doctor por R$34,90/mês. Cannabis medicinal, Doctor Energy e histórico de saúde protegido por LGPD.",
  },
  accent: "accent",
  hero: {
    badge: "Doctor8 — saúde digital para você e sua família",
    title: "O cuidado que seu corpo e mente precisam —",
    titleHighlight: "de onde você estiver",
    subtitle:
      "Consulte especialistas online em minutos, gerencie seu histórico médico digital e acesse benefícios exclusivos como Club Doctor, cannabis medicinal e economia na conta de luz com Doctor Energy.",
    primaryCta: { label: "Agendar consulta", href: "/register" },
    secondaryCta: { label: "Conhecer Club Doctor", href: "/#club" },
    note: "Cadastro gratuito · Pagamento seguro · LGPD e HIPAA",
  },
  stats: [
    { value: "80+", label: "especialidades médicas e de saúde" },
    { value: "R$ 34,90", label: "Club Doctor por mês — cancele quando quiser" },
    { value: "24/7", label: "agendamento online com confirmação imediata" },
    { value: "4", label: "países: Brasil, EUA, Europa e Venezuela" },
  ],
  pillarsEyebrow: "Por que Doctor8",
  pillarsTitle: "Mais que telemedicina — um ecossistema completo de saúde",
  pillarsSubtitle: "Do primeiro sintoma ao acompanhamento contínuo, com dados protegidos e profissionais verificados.",
  pillars: [
    {
      icon: Video,
      title: "Consultas online em minutos",
      body: "Busque por especialidade, sintoma ou convênio. Teleconsulta segura sem filas nem deslocamento.",
    },
    {
      icon: Shield,
      title: "Seus dados, suas regras",
      body: "Prontuário criptografado, alinhado a LGPD e HIPAA. Você controla quem acessa seu histórico.",
    },
    {
      icon: Sparkles,
      title: "Club Doctor",
      body: "Acesso à rede completa de especialistas com desconto em consultas — por R$34,90/mês, sem fidelidade.",
    },
    {
      icon: Leaf,
      title: "Cannabis e bem-estar",
      body: "Profissionais especializados em medicina canabinoide, nutrição e saúde mental integrada.",
    },
  ],
  spotlight: {
    eyebrow: "Benefício corporativo",
    title: "Sua empresa oferece Doctor8? Ative seu EAP em poucos cliques.",
    body:
      "Colaboradores com benefício corporativo acessam sessões de psicologia, trilhas de bem-estar e pulse check-in — com total sigilo. O RH vê apenas métricas agregadas, nunca o conteúdo das sessões.",
    bullets: [
      "Ative pelo convite recebido por e-mail da empresa",
      "Sessões sigilosas com psicólogos CRP credenciados",
      "Trilhas psicoeducativas e conteúdo de bem-estar",
      "Sem necessidade de e-mail corporativo (conforme política do RH)",
    ],
    cta: { label: "Ativar meu benefício", href: "/empresas/colaborador" },
  },
  modulesEyebrow: "Tudo na palma da mão",
  modulesTitle: "Sua área do paciente — completa e intuitiva",
  modulesSubtitle: "Ao criar sua conta gratuita, você acessa um painel com tudo que precisa para cuidar da saúde.",
  modules: [
    { icon: Calendar, tag: "Agenda", title: "Consultas e lembretes", body: "Agende, reagende e receba lembretes antes de cada teleconsulta." },
    { icon: Activity, tag: "Histórico", title: "Prontuário digital", body: "Receitas, laudos, exames e evolução clínica em um só lugar." },
    { icon: Brain, tag: "Mental", title: "Saúde emocional", body: "Psicólogos, psicanalistas e terapeutas com escalas e acompanhamento." },
    { icon: Stethoscope, tag: "Clínico", title: "Médicos especialistas", body: "Clínica geral, cardiologia, dermatologia e dezenas de outras áreas." },
    { icon: Leaf, tag: "Cannabis", title: "Medicina canabinoide", body: "Prescrição legal, acompanhamento e documentação para importação." },
    { icon: Zap, tag: "Energy", title: "Doctor Energy", body: "Até 20% de desconto na conta Cemig — exclusivo Club Doctor em MG." },
    { icon: Store, tag: "Farmácia", title: "Rede de farmácias", body: "Encontre medicamentos perto de você com preços publicados." },
    { icon: Globe, tag: "Global", title: "Atendimento internacional", body: "Profissionais no Brasil, EUA, Europa e Venezuela." },
  ],
  journeyTitle: "Comece sua jornada de bem-estar em 4 passos",
  journey: [
    { step: "01", title: "Crie sua conta", body: "Cadastro gratuito com e-mail ou Google — leva menos de 2 minutos." },
    { step: "02", title: "Escolha o especialista", body: "Busque por especialidade, veja horários e perfil do profissional." },
    { step: "03", title: "Agende e pague", body: "PIX ou cartão de crédito. Confirmação imediata." },
    { step: "04", title: "Consulte e acompanhe", body: "Entre na teleconsulta e gerencie todo seu histórico de saúde." },
  ],
  compareTitle: "Doctor8 vs. outras plataformas de telemedicina",
  compareSubtitle: "Por que pacientes escolhem o ecossistema Doctor8.",
  compare: [
    { them: "Apps de consulta avulsa", focus: "Só telemedicina", doctor8: "Telemedicina + Club + cannabis + farmácia + EAP" },
    { them: "Planos de saúde tradicionais", focus: "Caros e burocráticos", doctor8: "Club Doctor acessível + consultas avulsas" },
    { them: "Marketplaces genéricos", focus: "Lista de profissionais", doctor8: "Prontuário integrado, escalas clínicas e IA" },
  ],
  trust: [
    "Dados criptografados ponta a ponta",
    "LGPD e princípios HIPAA",
    "Profissionais com registro verificado (CRM, CRP, CRN)",
    "Pagamento seguro via Stripe",
    "Suporte dedicado em português, inglês e espanhol",
    "Programa humanitário AcuraBrasil para quem precisa",
  ],
  finalCta: {
    title: "Cuide da sua saúde de onde você estiver",
    subtitle: "Cadastre-se gratuitamente e agende sua primeira consulta hoje — ou assine o Club Doctor e economize.",
    primary: { label: "Criar conta grátis", href: "/register" },
    secondary: { label: "Buscar especialistas", href: "/" },
  },
  accessLinks: [
    { label: "Entrar na minha conta", href: "/login", description: "Área do paciente" },
    { label: "Club Doctor", href: "/register?plan=club", description: "R$34,90/mês — rede completa" },
    { label: "Benefício corporativo", href: "/empresas/colaborador", description: "EAP da sua empresa" },
  ],
};

const ESPECIALISTAS: AudienceLandingContent = {
  id: "especialistas",
  meta: {
    title: "Doctor8 para Especialistas — Consultório digital, plantão JIT e rede corporativa",
    description:
      "Plataforma completa para médicos, psicólogos, nutricionistas e terapeutas: teleconsulta, prontuário, escalas clínicas, agenda, receitas digitais e rede EAP corporativa.",
  },
  accent: "brand",
  hero: {
    badge: "Doctor8 — consultório digital de verdade",
    title: "Invista na sua carreira com a plataforma que vai",
    titleHighlight: "além da teleconsulta",
    subtitle:
      "Agenda online, prontuário seguro, escalas clínicas, receitas digitais, plantão JIT sob demanda e acesso à rede EAP de centenas de empresas — tudo em um único ecossistema, do consultório ao impacto humanitário.",
    primaryCta: { label: "Cadastrar-se grátis", href: "/register/professional/signup" },
    secondaryCta: { label: "Ver planos", href: "#planos" },
    note: "Grátis para começar · Sem fidelidade · Conformidade CRM/CFP/CRN",
  },
  stats: [
    { value: "JIT", label: "plantão sob demanda — exclusivo Doctor8" },
    { value: "300+", label: "empresas parceiras na rede EAP" },
    { value: "90%+", label: "satisfação dos profissionais cadastrados" },
    { value: "12+", label: "tipos de profissionais de saúde" },
  ],
  pillarsEyebrow: "4 pilares da sua carreira",
  pillarsTitle: "Gestão, educação, visibilidade e comunidade — na melhor plataforma da América Latina",
  pillarsSubtitle: "Não somos só um marketplace. Somos o parceiro da sua jornada profissional.",
  pillars: [
    {
      icon: Calendar,
      title: "Gestão do consultório",
      body: "Agenda online, Google Calendar, lembretes WhatsApp, prontuário e faturamento — tudo integrado.",
    },
    {
      icon: BookOpen,
      title: "Educação contínua",
      body: "Cursos, workshops, florais, medicina natural e conteúdo clínico para crescimento profissional.",
    },
    {
      icon: Sparkles,
      title: "Visibilidade e mídia",
      body: "Perfil público, diretório SEO, plantão JIT e posicionamento na rede corporativa EAP.",
    },
    {
      icon: Users,
      title: "Comunidade e impacto",
      body: "Rede de especialistas, programa humanitário AcuraBrasil e anjos voluntários.",
    },
  ],
  spotlight: {
    eyebrow: "Rede EAP corporativa",
    title: "Colaboradores de centenas de empresas podem agendar com você.",
    body:
      "O Doctor8 é benefício corporativo de empresas como Ambev, Natura, Creditas e Gupy. No Plano Premium, seu perfil aparece nas buscas e você recebe clientes corporativos com repasse transparente no 5º dia útil.",
    bullets: [
      "Credenciamento formal com convite da empresa",
      "Pagamento separado: PF e corporativo via PIX",
      "ZenOffice: consultório digital com videoconferência criptografada",
      "Separação total entre gestão corporativa e prontuário clínico",
    ],
    cta: { label: "Conhecer rede EAP", href: "/empresas/psicologo/login" },
  },
  modulesEyebrow: "Ferramentas profissionais",
  modulesTitle: "Tudo que o mercado exige — e o que só o Doctor8 tem",
  modulesSubtitle: "Paridade com PsicoManager e Sinthoma, com diferenciais únicos no ecossistema.",
  modules: [
    { icon: Video, tag: "Tele", title: "Teleconsulta segura", body: "Videoconferência no navegador com TCLE e sala privada por sessão." },
    { icon: ClipboardList, tag: "Prontuário", title: "Notas clínicas", body: "DAP, BIRP, SOAP, anamnese digital e exportação PDF." },
    { icon: BarChart3, tag: "Escalas", title: "Escalas validadas", body: "PHQ-9, GAD-7, BAI, BDI-II, DASS-21 com alertas de risco." },
    { icon: Zap, tag: "JIT", title: "Plantão sob demanda", body: "Única plataforma com fila JIT — pacientes encontram você online." },
    { icon: Sparkles, tag: "IA", title: "IA clínica", body: "Rascunhos de notas e chat com prontuário (RAG) para profissionais Pro." },
    { icon: Shield, tag: "Compliance", title: "Conformidade total", body: "LGPD, trilha de auditoria, assinatura ICP-Brasil e página pública." },
    { icon: Building2, tag: "EAP", title: "Rede corporativa", body: "Acesso a clientes de empresas parceiras com credenciamento formal." },
    { icon: HeartPulse, tag: "Humanitário", title: "AcuraBrasil", body: "Atendimento voluntário para venezuelanos e programas de impacto social." },
  ],
  journeyTitle: "Sua jornada no Doctor8",
  journey: [
    { step: "01", title: "Cadastro", body: "Crie sua conta como PJ, informe CRP/CRM/CRN e passe pela validação." },
    { step: "02", title: "Configure", body: "Agenda, disponibilidade, valores e perfil público no diretório." },
    { step: "03", title: "Atenda", body: "Receba pacientes avulsos, Club Doctor, plantão JIT e rede EAP." },
    { step: "04", title: "Cresça", body: "Educação, comunidade, visibilidade e repasse financeiro transparente." },
  ],
  compareTitle: "Doctor8 vs. outras plataformas para profissionais",
  compareSubtitle: "Por que especialistas migram para o ecossistema Doctor8.",
  compare: [
    { them: "Marketplaces de terapia", focus: "Só psicologia", doctor8: "12+ profissões + medicina + EAP + humanitário" },
    { them: "Softwares de consultório", focus: "Só gestão local", doctor8: "Gestão + pacientes + rede corporativa + JIT" },
    { them: "Plataformas EAP", focus: "Só clientes corporativos", doctor8: "Corporativo + avulso + Club + plantão" },
  ],
  trust: [
    "Conformidade CFP, CRM e CRN com páginas públicas de compliance",
    "Videoconferência criptografada ponta a ponta",
    "Repasse financeiro transparente no 5º dia útil",
    "Plano grátis para começar — upgrade quando quiser",
    "Integração Google Agenda e lembretes WhatsApp",
    "Ecossistema médico completo — não só saúde mental",
  ],
  finalCta: {
    title: "Comece uma nova fase na sua carreira",
    subtitle: "Cadastre-se agora e tenha todas as ferramentas para investir em você e no seu bem-estar profissional.",
    primary: { label: "Cadastrar-se grátis", href: "/register/professional/signup" },
    secondary: { label: "Entrar como profissional", href: "/login" },
  },
  accessLinks: [
    { label: "Psicólogo", href: "/register/professional/signup?portal=psychologist", description: "Telepsicologia CFP + escalas" },
    { label: "Médico", href: "/register/professional/signup?portal=doctor", description: "Telemedicina + receitas digitais" },
    { label: "Nutricionista", href: "/register/professional/signup?portal=nutritionist", description: "Consultas e planos alimentares" },
  ],
};

const PARCEIROS: AudienceLandingContent = {
  id: "parceiros",
  meta: {
    title: "Doctor8 Parceiros — Farmácias, clínicas, cursos e integrações",
    description:
      "Integre sua farmácia, clínica, curso ou sistema ao ecossistema Doctor8. Rede de preços, credenciamento corporativo, educação continuada e APIs enterprise.",
  },
  accent: "emerald",
  hero: {
    badge: "Doctor8 Parceiros — cresça com o ecossistema",
    title: "Conecte seu negócio ao ecossistema de saúde que une",
    titleHighlight: "pacientes, empresas e especialistas",
    subtitle:
      "Farmácias, clínicas, educadores e integradores tecnológicos encontram no Doctor8 um canal de distribuição, credenciamento e receita — sem depender de marketplaces externos.",
    primaryCta: { label: "Quero ser parceiro", href: "/farmacias/cadastro" },
    secondaryCta: { label: "Ver tipos de parceria", href: "#parcerias" },
    note: "Cadastro gratuito para farmácias · APIs documentadas · Revenue share transparente",
  },
  stats: [
    { value: "0", label: "mensalidade para farmácias — taxa só por venda" },
    { value: "80+", label: "especialidades no diretório Doctor8" },
    { value: "300+", label: "empresas na rede corporativa EAP" },
    { value: "API", label: "webhooks, FHIR e integrações enterprise" },
  ],
  pillarsEyebrow: "Tipos de parceria",
  pillarsTitle: "Um ecossistema, múltiplas formas de crescer juntos",
  pillarsSubtitle: "Escolha o modelo que combina com seu negócio e integre-se ao fluxo de pacientes Doctor8.",
  pillars: [
    {
      icon: Store,
      title: "Farmácias e drogarias",
      body: "Publique preços de balcão, receba pacientes por proximidade e valide receitas Doctor8 na bancada.",
    },
    {
      icon: Building2,
      title: "Clínicas e CNPJs",
      body: "Multi-profissionais, faturamento centralizado, repasse e credenciamento na rede EAP corporativa.",
    },
    {
      icon: BookOpen,
      title: "Educadores e cursos",
      body: "Publique cursos na plataforma, emita certificados e alcance profissionais de saúde cadastrados.",
    },
    {
      icon: Plug,
      title: "Integradores e APIs",
      body: "Webhooks RH, FHIR SMART, eSocial, ICP-Brasil e Stripe — documentação e sandbox para parceiros tech.",
    },
  ],
  spotlight: {
    eyebrow: "Buying Club e rede",
    title: "Grupos de compra e redes de farmácias — escale com Doctor8.",
    body:
      "Buying clubs conectam grupos de pacientes a descontos negociados. Farmácias publicam preços e aparecem na busca por proximidade quando pacientes Doctor8 buscam medicamentos.",
    bullets: [
      "Importação de estoque e preços via CSV (GGREM, drug_catalog_id)",
      "Taxa mínima por pedido concluído — não por medicamento",
      "Validação de receitas integrada com rastro SNCR",
      "Apareça para pacientes na região antes da rede ir ao ar",
    ],
    cta: { label: "Cadastrar farmácia grátis", href: "/farmacias/cadastro" },
  },
  modulesEyebrow: "Oportunidades de parceria",
  modulesTitle: "Escolha seu modelo e comece hoje",
  modulesSubtitle: "Cada vertical tem onboarding dedicado, suporte e documentação.",
  modules: [
    { icon: Store, tag: "Farmácia", title: "Rede de preços Doctor8", body: "CSV de preços, endereço geolocalizado e taxa por venda." },
    { icon: Building2, tag: "Clínica", title: "Portal organização (CNPJ)", body: "Multi-profissionais, agenda compartilhada e faturamento." },
    { icon: BookOpen, tag: "Cursos", title: "Doctor8 Educação", body: "Publique cursos, certificados e alcance especialistas." },
    { icon: Users, tag: "Buying Club", title: "Grupos de compra", body: "Negocie descontos e conecte pacientes a benefícios." },
    { icon: HeartPulse, tag: "Humanitário", title: "AcuraBrasil", body: "Parcerias de impacto social e atendimento voluntário." },
    { icon: Plug, tag: "Tech", title: "APIs e webhooks", body: "Integrações RH, eSocial, FHIR SMART e Stripe metered." },
    { icon: Shield, tag: "Compliance", title: "ICP-Brasil e Lacuna", body: "Assinatura digital para PGR, PCMSO e ASO." },
    { icon: Globe, tag: "Global", title: "Expansão internacional", body: "Parcerias no Brasil, EUA, Europa e Venezuela." },
  ],
  journeyTitle: "Como funciona a parceria",
  journey: [
    { step: "01", title: "Cadastre-se", body: "Escolha seu tipo de parceria e preencha o formulário de onboarding." },
    { step: "02", title: "Configure", body: "Publique preços, integre APIs ou configure sua clínica/curso." },
    { step: "03", title: "Valide", body: "Nossa equipe revisa credenciais e ativa sua presença na rede." },
    { step: "04", title: "Receba", body: "Pacientes, empresas e profissionais fluem pelo ecossistema Doctor8." },
  ],
  compareTitle: "Por que ser parceiro Doctor8?",
  compareSubtitle: "Vantagens sobre marketplaces genéricos e integrações isoladas.",
  compare: [
    { them: "Marketplaces de farmácia", focus: "Taxa alta por item", doctor8: "Taxa mínima por pedido + receitas integradas" },
    { them: "Plataformas de curso", focus: "Público genérico", doctor8: "Audiência de profissionais de saúde verificados" },
    { them: "Integradores avulsos", focus: "Projeto custom", doctor8: "APIs documentadas + sandbox + webhooks prontos" },
  ],
  trust: [
    "Onboarding dedicado por tipo de parceria",
    "Revenue share e taxas transparentes",
    "APIs documentadas com sandbox para testes",
    "Conformidade LGPD e HIPAA no ecossistema",
    "Suporte técnico em português",
    "Ecossistema em crescimento: pacientes + empresas + especialistas",
  ],
  finalCta: {
    title: "Faça parte do ecossistema Doctor8",
    subtitle: "Cadastre sua farmácia, clínica ou integração e comece a receber pacientes e empresas da rede.",
    primary: { label: "Cadastrar farmácia", href: "/farmacias/cadastro" },
    secondary: { label: "Cadastrar clínica (CNPJ)", href: "/register/organization" },
  },
  accessLinks: [
    { label: "Farmácias", href: "/farmacias", description: "Rede de preços e dispensação" },
    { label: "Clínicas CNPJ", href: "/register/organization", description: "Multi-profissionais" },
    { label: "Cursos", href: "/cursos", description: "Doctor8 Educação" },
  ],
};

export const AUDIENCE_LANDING: Record<AudienceId, AudienceLandingContent> = {
  empresas: EMPRESAS,
  pacientes: PACIENTES,
  especialistas: ESPECIALISTAS,
  parceiros: PARCEIROS,
};

export function getAudienceLanding(id: AudienceId): AudienceLandingContent {
  return AUDIENCE_LANDING[id];
}
