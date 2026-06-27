import type { Lang } from "@/lib/i18n/translations";
import type { HumanitarianPoolSlug } from "@/lib/humanitarian/constants";

export type ProFeature = {
  icon: string;
  title: string;
  desc: string;
  details: string[];
};

export type ProPlan = {
  badge: string;
  name: string;
  price: string;
  period: string;
  features: { text: string; included: boolean }[];
  cta: string;
  featured?: boolean;
  href?: string;
};

export type ProfessionContent = {
  slug: HumanitarianPoolSlug;
  icon: string;
  title: string;
  subtitle: string;
  heroDesc: string;
  useCases: { title: string; desc: string }[];
  platformFeatures: string[];
  volunteerTitle: string;
  volunteerDesc: string;
  ctaPrimary: string;
  ctaVolunteer: string;
};

export type ProLandingContent = {
  meta: { title: string; description: string };
  nav: {
    features: string;
    how: string;
    prescriptions: string;
    schedule: string;
    plans: string;
    volunteer: string;
    signIn: string;
    signUp: string;
  };
  hero: {
    pill: string;
    title: string;
    titleEm: string;
    sub: string;
    ctaPrimary: string;
    ctaSecondary: string;
    proof: string[];
    dashTitle: string;
    stat1Val: string;
    stat1Label: string;
    stat1Up: string;
    stat2Val: string;
    stat2Label: string;
    stat2Up: string;
    nextAppts: string;
    appts: { name: string; meta: string; badge: string; color: "green" | "orange" | "blue" }[];
    notifTitle: string;
    notifSub: string;
  };
  volunteerBanner: {
    eyebrow: string;
    title: string;
    desc: string;
    cta: string;
    link: string;
    professionsTitle: string;
  };
  trust: string[];
  features: {
    eyebrow: string;
    title: string;
    sub: string;
    items: ProFeature[];
  };
  how: {
    eyebrow: string;
    title: string;
    sub: string;
    steps: { title: string; desc: string }[];
    phoneGreeting: string;
    phoneName: string;
    phoneStats: { val: string; lbl: string }[];
    phoneSection: string;
    phoneAppts: { name: string; time: string }[];
    phoneRxLabel: string;
    phoneRxName: string;
    phoneRxDetail: string;
  };
  prescriptions: {
    eyebrow: string;
    title: string;
    desc: string;
    points: string[];
    rxDoc: string;
    rxMeta: string;
    rxPatient: string;
    rxPatientName: string;
    rxPatientDetail: string;
    rxDrugs: { name: string; dose: string; tag?: string }[];
    rxSig: string;
  };
  schedule: {
    eyebrow: string;
    title: string;
    desc: string;
    points: string[];
    weekLabel: string;
    nextLabel: string;
    msgDoc: string;
    msgPat: string;
  };
  professions: {
    eyebrow: string;
    title: string;
    sub: string;
    cta: string;
  };
  pricing: {
    eyebrow: string;
    title: string;
    sub: string;
    note: string;
    plans: ProPlan[];
  };
  lgpd: { title: string; body: string };
  ctaFinal: { title: string; titleEm: string; sub: string; primary: string; secondary: string };
  footer: {
    desc: string;
    platform: string;
    patients: string;
    legal: string;
    platformLinks: string[];
    patientLinks: string[];
    legalLinks: string[];
    copyright: string;
    badges: string[];
  };
  cookie: { text: string; accept: string; decline: string };
  professionPages: Record<HumanitarianPoolSlug, ProfessionContent>;
};

const pt: ProLandingContent = {
  meta: {
    title: "Doctor8 — Plataforma para Profissionais de Saúde",
    description: "Agenda, teleconsulta, prontuário, prescrições digitais e pagamentos — tudo em um lugar. Para médicos e profissionais de saúde no Brasil, EUA e Europa.",
  },
  nav: {
    features: "Funcionalidades",
    how: "Como funciona",
    prescriptions: "Prescrições",
    schedule: "Agenda",
    plans: "Planos",
    volunteer: "Voluntariado",
    signIn: "Entrar",
    signUp: "Cadastre-se grátis",
  },
  hero: {
    pill: "Para médicos e profissionais de saúde",
    title: "Atenda mais.",
    titleEm: "Administre menos.",
    sub: "Agenda inteligente, prontuário digital, prescrições com validade legal e pagamentos automáticos — tudo integrado numa única plataforma. Funciona no Brasil, nos EUA e na Europa.",
    ctaPrimary: "Começar gratuitamente",
    ctaSecondary: "Ver como funciona",
    proof: ["Registrado no CFM", "LGPD & HIPAA", "Brasil · EUA · Europa", "Sem contrato de fidelidade"],
    dashTitle: "Dashboard — Dra. Ana Rodrigues",
    stat1Val: "12",
    stat1Label: "Consultas hoje",
    stat1Up: "↑ 3 vs. ontem",
    stat2Val: "R$4.1k",
    stat2Label: "Receita este mês",
    stat2Up: "↑ 18%",
    nextAppts: "Próximas consultas",
    appts: [
      { name: "Maria Santos", meta: "14:00 · Retorno", badge: "Confirmado", color: "green" },
      { name: "Carlos Lima", meta: "15:30 · 1ª consulta", badge: "Receita", color: "orange" },
      { name: "Paula Ferreira", meta: "16:00 · Teleconsulta", badge: "Pago", color: "blue" },
    ],
    notifTitle: "Pagamento recebido",
    notifSub: "R$ 320 · João Mendes",
  },
  volunteerBanner: {
    eyebrow: "Atendimento voluntário · SOS Venezuela",
    title: "Sua especialidade pode salvar vidas hoje",
    desc: "Profissionais de saúde do mundo inteiro estão atendendo gratuitamente vítimas do terremoto na Venezuela. Entre na fila da sua especialidade, atenda por teleconsulta e faça a diferença — sem sair de casa.",
    cta: "Quero ser voluntário",
    link: "Saiba mais sobre o SOS Venezuela",
    professionsTitle: "Especialidades no atendimento voluntário",
  },
  trust: [
    "Registrado no CFM",
    "LGPD Compliant",
    "HIPAA Certified",
    "Brasil · EUA · Europa",
    "Criptografia de ponta a ponta",
    "Prescrições com validade legal",
  ],
  features: {
    eyebrow: "Funcionalidades",
    title: "Uma plataforma.\nSeis ferramentas essenciais.",
    sub: "Tudo que você usa hoje em ferramentas separadas, agora integrado e funcionando junto.",
    items: [
      {
        icon: "calendar",
        title: "Agenda Inteligente",
        desc: "Pacientes agendam sozinhos 24h por dia. Você define sua disponibilidade, e o sistema cuida do resto.",
        details: ["Confirmação automática por e-mail", "Lembretes para reduzir faltas", "Bloqueio automático após pagamento", "Agenda por tipo de consulta"],
      },
      {
        icon: "video",
        title: "Teleconsulta Integrada",
        desc: "Videochamada de alta qualidade direto na plataforma. Nenhum app externo necessário para você ou para o paciente.",
        details: ["Link único por consulta", "Funciona direto pelo navegador", "Sala privada com senha", "Compatível com mobile"],
      },
      {
        icon: "clipboard",
        title: "Prontuário Digital",
        desc: "Histórico clínico criptografado, acessível de qualquer dispositivo. Evolução, anexos, exames e receitas num só lugar.",
        details: ["Evolução clínica por consulta", "Anexar exames e documentos", "Busca rápida por paciente", "Compartilhamento seguro"],
      },
      {
        icon: "pill",
        title: "Prescrições Digitais",
        desc: "Emita receitas com validade legal em PDF, com sua assinatura e dados do CFM. Banco de medicamentos integrado.",
        details: ["Base Anvisa de medicamentos", "Receituário simples e controlado", "PDF com dados completos do CFM", "Paciente recebe por e-mail"],
      },
      {
        icon: "credit",
        title: "Pagamentos Automáticos",
        desc: "Receba antes da consulta. Sem inadimplência, sem cobranças manuais. Suporte a cartão, Pix e PayPal.",
        details: ["Cartão, Pix e PayPal", "Pagamento obrigatório no agendamento", "Extrato e relatórios mensais", "Reembolso simplificado"],
      },
      {
        icon: "badge",
        title: "Perfil Profissional Público",
        desc: "Sua página em doctor8.org/dr/seu-nome. Compartilhe com pacientes e deixe-os agendar direto pelo link.",
        details: ["URL personalizada", "Foto, bio e especialidades", "Avaliações de pacientes", "Botão de agendamento direto"],
      },
    ],
  },
  how: {
    eyebrow: "Passo a passo",
    title: "Em menos de 10 minutos, você já está pronto para atender",
    sub: "Sem burocracia, sem instalação. Acessa pelo navegador, de qualquer dispositivo.",
    steps: [
      { title: "Crie sua conta grátis", desc: "Informe nome, especialidade e CRM/CRP. Sem cartão de crédito necessário para começar." },
      { title: "Complete seu perfil", desc: "Adicione foto, bio, valor da consulta e dados para prescrição. Leva 5 minutos." },
      { title: "Configure sua agenda", desc: "Defina os horários que você quer atender. O sistema começa a receber agendamentos automaticamente." },
      { title: "Atenda e receba", desc: "Consulte por vídeo, preencha o prontuário, emita a receita — tudo na mesma tela. Pagamento já confirmado." },
    ],
    phoneGreeting: "Bom dia,",
    phoneName: "Dra. Fernanda Lima 👋",
    phoneStats: [
      { val: "8", lbl: "Hoje" },
      { val: "R$2.4k", lbl: "Semana" },
      { val: "4.9★", lbl: "avaliação" },
    ],
    phoneSection: "Próximos horários",
    phoneAppts: [
      { name: "Roberto Alves", time: "14:00 · Teleconsulta" },
      { name: "Sílvia Castro", time: "15:00 · Retorno" },
    ],
    phoneRxLabel: "Última receita emitida",
    phoneRxName: "Losartana 50mg",
    phoneRxDetail: "Roberto Alves · Ontem, 14:32",
  },
  prescriptions: {
    eyebrow: "Prescrições Digitais",
    title: "Receitas com validade legal, geradas em segundos",
    desc: "A Doctor8 tem uma base completa de medicamentos da Anvisa integrada. Você busca o medicamento, define a posologia — e o sistema gera o PDF com todos os dados exigidos pelo CFM.",
    points: [
      "Base de medicamentos Anvisa com tags para controlados",
      "PDF com dados do paciente, endereço e idade calculada",
      "Dados completos do médico e clínica no cabeçalho",
      "Disponível em português, inglês e espanhol",
      "Paciente recebe por e-mail e acessa em Minhas Receitas",
      "Receituário especial para substâncias controladas",
    ],
    rxDoc: "Dra. Ana Rodrigues · CRM 12345/SP",
    rxMeta: "Cardiologista · Clínica Doctor8 SP",
    rxPatient: "Paciente",
    rxPatientName: "Carlos Eduardo Lima",
    rxPatientDetail: "52 anos · R. das Flores, 120 · São Paulo / SP",
    rxDrugs: [
      { name: "Losartana Potássica 50mg", dose: "1 comprimido ao dia pela manhã — 30 dias" },
      { name: "Clonazepam 2mg", dose: "½ comprimido à noite — 30 dias", tag: "Controlado" },
    ],
    rxSig: "PDF com assinatura digital · Gerado em 17/06/2026",
  },
  schedule: {
    eyebrow: "Agenda & Teleconsulta",
    title: "Sua agenda trabalha por você, mesmo quando você não está",
    desc: "Pacientes no Brasil, nos EUA e na Europa podem agendar e pagar a qualquer hora. Você aparece disponível para quem precisa de você.",
    points: [
      "Agendamento online 24/7 com pagamento integrado",
      "Confirmação automática por e-mail para o paciente",
      "Lembretes para reduzir faltas em até 60%",
      "Bloqueio automático de horários já agendados",
      "Videochamada sem instalação de aplicativo",
      "Sala privada com link exclusivo por consulta",
    ],
    weekLabel: "Semana actual — Junio 2026",
    nextLabel: "Próximas 3 consultas",
    msgDoc: "Olá Maria, sua consulta está confirmada para amanhã às 14h. Link de acesso enviado para o seu e-mail! ✅",
    msgPat: "Obrigada doutora, já recebi o link 😊",
  },
  professions: {
    eyebrow: "Voluntariado",
    title: "Como cada especialidade usa a Doctor8",
    sub: "Conheça como médicos, psicólogos, fisioterapeutas e outros profissionais aproveitam a plataforma — na prática clínica e no atendimento humanitário.",
    cta: "Ver como funciona para sua área",
  },
  pricing: {
    eyebrow: "Planos",
    title: "Transparente. Sem surpresas.",
    sub: "Comece grátis. Escale quando quiser. Cancele quando quiser.",
    note: "* Preços sujeitos a alteração. Planos com cobrança mensal, sem fidelidade.",
    plans: [
      {
        badge: "Starter",
        name: "Gratuito",
        price: "0",
        period: "Para começar e testar",
        features: [
          { text: "Até 20 consultas/mês", included: true },
          { text: "Teleconsulta integrada", included: true },
          { text: "Prontuário digital", included: true },
          { text: "Prescrições digitais", included: true },
          { text: "Pagamentos automáticos", included: false },
          { text: "Perfil público indexado", included: false },
          { text: "Suporte prioritário", included: false },
        ],
        cta: "Começar grátis",
      },
      {
        badge: "🔥 Mais popular",
        name: "Profissional",
        price: "149",
        period: "Para quem quer crescer",
        featured: true,
        features: [
          { text: "Consultas ilimitadas", included: true },
          { text: "Teleconsulta integrada", included: true },
          { text: "Prontuário digital completo", included: true },
          { text: "Prescrições digitais", included: true },
          { text: "Pagamentos automáticos", included: true },
          { text: "Perfil público indexado", included: true },
          { text: "Suporte prioritário", included: true },
        ],
        cta: "Assinar agora",
      },
      {
        badge: "Clínica",
        name: "Equipe",
        price: "399",
        period: "Para clínicas e grupos",
        features: [
          { text: "Até 5 profissionais", included: true },
          { text: "Tudo do plano Profissional", included: true },
          { text: "Painel administrativo", included: true },
          { text: "Relatérios consolidados", included: true },
          { text: "Onboarding dedicado", included: true },
          { text: "Contrato de DPA (LGPD)", included: true },
          { text: "Suporte prioritário", included: true },
        ],
        cta: "Falar com a equipe",
        href: "mailto:contato@doctor8.org",
      },
    ],
  },
  lgpd: {
    title: "Conformidade com LGPD e HIPAA — porque seus pacientes confiam a você os dados mais sensíveis da vida deles",
    body: "A Doctor8 está em total conformidade com a Lei Geral de Proteção de Dados (LGPD) e com o HIPAA americano. Todos os dados são armazenados com criptografia de ponta a ponta. Questões? Fale com nosso DPO: dpo@doctor8.org",
  },
  ctaFinal: {
    title: "Pronto para",
    titleEm: "simplificar",
    sub: "sua prática clínica?",
    primary: "Cadastre-se gratuitamente",
    secondary: "Falar com a equipe",
  },
  footer: {
    desc: "Plataforma de telemedicina para profissionais de saúde. Registrada no CFM. Conforme LGPD e HIPAA. Atende Brasil, EUA e Europa.",
    platform: "Plataforma",
    patients: "Pacientes",
    legal: "Legal",
    platformLinks: ["Funcionalidades", "Como funciona", "Prescrições", "Agenda", "Planos"],
    patientLinks: ["Club Doctor", "Agendar consulta", "Cannabis Medicinal", "Doctor Energy"],
    legalLinks: ["Política de Privacidade", "Termos de Uso", "LGPD", "DPO"],
    copyright: "© 2026 Doctor8 · INFO8 Desenvolvimento de Sistemas Ltda · CNPJ 20.251.527/0001-04",
    badges: ["LGPD", "HIPAA", "CFM", "SSL 256-bit"],
  },
  cookie: {
    text: "Utilizamos cookies para melhorar sua experiência. Ao continuar, você concorda com nossa Política de Privacidade e com a LGPD.",
    accept: "Aceitar",
    decline: "Recusar",
  },
  professionPages: {
    medico: {
      slug: "medico",
      icon: "stethoscope",
      title: "Médico clínico",
      subtitle: "Consultas, prescrições e prontuário em uma única plataforma",
      heroDesc: "Da teleconsulta de retorno — renovação de receitas, a Doctor8 centraliza tudo o que o médico precisa — incluindo filas humanitárias para atendimento gratuito.",
      useCases: [
        { title: "Consulta clínica online", desc: "Atenda pacientes por vídeo com prontuário integrado, evolução SOAP e anexos de exames na mesma tela." },
        { title: "Prescrições com validade legal", desc: "Emita receitas simples e controladas com base Anvisa, PDF assinado e envio automático ao paciente." },
        { title: "Agenda com pagamento antecipado", desc: "Defina horários, valores e tipos de consulta. O paciente agenda e paga antes — sem inadimplência." },
        { title: "Voluntariado SOS Venezuela", desc: "Entre na fila médica humanitária, receba pacientes triados por urgência e atenda gratuitamente por teleconsulta." },
      ],
      platformFeatures: [
        "Prontuário com histórico completo e busca por paciente",
        "Base de medicamentos Anvisa com alertas de controlados",
        "Perfil público indexado para captar novos pacientes",
        "Fila humanitária com triagem automática de prioridade",
      ],
      volunteerTitle: "Atenda vítimas do terremoto como médico voluntário",
      volunteerDesc: "Pacientes na Venezuela passam por triagem rápida e entram na fila médica. Quando for sua vez, você recebe a notificação e atende por vídeo — com prontuário e prescrição prontos.",
      ctaPrimary: "Criar conta médica",
      ctaVolunteer: "Voluntariar-se no SOS Venezuela",
    },
    psicologo: {
      slug: "psicologo",
      icon: "brain",
      title: "Psicólogo",
      subtitle: "Psicoterapia online com conformidade CFP e prontuário seguro",
      heroDesc: "Sessões por vídeo, escalas psicológicas, documentos assinados e agenda automatizada — tudo alinhado à Resolução CFP 09/2024 para TDICs.",
      useCases: [
        { title: "Psicoterapia por teleconsulta", desc: "Salas privadas por sessão, sem instalar apps. Ideal para acompanhamento contínuo e primeiras consultas." },
        { title: "Escalas e instrumentos", desc: "Aplique PHQ-9, GAD-7 e outras escalas com pontuação automática salva no prontuário do paciente." },
        { title: "Documentos e termos", desc: "TCLE, contrato de prestação de serviços e relatórios com assinatura digital integrada." },
        { title: "Primeiros Socorros Psicológicos (PFA)", desc: "No voluntariado SOS Venezuela, atenda pacientes em crise emocional com fila prioritária para urgências." },
      ],
      platformFeatures: [
        "Módulo psicológico com notas de sessão estruturadas",
        "Conformidade com Resolução CFP 09/2024 (TDICs)",
        "Registro de emergências e encaminhamentos",
        "Fila humanitária com priorização por nível de crise",
      ],
      volunteerTitle: "Ofereça acolhimento psicológico gratuito",
      volunteerDesc: "A fila de psicologia humanitária prioriza pacientes em crise emocional. Você atende por vídeo com prontuário seguro e pode registrar encaminhamentos quando necessário.",
      ctaPrimary: "Criar conta de psicólogo",
      ctaVolunteer: "Voluntariar-se no SOS Venezuela",
    },
    psicanalista: {
      slug: "psicanalista",
      icon: "sparkles",
      title: "Psicanalista",
      subtitle: "Sessões analíticas online com privacidade e continuidade",
      heroDesc: "Gerencie analisandos, sessões regulares e documentação clínica em ambiente criptografado — com suporte a voluntariado humanitário.",
      useCases: [
        { title: "Sessões analíticas remotas", desc: "Salas de vídeo estáveis para processos de longa duração, com histórico de sessões por paciente." },
        { title: "Gestão de analisandos", desc: "Prontuário dedicado com evolução clínica, anotações de sessão e busca rápida." },
        { title: "Agenda flexível", desc: "Configure frequência semanal, bloqueios e tipos de sessão (primeira vez, retorno, supervisão)." },
        { title: "Escuta humanitária", desc: "No SOS Venezuela, ofereça escuta psicanalítica a vítimas do terremoto em sofrimento profundo." },
      ],
      platformFeatures: [
        "Conta dedicada de psicanalista com perfil especializado",
        "Prontuário com sigilo e criptografia de ponta a ponta",
        "Agenda com lembretes automáticos para reduzir faltas",
        "Fila humanitária exclusiva para psicanalistas voluntários",
      ],
      volunteerTitle: "Escuta analítica para quem mais precisa",
      volunteerDesc: "A fila de psicanalistas atende pacientes que buscam escuta profunda após trauma. Cadastre-se como psicanalista e entre na fila voluntária quando estiver disponível.",
      ctaPrimary: "Criar conta de psicanalista",
      ctaVolunteer: "Voluntariar-se no SOS Venezuela",
    },
    terapeuta_integrativo: {
      slug: "terapeuta_integrativo",
      icon: "leaf",
      title: "Terapeuta integrativo",
      subtitle: "Práticas holísticas e complementares com prontuário unificado",
      heroDesc: "Combine abordagens integrativas — aromaterapia, florais, mindfulness — com teleconsulta, documentação e agenda profissional na Doctor8.",
      useCases: [
        { title: "Consultas integrativas online", desc: "Atenda pacientes que buscam abordagem holística com prontuário que registra protocolos e evolução." },
        { title: "Planos terapêuticos", desc: "Documente recomendações, combinações e acompanhamento em evoluções estruturadas." },
        { title: "Perfil especializado", desc: "Destaque suas linhas de atuação no perfil público e receba agendamentos diretos." },
        { title: "Acolhimento humanitário", desc: "No voluntariado, ofereça suporte emocional integrativo a vítimas em abrigos e comunidades afetadas." },
      ],
      platformFeatures: [
        "Prontuário flexível para múltiplas abordagens terapêuticas",
        "Teleconsulta estável pelo navegador",
        "Documentos e orientações enviados ao paciente por e-mail",
        "Fila humanitária de terapia integrativa",
      ],
      volunteerTitle: "Cuidado integrativo gratuito para vítimas",
      volunteerDesc: "Pacientes na fila de terapia integrativa buscam acolhimento holístico após o trauma. Atenda por vídeo com toda a documentação na plataforma.",
      ctaPrimary: "Criar conta profissional",
      ctaVolunteer: "Voluntariar-se no SOS Venezuela",
    },
    fisioterapeuta: {
      slug: "fisioterapeuta",
      icon: "dumbbell",
      title: "Fisioterapeuta",
      subtitle: "Reabilitação remota com orientação de exercícios e acompanhamento",
      heroDesc: "Avalie, oriente e acompanhe pacientes por teleconsulta — ideal para reabilitação pós-trauma, dores musculares e exercícios domiciliares.",
      useCases: [
        { title: "Teleconsulta fisioterapêutica", desc: "Avalie postura e movimento por vídeo, registre evolução e adapte protocolos de exercícios." },
        { title: "Orientação de exercícios", desc: "Envie planos de exercícios documentados no prontuário com acompanhamento em retornos." },
        { title: "Pós-operatório e trauma", desc: "Acompanhe reabilitação de pacientes com lesões por escombros ou quedas — comum no contexto humanitário." },
        { title: "Voluntariado pós-terremoto", desc: "Atenda vítimas com dores musculares, limitações de mobilidade e necessidade de reabilitação." },
      ],
      platformFeatures: [
        "Prontuário com registro de amplitude, dor e evolução funcional",
        "Anexos de vídeos e imagens de exercícios",
        "Agenda por tipo de sessão (avaliação, retorno, orientação)",
        "Fila humanitária de fisioterapia com triagem de mobilidade",
      ],
      volunteerTitle: "Reabilitação gratuita para vítimas do terremoto",
      volunteerDesc: "Muitas vítimas têm dores musculares e limitações de mobilidade. Entre na fila de fisioterapia e atenda com orientações práticas por vídeo.",
      ctaPrimary: "Criar conta de fisioterapeuta",
      ctaVolunteer: "Voluntariar-se no SOS Venezuela",
    },
    nutricionista: {
      slug: "nutricionista",
      icon: "utensils",
      title: "Nutricionista",
      subtitle: "Consultas nutricionais online com planos alimentares documentados",
      heroDesc: "Avalie hábitos alimentares, crie planos nutricionais e acompanhe evolução — com teleconsulta integrada e prontuário completo.",
      useCases: [
        { title: "Consulta nutricional online", desc: "Anamnese alimentar, avaliação de necessidades e orientação personalizada por vídeo." },
        { title: "Planos alimentares", desc: "Documente recomendações, restrições e metas no prontuário com histórico de evolução." },
        { title: "Acompanhamento contínuo", desc: "Retornos programados com lembretes automáticos para manter adesão ao tratamento." },
        { title: "Nutrição humanitária", desc: "No SOS Venezuela, oriente famílias em abrigos sobre alimentação adequada com recursos limitados." },
      ],
      platformFeatures: [
        "Prontuário nutricional com antropometria e histórico",
        "Documentos de orientação enviados ao paciente",
        "Agenda com tipos de consulta (primeira vez, retorno, reeducação)",
        "Fila humanitária de nutrição",
      ],
      volunteerTitle: "Orientação nutricional para famílias afetadas",
      volunteerDesc: "Famílias em abrigos precisam de orientação sobre alimentação com recursos escassos. Atenda na fila de nutrição humanitária.",
      ctaPrimary: "Criar conta de nutricionista",
      ctaVolunteer: "Voluntariar-se no SOS Venezuela",
    },
    cuidados_paliativos: {
      slug: "cuidados_paliativos",
      icon: "heart",
      title: "Cuidados paliativos",
      subtitle: "Conforto, dignidade e suporte a pacientes e famílias",
      heroDesc: "Ofereça cuidados paliativos por teleconsulta — manejo de sintomas, suporte familiar e orientação — com documentação sensível e segura.",
      useCases: [
        { title: "Consultas paliativas remotas", desc: "Avalie sintomas, ajuste orientações e acompanhe pacientes em cuidado domiciliar por vídeo." },
        { title: "Suporte à família", desc: "Registre conversas com familiares, orientações de cuidado e encaminhamentos no prontuário." },
        { title: "Manejo de sintomas", desc: "Documente protocolos de conforto e evolução com prescrições quando indicado pelo médico responsável." },
        { title: "Cuidado humanitário", desc: "No SOS Venezuela, ofereça suporte paliativo a pacientes gravemente afetados e suas famílias." },
      ],
      platformFeatures: [
        "Prontuário com foco em qualidade de vida e sintomas",
        "Teleconsulta para acompanhamento familiar",
        "Documentação sensível com máxima privacidade",
        "Fila humanitária de cuidados paliativos",
      ],
      volunteerTitle: "Dignidade e conforto para quem mais sofre",
      volunteerDesc: "A fila de cuidados paliativos atende pacientes em situação grave e famílias enlutadas. Sua presença faz diferença — atenda por vídeo com toda a segurança da plataforma.",
      ctaPrimary: "Criar conta profissional",
      ctaVolunteer: "Voluntariar-se no SOS Venezuela",
    },
  },
};

// English — abbreviated structure reuse via mapping for profession pages
const en: ProLandingContent = {
  meta: {
    title: "Doctor8 — Healthcare Professional Platform",
    description: "Scheduling, telehealth, medical records, digital prescriptions and payments — all in one place. For physicians and health professionals in Brazil, USA and Europe.",
  },
  nav: {
    features: "Features",
    how: "How it works",
    prescriptions: "Prescriptions",
    schedule: "Schedule",
    plans: "Pricing",
    volunteer: "Volunteer",
    signIn: "Sign in",
    signUp: "Sign up free",
  },
  hero: {
    pill: "For physicians and health professionals",
    title: "See more patients.",
    titleEm: "Manage less admin.",
    sub: "Smart scheduling, digital records, legally valid prescriptions and automatic payments — all integrated in one platform. Works in Brazil, the USA and Europe.",
    ctaPrimary: "Start for free",
    ctaSecondary: "See how it works",
    proof: ["CFM registered", "LGPD & HIPAA", "Brazil · USA · Europe", "No lock-in contract"],
    dashTitle: "Dashboard — Dr. Ana Rodrigues",
    stat1Val: "12",
    stat1Label: "Appointments today",
    stat1Up: "↑ 3 vs. yesterday",
    stat2Val: "$820",
    stat2Label: "Revenue this month",
    stat2Up: "↑ 18%",
    nextAppts: "Upcoming appointments",
    appts: [
      { name: "Maria Santos", meta: "2:00 PM · Follow-up", badge: "Confirmed", color: "green" },
      { name: "Carlos Lima", meta: "3:30 PM · First visit", badge: "Rx", color: "orange" },
      { name: "Paula Ferreira", meta: "4:00 PM · Telehealth", badge: "Paid", color: "blue" },
    ],
    notifTitle: "Payment received",
    notifSub: "$64 · João Mendes",
  },
  volunteerBanner: {
    eyebrow: "Volunteer care · SOS Venezuela",
    title: "Your specialty can save lives today",
    desc: "Health professionals worldwide are providing free care to earthquake victims in Venezuela. Join your specialty queue, see patients by telehealth and make a difference — from home.",
    cta: "I want to volunteer",
    link: "Learn more about SOS Venezuela",
    professionsTitle: "Specialties in volunteer care",
  },
  trust: ["CFM registered", "LGPD Compliant", "HIPAA Certified", "Brazil · USA · Europe", "End-to-end encryption", "Legally valid prescriptions"],
  features: {
    eyebrow: "Features",
    title: "One platform.\nSix essential tools.",
    sub: "Everything you use today in separate tools, now integrated and working together.",
    items: [
      { icon: "calendar", title: "Smart Scheduling", desc: "Patients book 24/7. You set availability and the system handles the rest.", details: ["Automatic email confirmation", "Reminders to reduce no-shows", "Auto-block after payment", "Schedule by visit type"] },
      { icon: "video", title: "Integrated Telehealth", desc: "High-quality video calls built in. No external apps for you or your patients.", details: ["Unique link per visit", "Works in the browser", "Private room with password", "Mobile compatible"] },
      { icon: "clipboard", title: "Digital Medical Records", desc: "Encrypted clinical history accessible from any device. Notes, attachments, labs and prescriptions in one place.", details: ["Clinical notes per visit", "Attach exams and documents", "Quick patient search", "Secure sharing"] },
      { icon: "pill", title: "Digital Prescriptions", desc: "Issue legally valid PDF prescriptions with your signature and professional credentials.", details: ["Integrated drug database", "Simple and controlled prescriptions", "PDF with full credentials", "Patient receives by email"] },
      { icon: "credit", title: "Automatic Payments", desc: "Get paid before the visit. No defaults, no manual billing. Card, Pix and PayPal.", details: ["Card, Pix and PayPal", "Payment required at booking", "Monthly statements and reports", "Simplified refunds"] },
      { icon: "badge", title: "Public Professional Profile", desc: "Your page at doctor8.org/dr/your-name. Share with patients and let them book directly.", details: ["Custom URL", "Photo, bio and specialties", "Patient reviews", "Direct booking button"] },
    ],
  },
  how: {
    eyebrow: "Step by step",
    title: "In under 10 minutes, you're ready to see patients",
    sub: "No bureaucracy, no installation. Access from any device in your browser.",
    steps: [
      { title: "Create your free account", desc: "Enter your name, specialty and license number. No credit card required to start." },
      { title: "Complete your profile", desc: "Add photo, bio, consultation fee and prescription data. Takes 5 minutes." },
      { title: "Set up your schedule", desc: "Define the hours you want to work. The system starts receiving bookings automatically." },
      { title: "See patients and get paid", desc: "Video visit, fill the chart, issue prescriptions — all on one screen. Payment already confirmed." },
    ],
    phoneGreeting: "Good morning,",
    phoneName: "Dr. Fernanda Lima 👋",
    phoneStats: [{ val: "8", lbl: "Today" }, { val: "$480", lbl: "Week" }, { val: "4.9★", lbl: "Rating" }],
    phoneSection: "Upcoming slots",
    phoneAppts: [{ name: "Roberto Alves", time: "2:00 PM · Telehealth" }, { name: "Sílvia Castro", time: "3:00 PM · Follow-up" }],
    phoneRxLabel: "Last prescription issued",
    phoneRxName: "Losartan 50mg",
    phoneRxDetail: "Roberto Alves · Yesterday, 2:32 PM",
  },
  prescriptions: {
    eyebrow: "Digital Prescriptions",
    title: "Legally valid prescriptions in seconds",
    desc: "Doctor8 has a complete integrated drug database. Search the medication, set the dosage — and the system generates a PDF with all required professional data.",
    points: ["Drug database with controlled substance tags", "PDF with patient data, address and calculated age", "Full physician and clinic data in header", "Available in Portuguese, English and Spanish", "Patient receives by email and accesses in My Prescriptions", "Special form for controlled substances"],
    rxDoc: "Dr. Ana Rodrigues · License 12345/SP",
    rxMeta: "Cardiologist · Doctor8 Clinic SP",
    rxPatient: "Patient",
    rxPatientName: "Carlos Eduardo Lima",
    rxPatientDetail: "52 years · 120 Flower St · São Paulo / SP",
    rxDrugs: [{ name: "Losartan Potassium 50mg", dose: "1 tablet daily in the morning — 30 days" }, { name: "Clonazepam 2mg", dose: "½ tablet at night — 30 days", tag: "Controlled" }],
    rxSig: "PDF with digital signature · Generated Jun 17, 2026",
  },
  schedule: {
    eyebrow: "Schedule & Telehealth",
    title: "Your schedule works for you, even when you're not",
    desc: "Patients in Brazil, the USA and Europe can book and pay anytime. You appear available to those who need you.",
    points: ["24/7 online booking with integrated payment", "Automatic email confirmation for patients", "Reminders to reduce no-shows by up to 60%", "Automatic blocking of booked slots", "Video calls without app installation", "Private room with exclusive link per visit"],
    weekLabel: "Current week — June 2026",
    nextLabel: "Next 3 appointments",
    msgDoc: "Hi Maria, your appointment is confirmed for tomorrow at 2 PM. Access link sent to your email! ✅",
    msgPat: "Thank you doctor, I received the link 😊",
  },
  professions: {
    eyebrow: "Volunteer care",
    title: "How each specialty uses Doctor8",
    sub: "See how physicians, psychologists, physiotherapists and other professionals use the platform — in clinical practice and humanitarian care.",
    cta: "See how it works for your field",
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Transparent. No surprises.",
    sub: "Start free. Scale when you want. Cancel anytime.",
    note: "* Prices subject to change. Monthly billing, no lock-in.",
    plans: [
      { badge: "Starter", name: "Free", price: "0", period: "To start and test", features: [{ text: "Up to 20 visits/month", included: true }, { text: "Integrated telehealth", included: true }, { text: "Digital records", included: true }, { text: "Digital prescriptions", included: true }, { text: "Automatic payments", included: false }, { text: "Indexed public profile", included: false }, { text: "Priority support", included: false }], cta: "Start free" },
      { badge: "🔥 Most popular", name: "Professional", price: "149", period: "For growing practices", featured: true, features: [{ text: "Unlimited visits", included: true }, { text: "Integrated telehealth", included: true }, { text: "Full digital records", included: true }, { text: "Digital prescriptions", included: true }, { text: "Automatic payments", included: true }, { text: "Indexed public profile", included: true }, { text: "Priority support", included: true }], cta: "Subscribe now" },
      { badge: "Clinic", name: "Team", price: "399", period: "For clinics and groups", features: [{ text: "Up to 5 professionals", included: true }, { text: "Everything in Professional", included: true }, { text: "Admin dashboard", included: true }, { text: "Consolidated reports", included: true }, { text: "Dedicated onboarding", included: true }, { text: "DPA contract (LGPD)", included: true }, { text: "Priority support", included: true }], cta: "Talk to our team", href: "mailto:contato@doctor8.org" },
    ],
  },
  lgpd: {
    title: "LGPD and HIPAA compliance — because your patients trust you with the most sensitive data of their lives",
    body: "Doctor8 is fully compliant with Brazil's LGPD and US HIPAA. All data is stored with end-to-end encryption. Questions? Contact our DPO: dpo@doctor8.org",
  },
  ctaFinal: { title: "Ready to", titleEm: "simplify", sub: "your clinical practice?", primary: "Sign up for free", secondary: "Talk to our team" },
  footer: {
    desc: "Telehealth platform for health professionals. CFM registered. LGPD and HIPAA compliant. Serves Brazil, USA and Europe.",
    platform: "Platform", patients: "Patients", legal: "Legal",
    platformLinks: ["Features", "How it works", "Prescriptions", "Schedule", "Pricing"],
    patientLinks: ["Club Doctor", "Book appointment", "Medical Cannabis", "Doctor Energy"],
    legalLinks: ["Privacy Policy", "Terms of Use", "LGPD", "DPO"],
    copyright: "© 2026 Doctor8 · INFO8 Desenvolvimento de Sistemas Ltda · CNPJ 20.251.527/0001-04",
    badges: ["LGPD", "HIPAA", "CFM", "SSL 256-bit"],
  },
  cookie: { text: "We use cookies to improve your experience. By continuing, you agree to our Privacy Policy and LGPD.", accept: "Accept", decline: "Decline" },
  professionPages: {
    medico: { slug: "medico", icon: "stethoscope", title: "General physician", subtitle: "Visits, prescriptions and records in one platform", heroDesc: "From follow-up telehealth to prescription renewals, Doctor8 centralizes everything physicians need — including humanitarian queues for free care.", useCases: [{ title: "Online clinical visits", desc: "See patients by video with integrated chart, SOAP notes and exam attachments on one screen." }, { title: "Legally valid prescriptions", desc: "Issue simple and controlled prescriptions with integrated database, signed PDF and automatic delivery." }, { title: "Schedule with upfront payment", desc: "Set hours, fees and visit types. Patients book and pay in advance — no defaults." }, { title: "SOS Venezuela volunteering", desc: "Join the humanitarian medical queue, receive triaged patients and provide free telehealth." }], platformFeatures: ["Chart with full history and patient search", "Drug database with controlled substance alerts", "Indexed public profile to attract patients", "Humanitarian queue with automatic priority triage"], volunteerTitle: "Care for earthquake victims as a volunteer physician", volunteerDesc: "Patients in Venezuela complete quick triage and join the medical queue. When it's your turn, you get notified and see them by video — with chart and prescriptions ready.", ctaPrimary: "Create physician account", ctaVolunteer: "Volunteer for SOS Venezuela" },
    psicologo: { slug: "psicologo", icon: "brain", title: "Psychologist", subtitle: "Online therapy with CFP compliance and secure records", heroDesc: "Video sessions, psychological scales, signed documents and automated scheduling — aligned with professional telehealth standards.", useCases: [{ title: "Telehealth psychotherapy", desc: "Private rooms per session, no apps to install. Ideal for ongoing care and first visits." }, { title: "Scales and instruments", desc: "Apply PHQ-9, GAD-7 and other scales with automatic scoring saved to the patient chart." }, { title: "Documents and consent", desc: "Consent forms, service agreements and reports with integrated digital signature." }, { title: "Psychological First Aid (PFA)", desc: "In SOS Venezuela volunteering, see patients in emotional crisis with priority crisis queue." }], platformFeatures: ["Psychology module with structured session notes", "Compliance with telehealth professional standards", "Emergency and referral documentation", "Humanitarian queue with crisis-level prioritization"], volunteerTitle: "Offer free psychological support", volunteerDesc: "The humanitarian psychology queue prioritizes patients in emotional crisis. You see them by video with secure records and can document referrals when needed.", ctaPrimary: "Create psychologist account", ctaVolunteer: "Volunteer for SOS Venezuela" },
    psicanalista: { slug: "psicanalista", icon: "sparkles", title: "Psychoanalyst", subtitle: "Online analytic sessions with privacy and continuity", heroDesc: "Manage analysands, regular sessions and clinical documentation in an encrypted environment — with humanitarian volunteering support.", useCases: [{ title: "Remote analytic sessions", desc: "Stable video rooms for long-term processes with session history per patient." }, { title: "Analysand management", desc: "Dedicated chart with clinical evolution, session notes and quick search." }, { title: "Flexible schedule", desc: "Configure weekly frequency, blocks and session types (first visit, return, supervision)." }, { title: "Humanitarian listening", desc: "In SOS Venezuela, offer psychoanalytic listening to earthquake victims in deep suffering." }], platformFeatures: ["Dedicated psychoanalyst account with specialized profile", "Chart with confidentiality and end-to-end encryption", "Schedule with automatic reminders to reduce no-shows", "Exclusive humanitarian queue for volunteer psychoanalysts"], volunteerTitle: "Analytic listening for those who need it most", volunteerDesc: "The psychoanalyst queue serves patients seeking deep listening after trauma. Sign up as a psychoanalyst and join the volunteer queue when available.", ctaPrimary: "Create psychoanalyst account", ctaVolunteer: "Volunteer for SOS Venezuela" },
    terapeuta_integrativo: { slug: "terapeuta_integrativo", icon: "leaf", title: "Integrative therapist", subtitle: "Holistic and complementary practices with unified records", heroDesc: "Combine integrative approaches — aromatherapy, flower essences, mindfulness — with telehealth, documentation and professional scheduling on Doctor8.", useCases: [{ title: "Online integrative consultations", desc: "See patients seeking holistic approaches with a chart that records protocols and progress." }, { title: "Therapeutic plans", desc: "Document recommendations, combinations and follow-up in structured notes." }, { title: "Specialized profile", desc: "Highlight your practice areas on your public profile and receive direct bookings." }, { title: "Humanitarian support", desc: "In volunteering, offer integrative emotional support to victims in shelters and affected communities." }], platformFeatures: ["Flexible chart for multiple therapeutic approaches", "Stable browser-based telehealth", "Documents and guidance sent to patients by email", "Humanitarian integrative therapy queue"], volunteerTitle: "Free integrative care for victims", volunteerDesc: "Patients in the integrative therapy queue seek holistic support after trauma. See them by video with full documentation on the platform.", ctaPrimary: "Create professional account", ctaVolunteer: "Volunteer for SOS Venezuela" },
    fisioterapeuta: { slug: "fisioterapeuta", icon: "dumbbell", title: "Physiotherapist", subtitle: "Remote rehabilitation with exercise guidance and follow-up", heroDesc: "Assess, guide and follow patients by telehealth — ideal for post-trauma rehab, muscle pain and home exercises.", useCases: [{ title: "Physiotherapy telehealth", desc: "Assess posture and movement by video, record progress and adapt exercise protocols." }, { title: "Exercise guidance", desc: "Send documented exercise plans in the chart with follow-up on return visits." }, { title: "Post-op and trauma", desc: "Follow rehabilitation for patients with injuries from debris or falls — common in humanitarian contexts." }, { title: "Post-earthquake volunteering", desc: "See victims with muscle pain, mobility limitations and rehabilitation needs." }], platformFeatures: ["Chart with range of motion, pain and functional progress", "Attachments for exercise videos and images", "Schedule by session type (assessment, follow-up, guidance)", "Humanitarian physiotherapy queue with mobility triage"], volunteerTitle: "Free rehabilitation for earthquake victims", volunteerDesc: "Many victims have muscle pain and mobility limitations. Join the physiotherapy queue and provide practical guidance by video.", ctaPrimary: "Create physiotherapist account", ctaVolunteer: "Volunteer for SOS Venezuela" },
    nutricionista: { slug: "nutricionista", icon: "utensils", title: "Nutritionist", subtitle: "Online nutrition consultations with documented meal plans", heroDesc: "Assess eating habits, create nutrition plans and track progress — with integrated telehealth and complete records.", useCases: [{ title: "Online nutrition consultation", desc: "Dietary history, needs assessment and personalized guidance by video." }, { title: "Meal plans", desc: "Document recommendations, restrictions and goals in the chart with progress history." }, { title: "Ongoing follow-up", desc: "Scheduled return visits with automatic reminders to maintain treatment adherence." }, { title: "Humanitarian nutrition", desc: "In SOS Venezuela, guide families in shelters on adequate nutrition with limited resources." }], platformFeatures: ["Nutrition chart with anthropometry and history", "Guidance documents sent to patients", "Schedule by visit type (first visit, follow-up, re-education)", "Humanitarian nutrition queue"], volunteerTitle: "Nutrition guidance for affected families", volunteerDesc: "Families in shelters need guidance on nutrition with scarce resources. Serve in the humanitarian nutrition queue.", ctaPrimary: "Create nutritionist account", ctaVolunteer: "Volunteer for SOS Venezuela" },
    cuidados_paliativos: { slug: "cuidados_paliativos", icon: "heart", title: "Palliative care", subtitle: "Comfort, dignity and support for patients and families", heroDesc: "Offer palliative care by telehealth — symptom management, family support and guidance — with sensitive, secure documentation.", useCases: [{ title: "Remote palliative visits", desc: "Assess symptoms, adjust guidance and follow home-care patients by video." }, { title: "Family support", desc: "Record conversations with family members, care guidance and referrals in the chart." }, { title: "Symptom management", desc: "Document comfort protocols and progress with prescriptions when indicated by the responsible physician." }, { title: "Humanitarian care", desc: "In SOS Venezuela, offer palliative support to severely affected patients and their families." }], platformFeatures: ["Chart focused on quality of life and symptoms", "Telehealth for family follow-up", "Sensitive documentation with maximum privacy", "Humanitarian palliative care queue"], volunteerTitle: "Dignity and comfort for those who suffer most", volunteerDesc: "The palliative care queue serves patients in grave condition and grieving families. Your presence makes a difference — see them by video with full platform security.", ctaPrimary: "Create professional account", ctaVolunteer: "Volunteer for SOS Venezuela" },
  },
};

const es: ProLandingContent = {
  meta: {
    title: "Doctor8 — Plataforma para Profesionales de Salud",
    description: "Agenda, teleconsulta, historial clínico, prescripciones digitales y pagos — todo en un lugar. Para médicos y profesionales de salud en Brasil, EE.UU. y Europa.",
  },
  nav: {
    features: "Funcionalidades",
    how: "Cómo funciona",
    prescriptions: "Prescripciones",
    schedule: "Agenda",
    plans: "Planes",
    volunteer: "Voluntariado",
    signIn: "Entrar",
    signUp: "Regístrate gratis",
  },
  hero: {
    pill: "Para médicos y profesionales de salud",
    title: "Atiende más.",
    titleEm: "Administra menos.",
    sub: "Agenda inteligente, historial digital, prescripciones con validez legal y pagos automáticos — todo integrado en una sola plataforma. Funciona en Brasil, EE.UU. y Europa.",
    ctaPrimary: "Empezar gratis",
    ctaSecondary: "Ver cómo funciona",
    proof: ["Registrado en CFM", "LGPD & HIPAA", "Brasil · EE.UU. · Europa", "Sin contrato de permanencia"],
    dashTitle: "Panel — Dra. Ana Rodrigues",
    stat1Val: "12",
    stat1Label: "Consultas hoy",
    stat1Up: "↑ 3 vs. ayer",
    stat2Val: "$820",
    stat2Label: "Ingresos este mes",
    stat2Up: "↑ 18%",
    nextAppts: "Próximas consultas",
    appts: [
      { name: "María Santos", meta: "14:00 · Control", badge: "Confirmado", color: "green" },
      { name: "Carlos Lima", meta: "15:30 · Primera vez", badge: "Receta", color: "orange" },
      { name: "Paula Ferreira", meta: "16:00 · Teleconsulta", badge: "Pagado", color: "blue" },
    ],
    notifTitle: "Pago recibido",
    notifSub: "$64 · João Mendes",
  },
  volunteerBanner: {
    eyebrow: "Atención voluntaria · SOS Venezuela",
    title: "Tu especialidad puede salvar vidas hoy",
    desc: "Profesionales de salud de todo el mundo atienden gratis a víctimas del terremoto en Venezuela. Únete a la fila de tu especialidad, atiende por teleconsulta y marca la diferencia — desde casa.",
    cta: "Quiero ser voluntario",
    link: "Más sobre SOS Venezuela",
    professionsTitle: "Especialidades en atención voluntaria",
  },
  trust: ["Registrado en CFM", "LGPD Compliant", "HIPAA Certified", "Brasil · EE.UU. · Europa", "Cifrado de extremo a extremo", "Prescripciones con validez legal"],
  features: {
    eyebrow: "Funcionalidades",
    title: "Una plataforma.\nSeis herramientas esenciales.",
    sub: "Todo lo que usas hoy en herramientas separadas, ahora integrado y funcionando junto.",
    items: [
      { icon: "calendar", title: "Agenda Inteligente", desc: "Los pacientes agendan solos 24h al día. Tú defines tu disponibilidad y el sistema hace el resto.", details: ["Confirmación automática por email", "Recordatorios para reducir ausencias", "Bloqueo automático tras el pago", "Agenda por tipo de consulta"] },
      { icon: "video", title: "Teleconsulta Integrada", desc: "Videollamada de alta calidad directo en la plataforma. Sin apps externas para ti ni para el paciente.", details: ["Enlace único por consulta", "Funciona en el navegador", "Sala privada con contraseña", "Compatible con móvil"] },
      { icon: "clipboard", title: "Historial Digital", desc: "Historial clínico cifrado, accesible desde cualquier dispositivo. Evolución, adjuntos, exámenes y recetas en un solo lugar.", details: ["Evolución clínica por consulta", "Adjuntar exámenes y documentos", "Búsqueda rápida por paciente", "Compartir de forma segura"] },
      { icon: "pill", title: "Prescripciones Digitales", desc: "Emite recetas con validez legal en PDF, con tu firma y datos profesionales.", details: ["Base de medicamentos integrada", "Recetario simple y controlado", "PDF con datos completos", "El paciente recibe por email"] },
      { icon: "credit", title: "Pagos Automáticos", desc: "Cobra antes de la consulta. Sin morosidad, sin cobranzas manuales. Tarjeta, Pix y PayPal.", details: ["Tarjeta, Pix y PayPal", "Pago obligatorio al agendar", "Extracto e informes mensuales", "Reembolso simplificado"] },
      { icon: "badge", title: "Perfil Profesional Público", desc: "Tu página en doctor8.org/dr/tu-nombre. Comparte con pacientes y deja que agenden directo.", details: ["URL personalizada", "Foto, bio y especialidades", "Reseñas de pacientes", "Botón de agendamiento directo"] },
    ],
  },
  how: {
    eyebrow: "Paso a paso",
    title: "En menos de 10 minutos, ya estás listo para atender",
    sub: "Sin burocracia, sin instalación. Accede desde el navegador, en cualquier dispositivo.",
    steps: [
      { title: "Crea tu cuenta gratis", desc: "Indica nombre, especialidad y matrícula. Sin tarjeta de crédito para empezar." },
      { title: "Completa tu perfil", desc: "Añade foto, bio, valor de consulta y datos para prescripción. Toma 5 minutos." },
      { title: "Configura tu agenda", desc: "Define los horarios en que quieres atender. El sistema empieza a recibir citas automáticamente." },
      { title: "Atiende y cobra", desc: "Consulta por video, completa el historial, emite la receta — todo en la misma pantalla. Pago ya confirmado." },
    ],
    phoneGreeting: "Buenos días,",
    phoneName: "Dra. Fernanda Lima 👋",
    phoneStats: [{ val: "8", lbl: "Hoy" }, { val: "$480", lbl: "Semana" }, { val: "4.9★", lbl: "Valoración" }],
    phoneSection: "Próximos horarios",
    phoneAppts: [{ name: "Roberto Alves", time: "14:00 · Teleconsulta" }, { name: "Sílvia Castro", time: "15:00 · Control" }],
    phoneRxLabel: "Última receta emitida",
    phoneRxName: "Losartán 50mg",
    phoneRxDetail: "Roberto Alves · Ayer, 14:32",
  },
  prescriptions: {
    eyebrow: "Prescripciones Digitales",
    title: "Recetas con validez legal, generadas en segundos",
    desc: "Doctor8 tiene una base completa de medicamentos integrada. Buscas el medicamento, defines la posología — y el sistema genera el PDF con todos los datos exigidos.",
    points: ["Base de medicamentos con etiquetas para controlados", "PDF con datos del paciente, dirección y edad calculada", "Datos completos del médico y clínica en el encabezado", "Disponible en português, inglês y español", "El paciente recibe por email y accede en Mis Recetas", "Recetario especial para sustancias controladas"],
    rxDoc: "Dra. Ana Rodrigues · Matrícula 12345/SP",
    rxMeta: "Cardióloga · Clínica Doctor8 SP",
    rxPatient: "Paciente",
    rxPatientName: "Carlos Eduardo Lima",
    rxPatientDetail: "52 años · C. Flores, 120 · São Paulo / SP",
    rxDrugs: [{ name: "Losartán Potásico 50mg", dose: "1 comprimido al día por la mañana — 30 días" }, { name: "Clonazepam 2mg", dose: "½ comprimido por la noche — 30 días", tag: "Controlado" }],
    rxSig: "PDF con firma digital · Generado el 17/06/2026",
  },
  schedule: {
    eyebrow: "Agenda y Teleconsulta",
    title: "Tu agenda trabaja por ti, incluso cuando no estás",
    desc: "Pacientes en Brasil, EE.UU. y Europa pueden agendar y pagar a cualquier hora. Apareces disponible para quien te necesita.",
    points: ["Agendamiento online 24/7 con pago integrado", "Confirmación automática por email al paciente", "Recordatorios para reducir ausencias hasta un 60%", "Bloqueo automático de horarios ya reservados", "Videollamada sin instalar aplicación", "Sala privada con enlace exclusivo por consulta"],
    weekLabel: "Semana actual — Junio 2026",
    nextLabel: "Próximas 3 consultas",
    msgDoc: "Hola María, tu consulta está confirmada para mañana a las 14h. ¡Enlace de acceso enviado a tu email! ✅",
    msgPat: "Gracias doctora, ya recibí el enlace 😊",
  },
  professions: {
    eyebrow: "Voluntariado",
    title: "Cómo cada especialidad usa Doctor8",
    sub: "Conoce cómo médicos, psicólogos, fisioterapeutas y otros profesionales aprovechan la plataforma — en la prática clínica y en la atención humanitaria.",
    cta: "Ver cómo funciona para tu área",
  },
  pricing: {
    eyebrow: "Planes",
    title: "Transparente. Sin sorpresas.",
    sub: "Empieza gratis. Escala cuando quieras. Cancela cuando quieras.",
    note: "* Precios sujetos a cambio. Facturación mensual, sin permanencia.",
    plans: [
      { badge: "Starter", name: "Gratuito", price: "0", period: "Para empezar y probar", features: [{ text: "Hasta 20 consultas/mes", included: true }, { text: "Teleconsulta integrada", included: true }, { text: "Historial digital", included: true }, { text: "Prescripciones digitales", included: true }, { text: "Pagos automáticos", included: false }, { text: "Perfil público indexado", included: false }, { text: "Soporte prioritario", included: false }], cta: "Empezar gratis" },
      { badge: "🔥 Más popular", name: "Profesional", price: "149", period: "Para quien quiere crecer", featured: true, features: [{ text: "Consultas ilimitadas", included: true }, { text: "Teleconsulta integrada", included: true }, { text: "Historial digital completo", included: true }, { text: "Prescripciones digitales", included: true }, { text: "Pagos automáticos", included: true }, { text: "Perfil público indexado", included: true }, { text: "Soporte prioritario", included: true }], cta: "Suscribirse ahora" },
      { badge: "Clínica", name: "Equipo", price: "399", period: "Para clínicas y grupos", features: [{ text: "Hasta 5 profesionales", included: true }, { text: "Todo del plan Profesional", included: true }, { text: "Panel administrativo", included: true }, { text: "Informes consolidados", included: true }, { text: "Onboarding dedicado", included: true }, { text: "Contrato DPA (LGPD)", included: true }, { text: "Soporte prioritario", included: true }], cta: "Hablar con el equipo", href: "mailto:contato@doctor8.org" },
    ],
  },
  lgpd: {
    title: "Cumplimiento LGPD e HIPAA — porque tus pacientes te confían los datos más sensibles de sus vidas",
    body: "Doctor8 cumple totalmente con la LGPD brasileña y el HIPAA estadounidense. Todos los datos se almacenan con cifrado de extremo a extremo. ¿Preguntas? Contacta a nuestro DPO: dpo@doctor8.org",
  },
  ctaFinal: { title: "¿Listo para", titleEm: "simplificar", sub: "tu prática clínica?", primary: "Regístrate gratis", secondary: "Hablar con el equipo" },
  footer: {
    desc: "Plataforma de telemedicina para profesionales de salud. Registrada en CFM. Conforme LGPD e HIPAA. Atiende Brasil, EE.UU. y Europa.",
    platform: "Plataforma", patients: "Pacientes", legal: "Legal",
    platformLinks: ["Funcionalidades", "Cómo funciona", "Prescripciones", "Agenda", "Planes"],
    patientLinks: ["Club Doctor", "Agendar consulta", "Cannabis Medicinal", "Doctor Energy"],
    legalLinks: ["Política de Privacidad", "Términos de Uso", "LGPD", "DPO"],
    copyright: "© 2026 Doctor8 · INFO8 Desenvolvimento de Sistemas Ltda · CNPJ 20.251.527/0001-04",
    badges: ["LGPD", "HIPAA", "CFM", "SSL 256-bit"],
  },
  cookie: { text: "Utilizamos cookies para mejorar tu experiencia. Al continuar, aceptas nuestra Política de Privacidad y la LGPD.", accept: "Aceptar", decline: "Rechazar" },
  professionPages: {
    medico: { slug: "medico", icon: "stethoscope", title: "Médico general", subtitle: "Consultas, prescripciones e historial en una sola plataforma", heroDesc: "Desde teleconsulta de control hasta renovación de recetas, Doctor8 centraliza todo lo que el médico necesita — incluyendo filas humanitarias para atención gratuita.", useCases: [{ title: "Consulta clínica online", desc: "Atiende pacientes por video con historial integrado, notas SOAP y adjuntos de exámenes en la misma pantalla." }, { title: "Prescripciones con validez legal", desc: "Emite recetas simples y controladas con base integrada, PDF firmado y envío automático al paciente." }, { title: "Agenda con pago anticipado", desc: "Define horarios, valores y tipos de consulta. El paciente agenda y paga antes — sin morosidad." }, { title: "Voluntariado SOS Venezuela", desc: "Únete a la fila médica humanitaria, recibe pacientes triados por urgencia y atiende gratis por teleconsulta." }], platformFeatures: ["Historial clínico completo y búsqueda por paciente", "Base de medicamentos con alertas de controlados", "Perfil público indexado para captar pacientes", "Fila humanitaria con triaje automático de prioridad"], volunteerTitle: "Atiende a víctimas del terremoto como médico voluntario", volunteerDesc: "Los pacientes en Venezuela pasan por triaje rápido y entran en la fila médica. Cuando sea tu turno, recibes la notificación y atiendes por video — con historial y prescripción listos.", ctaPrimary: "Crear cuenta médica", ctaVolunteer: "Voluntariarse en SOS Venezuela" },
    psicologo: { slug: "psicologo", icon: "brain", title: "Psicólogo", subtitle: "Psicoterapia online con conformidad profesional e historial seguro", heroDesc: "Sesiones por video, escalas psicológicas, documentos firmados y agenda automatizada — alineado con estándares de telesalud profesional.", useCases: [{ title: "Psicoterapia por teleconsulta", desc: "Salas privadas por sesión, sin instalar apps. Ideal para seguimiento continuo y primeras consultas." }, { title: "Escalas e instrumentos", desc: "Aplica PHQ-9, GAD-7 y otras escalas con puntuación automática guardada en el historial." }, { title: "Documentos y consentimiento", desc: "TCLE, contrato de prestación de servicios e informes con firma digital integrada." }, { title: "Primeros Auxilios Psicológicos (PAP)", desc: "En el voluntariado SOS Venezuela, atiende pacientes en crisis emocional con fila prioritaria." }], platformFeatures: ["Módulo psicológico con notas de sesión estructuradas", "Conformidad con estándares de telesalud", "Registro de emergencias y derivaciones", "Fila humanitaria con priorización por nivel de crisis"], volunteerTitle: "Ofrece acogida psicológica gratuita", volunteerDesc: "La fila de psicología humanitaria prioriza pacientes en crisis emocional. Atiendes por video con historial seguro y puedes registrar derivaciones cuando sea necesario.", ctaPrimary: "Crear cuenta de psicólogo", ctaVolunteer: "Voluntariarse en SOS Venezuela" },
    psicanalista: { slug: "psicanalista", icon: "sparkles", title: "Psicanalista", subtitle: "Sesiones analíticas online con privacidad y continuidad", heroDesc: "Gestiona analizantes, sesiones regulares y documentación clínica en entorno cifrado — con soporte a voluntariado humanitario.", useCases: [{ title: "Sesiones analíticas remotas", desc: "Salas de video estables para procesos de larga duración, con historial de sesiones por paciente." }, { title: "Gestión de analizantes", desc: "Historial dedicado con evolución clínica, notas de sesión y búsqueda rápida." }, { title: "Agenda flexible", desc: "Configura frecuencia semanal, bloqueos y tipos de sesión (primera vez, control, supervisión)." }, { title: "Escucha humanitaria", desc: "En SOS Venezuela, ofrece escucha psicanalítica a víctimas del terremoto en sufrimiento profundo." }], platformFeatures: ["Cuenta dedicada de psicanalista con perfil especializado", "Historial con sigilo y cifrado de extremo a extremo", "Agenda con recordatorios automáticos", "Fila humanitaria exclusiva para psicanalistas voluntarios"], volunteerTitle: "Escucha analítica para quien más lo necesita", volunteerDesc: "La fila de psicanalistas atiende pacientes que buscan escucha profunda tras el trauma. Regístrate como psicanalista y Únete a la fila voluntaria cuando estás disponible.", ctaPrimary: "Crear cuenta de psicanalista", ctaVolunteer: "Voluntariarse en SOS Venezuela" },
    terapeuta_integrativo: { slug: "terapeuta_integrativo", icon: "leaf", title: "Terapeuta integrativo", subtitle: "Prácticas holísticas y complementarias con historial unificado", heroDesc: "Combina enfoques integrativos — aromaterapia, flores de Bach, mindfulness — con teleconsulta, documentación y agenda profesional en Doctor8.", useCases: [{ title: "Consultas integrativas online", desc: "Atiende pacientes que buscan enfoque holístico con historial que registra protocolos y evolución." }, { title: "Planes terapêuticos", desc: "Documenta recomendaciones, combinaciones y seguimiento en evoluciones estructuradas." }, { title: "Perfil especializado", desc: "Destaca tus líneas de actuación en el perfil público y recibe agendamientos directos." }, { title: "Acogimiento humanitario", desc: "En el voluntariado, ofrece apoyo emocional integrativo a víctimas en refugios y comunidades afectadas." }], platformFeatures: ["Historial flexible para múltiples enfoques terapêuticos", "Teleconsulta estable por navegador", "Documentos y orientaciones enviados al paciente por email", "Fila humanitaria de terapia integrativa"], volunteerTitle: "Cuidado integrativo gratuito para víctimas", volunteerDesc: "Los pacientes en la fila de terapia integrativa buscan acogimiento holístico tras el trauma. Atiende por video con toda la documentación en la plataforma.", ctaPrimary: "Crear cuenta profesional", ctaVolunteer: "Voluntariarse en SOS Venezuela" },
    fisioterapeuta: { slug: "fisioterapeuta", icon: "dumbbell", title: "Fisioterapeuta", subtitle: "Rehabilitación remota con orientación de ejercicios y seguimiento", heroDesc: "Evalúa, orienta y hace seguimiento de pacientes por teleconsulta — ideal para rehabilitación post-trauma, dolores musculares y ejercicios domiciliarios.", useCases: [{ title: "Teleconsulta fisioterapêutica", desc: "Evalúa postura y movimiento por video, registra evolución y adapta protocolos de ejercicios." }, { title: "Orientación de ejercicios", desc: "Envía planes de ejercicios documentados en el historial con seguimiento en controles." }, { title: "Postoperatorio y trauma", desc: "Hace seguimiento de rehabilitación de pacientes con lesiones por escombros o caídas — común en contexto humanitario." }, { title: "Voluntariado post-terremoto", desc: "Atiende víctimas con dolores musculares, limitaciones de movilidad y necesidad de rehabilitación." }], platformFeatures: ["Historial con registro de amplitud, dolor y evolución funcional", "Adjuntos de videos e imágenes de ejercicios", "Agenda por tipo de sesión (evaluación, control, orientación)", "Fila humanitaria de fisioterapia con triaje de movilidad"], volunteerTitle: "Rehabilitación gratuita para víctimas del terremoto", volunteerDesc: "Muchas víctimas tienen dolores musculares y limitaciones de movilidad. Únete a la fila de fisioterapia y atiende con orientaciones práticas por video.", ctaPrimary: "Crear cuenta de fisioterapeuta", ctaVolunteer: "Voluntariarse en SOS Venezuela" },
    nutricionista: { slug: "nutricionista", icon: "utensils", title: "Nutricionista", subtitle: "Consultas nutricionales online con planes alimentarios documentados", heroDesc: "Evalúa hábitos alimentarios, crea planes nutricionales y hace seguimiento de evolución — con teleconsulta integrada e historial completo.", useCases: [{ title: "Consulta nutricional online", desc: "Anamnesis alimentaria, evaluación de necesidades y orientación personalizada por video." }, { title: "Planes alimentarios", desc: "Documenta recomendaciones, restricciones y metas en el historial con evolución." }, { title: "Seguimiento continuo", desc: "Controles programados con recordatorios automáticos para mantener adherencia al tratamiento." }, { title: "Nutrición humanitaria", desc: "En SOS Venezuela, orienta familias en refugios sobre alimentación adecuada con recursos limitados." }], platformFeatures: ["Historial nutricional con antropometría y seguimiento", "Documentos de orientación enviados al paciente", "Agenda por tipo de consulta (primera vez, control, reeducación)", "Fila humanitaria de nutrición"], volunteerTitle: "Orientación nutricional para familias afectadas", volunteerDesc: "Las familias en refugios necesitan orientación sobre alimentación con recursos escasos. Atiende en la fila de nutrición humanitaria.", ctaPrimary: "Crear cuenta de nutricionista", ctaVolunteer: "Voluntariarse en SOS Venezuela" },
    cuidados_paliativos: { slug: "cuidados_paliativos", icon: "heart", title: "Cuidados paliativos", subtitle: "Confort, dignidad y apoyo a pacientes y familias", heroDesc: "Ofrece cuidados paliativos por teleconsulta — manejo de síntomas, apoyo familiar y orientación — con documentación sensible y segura.", useCases: [{ title: "Consultas paliativas remotas", desc: "Evalúa síntomas, ajusta orientaciones y hace seguimiento de pacientes en cuidado domiciliario por video." }, { title: "Apoyo a la familia", desc: "Registra conversaciones con familiares, orientaciones de cuidado y derivaciones en el historial." }, { title: "Manejo de síntomas", desc: "Documenta protocolos de confort y evolución con prescripciones cuando lo indique el médico responsable." }, { title: "Cuidado humanitario", desc: "En SOS Venezuela, ofrece apoyo paliativo a pacientes gravemente afectados y sus familias." }], platformFeatures: ["Historial enfocado en calidad de vida y síntomas", "Teleconsulta para seguimiento familiar", "Documentación sensible con máxima privacidad", "Fila humanitaria de cuidados paliativos"], volunteerTitle: "Dignidad y confort para quien más sufre", volunteerDesc: "La fila de cuidados paliativos atiende pacientes en situación grave y familias en duelo. Tu presencia marca la diferencia — atiende por video con toda la seguridad de la plataforma.", ctaPrimary: "Crear cuenta profesional", ctaVolunteer: "Voluntariarse en SOS Venezuela" },
  },
};

const content: Record<Lang, ProLandingContent> = { pt, en, es };

export function getProLandingContent(lang: Lang): ProLandingContent {
  return content[lang] ?? content.en;
}

export const PROFESSION_SLUGS = Object.keys(pt.professionPages) as HumanitarianPoolSlug[];

export function isValidProfessionSlug(slug: string): slug is HumanitarianPoolSlug {
  return PROFESSION_SLUGS.includes(slug as HumanitarianPoolSlug);
}
