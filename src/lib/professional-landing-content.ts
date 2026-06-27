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
    title: "Doctor8 ? Plataforma para Profissionais de Sa?de",
    description: "Agenda, teleconsulta, prontu?rio, prescri??es digitais e pagamentos ? tudo em um lugar. Para m?dicos e profissionais de sa?de no Brasil, EUA e Europa.",
  },
  nav: {
    features: "Funcionalidades",
    how: "Como funciona",
    prescriptions: "Prescri??es",
    schedule: "Agenda",
    plans: "Planos",
    volunteer: "Voluntariado",
    signIn: "Entrar",
    signUp: "Cadastre-se gr?tis",
  },
  hero: {
    pill: "Para m?dicos e profissionais de sa?de",
    title: "Atenda mais.",
    titleEm: "Administre menos.",
    sub: "Agenda inteligente, prontu?rio digital, prescri??es com validade legal e pagamentos autom?ticos ? tudo integrado numa ?nica plataforma. Funciona no Brasil, nos EUA e na Europa.",
    ctaPrimary: "Come?ar gratuitamente",
    ctaSecondary: "Ver como funciona",
    proof: ["Registrado no CFM", "LGPD & HIPAA", "Brasil ? EUA ? Europa", "Sem contrato de fidelidade"],
    dashTitle: "Dashboard ? Dra. Ana Rodrigues",
    stat1Val: "12",
    stat1Label: "Consultas hoje",
    stat1Up: "? 3 vs. ontem",
    stat2Val: "R$4.1k",
    stat2Label: "Receita este m?s",
    stat2Up: "? 18%",
    nextAppts: "Pr?ximas consultas",
    appts: [
      { name: "Maria Santos", meta: "14:00 ? Retorno", badge: "Confirmado", color: "green" },
      { name: "Carlos Lima", meta: "15:30 ? 1? consulta", badge: "Receita", color: "orange" },
      { name: "Paula Ferreira", meta: "16:00 ? Teleconsulta", badge: "Pago", color: "blue" },
    ],
    notifTitle: "Pagamento recebido",
    notifSub: "R$ 320 ? Jo?o Mendes",
  },
  volunteerBanner: {
    eyebrow: "Atendimento volunt?rio ? SOS Venezuela",
    title: "Sua especialidade pode salvar vidas hoje",
    desc: "Profissionais de sa?de do mundo inteiro est?o atendendo gratuitamente v?timas do terremoto na Venezuela. Entre na fila da sua especialidade, atenda por teleconsulta e fa?a a diferen?a ? sem sair de casa.",
    cta: "Quero ser volunt?rio",
    link: "Saiba mais sobre o SOS Venezuela",
    professionsTitle: "Especialidades no atendimento volunt?rio",
  },
  trust: [
    "Registrado no CFM",
    "LGPD Compliant",
    "HIPAA Certified",
    "Brasil ? EUA ? Europa",
    "Criptografia de ponta a ponta",
    "Prescri??es com validade legal",
  ],
  features: {
    eyebrow: "Funcionalidades",
    title: "Uma plataforma.\nSeis ferramentas essenciais.",
    sub: "Tudo que voc? usa hoje em ferramentas separadas, agora integrado e funcionando junto.",
    items: [
      {
        icon: "calendar",
        title: "Agenda Inteligente",
        desc: "Pacientes agendam sozinhos 24h por dia. Voc? define sua disponibilidade, e o sistema cuida do resto.",
        details: ["Confirma??o autom?tica por e-mail", "Lembretes para reduzir faltas", "Bloqueio autom?tico ap?s pagamento", "Agenda por tipo de consulta"],
      },
      {
        icon: "video",
        title: "Teleconsulta Integrada",
        desc: "Videochamada de alta qualidade direto na plataforma. Nenhum app externo necess?rio para voc? ou para o paciente.",
        details: ["Link ?nico por consulta", "Funciona direto pelo navegador", "Sala privada com senha", "Compat?vel com mobile"],
      },
      {
        icon: "clipboard",
        title: "Prontu?rio Digital",
        desc: "Hist?rico cl?nico criptografado, acess?vel de qualquer dispositivo. Evolu??o, anexos, exames e receitas num s? lugar.",
        details: ["Evolu??o cl?nica por consulta", "Anexar exames e documentos", "Busca r?pida por paciente", "Compartilhamento seguro"],
      },
      {
        icon: "pill",
        title: "Prescri??es Digitais",
        desc: "Emita receitas com validade legal em PDF, com sua assinatura e dados do CFM. Banco de medicamentos integrado.",
        details: ["Base Anvisa de medicamentos", "Receitu?rio simples e controlado", "PDF com dados completos do CFM", "Paciente recebe por e-mail"],
      },
      {
        icon: "credit",
        title: "Pagamentos Autom?ticos",
        desc: "Receba antes da consulta. Sem inadimpl?ncia, sem cobran?as manuais. Suporte a cart?o, Pix e PayPal.",
        details: ["Cart?o, Pix e PayPal", "Pagamento obrigat?rio no agendamento", "Extrato e relat?rios mensais", "Reembolso simplificado"],
      },
      {
        icon: "badge",
        title: "Perfil Profissional P?blico",
        desc: "Sua p?gina em doctor8.org/dr/seu-nome. Compartilhe com pacientes e deixe-os agendar direto pelo link.",
        details: ["URL personalizada", "Foto, bio e especialidades", "Avalia??es de pacientes", "Bot?o de agendamento direto"],
      },
    ],
  },
  how: {
    eyebrow: "Passo a passo",
    title: "Em menos de 10 minutos, voc? j? est? pronto para atender",
    sub: "Sem burocracia, sem instala??o. Acessa pelo navegador, de qualquer dispositivo.",
    steps: [
      { title: "Crie sua conta gr?tis", desc: "Informe nome, especialidade e CRM/CRP. Sem cart?o de cr?dito necess?rio para come?ar." },
      { title: "Complete seu perfil", desc: "Adicione foto, bio, valor da consulta e dados para prescri??o. Leva 5 minutos." },
      { title: "Configure sua agenda", desc: "Defina os hor?rios que voc? quer atender. O sistema come?a a receber agendamentos automaticamente." },
      { title: "Atenda e receba", desc: "Consulte por v?deo, preencha o prontu?rio, emita a receita ? tudo na mesma tela. Pagamento j? confirmado." },
    ],
    phoneGreeting: "Bom dia,",
    phoneName: "Dra. Fernanda Lima ??",
    phoneStats: [
      { val: "8", lbl: "Hoje" },
      { val: "R$2.4k", lbl: "Semana" },
      { val: "4.9?", lbl: "Avalia??o" },
    ],
    phoneSection: "Pr?ximos hor?rios",
    phoneAppts: [
      { name: "Roberto Alves", time: "14:00 ? Teleconsulta" },
      { name: "S?lvia Castro", time: "15:00 ? Retorno" },
    ],
    phoneRxLabel: "?ltima receita emitida",
    phoneRxName: "Losartana 50mg",
    phoneRxDetail: "Roberto Alves ? Ontem, 14:32",
  },
  prescriptions: {
    eyebrow: "Prescri??es Digitais",
    title: "Receitas com validade legal, geradas em segundos",
    desc: "A Doctor8 tem uma base completa de medicamentos da Anvisa integrada. Voc? busca o medicamento, define a posologia ? e o sistema gera o PDF com todos os dados exigidos pelo CFM.",
    points: [
      "Base de medicamentos Anvisa com tags para controlados",
      "PDF com dados do paciente, endere?o e idade calculada",
      "Dados completos do m?dico e cl?nica no cabe?alho",
      "Dispon?vel em portugu?s, ingl?s e espanhol",
      "Paciente recebe por e-mail e acessa em Minhas Receitas",
      "Receitu?rio especial para subst?ncias controladas",
    ],
    rxDoc: "Dra. Ana Rodrigues ? CRM 12345/SP",
    rxMeta: "Cardiologista ? Cl?nica Doctor8 SP",
    rxPatient: "Paciente",
    rxPatientName: "Carlos Eduardo Lima",
    rxPatientDetail: "52 anos ? R. das Flores, 120 ? S?o Paulo / SP",
    rxDrugs: [
      { name: "Losartana Pot?ssica 50mg", dose: "1 comprimido ao dia pela manh? ? 30 dias" },
      { name: "Clonazepam 2mg", dose: "? comprimido ? noite ? 30 dias", tag: "Controlado" },
    ],
    rxSig: "PDF com assinatura digital ? Gerado em 17/06/2026",
  },
  schedule: {
    eyebrow: "Agenda & Teleconsulta",
    title: "Sua agenda trabalha por voc?, mesmo quando voc? n?o est?",
    desc: "Pacientes no Brasil, nos EUA e na Europa podem agendar e pagar a qualquer hora. Voc? aparece dispon?vel para quem precisa de voc?.",
    points: [
      "Agendamento online 24/7 com pagamento integrado",
      "Confirma??o autom?tica por e-mail para o paciente",
      "Lembretes para reduzir faltas em at? 60%",
      "Bloqueio autom?tico de hor?rios j? agendados",
      "Videochamada sem instala??o de aplicativo",
      "Sala privada com link exclusivo por consulta",
    ],
    weekLabel: "Semana atual ? Junho 2026",
    nextLabel: "Pr?ximas 3 consultas",
    msgDoc: "Ol? Maria, sua consulta est? confirmada para amanh? ?s 14h. Link de acesso enviado para o seu e-mail! ?",
    msgPat: "Obrigada doutora, j? recebi o link ??",
  },
  professions: {
    eyebrow: "Voluntariado",
    title: "Como cada especialidade usa a Doctor8",
    sub: "Conhe?a como m?dicos, psic?logos, fisioterapeutas e outros profissionais aproveitam a plataforma ? na pr?tica cl?nica e no atendimento humanit?rio.",
    cta: "Ver como funciona para sua ?rea",
  },
  pricing: {
    eyebrow: "Planos",
    title: "Transparente. Sem surpresas.",
    sub: "Comece gr?tis. Escale quando quiser. Cancele quando quiser.",
    note: "* Pre?os sujeitos a altera??o. Planos com cobran?a mensal, sem fidelidade.",
    plans: [
      {
        badge: "Starter",
        name: "Gratuito",
        price: "0",
        period: "Para come?ar e testar",
        features: [
          { text: "At? 20 consultas/m?s", included: true },
          { text: "Teleconsulta integrada", included: true },
          { text: "Prontu?rio digital", included: true },
          { text: "Prescri??es digitais", included: true },
          { text: "Pagamentos autom?ticos", included: false },
          { text: "Perfil p?blico indexado", included: false },
          { text: "Suporte priorit?rio", included: false },
        ],
        cta: "Come?ar gr?tis",
      },
      {
        badge: "?? Mais popular",
        name: "Profissional",
        price: "149",
        period: "Para quem quer crescer",
        featured: true,
        features: [
          { text: "Consultas ilimitadas", included: true },
          { text: "Teleconsulta integrada", included: true },
          { text: "Prontu?rio digital completo", included: true },
          { text: "Prescri??es digitais", included: true },
          { text: "Pagamentos autom?ticos", included: true },
          { text: "Perfil p?blico indexado", included: true },
          { text: "Suporte priorit?rio", included: true },
        ],
        cta: "Assinar agora",
      },
      {
        badge: "Cl?nica",
        name: "Equipe",
        price: "399",
        period: "Para cl?nicas e grupos",
        features: [
          { text: "At? 5 profissionais", included: true },
          { text: "Tudo do plano Profissional", included: true },
          { text: "Painel administrativo", included: true },
          { text: "Relat?rios consolidados", included: true },
          { text: "Onboarding dedicado", included: true },
          { text: "Contrato de DPA (LGPD)", included: true },
          { text: "Suporte priorit?rio", included: true },
        ],
        cta: "Falar com a equipe",
        href: "mailto:contato@doctor8.org",
      },
    ],
  },
  lgpd: {
    title: "Conformidade com LGPD e HIPAA ? porque seus pacientes confiam a voc? os dados mais sens?veis da vida deles",
    body: "A Doctor8 est? em total conformidade com a Lei Geral de Prote??o de Dados (LGPD) e com o HIPAA americano. Todos os dados s?o armazenados com criptografia de ponta a ponta. Quest?es? Fale com nosso DPO: dpo@doctor8.org",
  },
  ctaFinal: {
    title: "Pronto para",
    titleEm: "simplificar",
    sub: "sua pr?tica cl?nica?",
    primary: "Cadastre-se gratuitamente",
    secondary: "Falar com a equipe",
  },
  footer: {
    desc: "Plataforma de telemedicina para profissionais de sa?de. Registrada no CFM. Conforme LGPD e HIPAA. Atende Brasil, EUA e Europa.",
    platform: "Plataforma",
    patients: "Pacientes",
    legal: "Legal",
    platformLinks: ["Funcionalidades", "Como funciona", "Prescri??es", "Agenda", "Planos"],
    patientLinks: ["Club Doctor", "Agendar consulta", "Cannabis Medicinal", "Doctor Energy"],
    legalLinks: ["Pol?tica de Privacidade", "Termos de Uso", "LGPD", "DPO"],
    copyright: "? 2026 Doctor8 ? INFO8 Desenvolvimento de Sistemas Ltda ? CNPJ 20.251.527/0001-04",
    badges: ["LGPD", "HIPAA", "CFM", "SSL 256-bit"],
  },
  cookie: {
    text: "Utilizamos cookies para melhorar sua experi?ncia. Ao continuar, voc? concorda com nossa Pol?tica de Privacidade e com a LGPD.",
    accept: "Aceitar",
    decline: "Recusar",
  },
  professionPages: {
    medico: {
      slug: "medico",
      icon: "stethoscope",
      title: "M?dico cl?nico",
      subtitle: "Consultas, prescri??es e prontu?rio em uma ?nica plataforma",
      heroDesc: "Da teleconsulta de retorno ? renova??o de receitas, a Doctor8 centraliza tudo o que o m?dico precisa ? incluindo filas humanit?rias para atendimento gratuito.",
      useCases: [
        { title: "Consulta cl?nica online", desc: "Atenda pacientes por v?deo com prontu?rio integrado, evolu??o SOAP e anexos de exames na mesma tela." },
        { title: "Prescri??es com validade legal", desc: "Emita receitas simples e controladas com base Anvisa, PDF assinado e envio autom?tico ao paciente." },
        { title: "Agenda com pagamento antecipado", desc: "Defina hor?rios, valores e tipos de consulta. O paciente agenda e paga antes ? sem inadimpl?ncia." },
        { title: "Voluntariado SOS Venezuela", desc: "Entre na fila m?dica humanit?ria, receba pacientes triados por urg?ncia e atenda gratuitamente por teleconsulta." },
      ],
      platformFeatures: [
        "Prontu?rio com hist?rico completo e busca por paciente",
        "Base de medicamentos Anvisa com alertas de controlados",
        "Perfil p?blico indexado para captar novos pacientes",
        "Fila humanit?ria com triagem autom?tica de prioridade",
      ],
      volunteerTitle: "Atenda v?timas do terremoto como m?dico volunt?rio",
      volunteerDesc: "Pacientes na Venezuela passam por triagem r?pida e entram na fila m?dica. Quando for sua vez, voc? recebe a notifica??o e atende por v?deo ? com prontu?rio e prescri??o prontos.",
      ctaPrimary: "Criar conta m?dica",
      ctaVolunteer: "Voluntariar-se no SOS Venezuela",
    },
    psicologo: {
      slug: "psicologo",
      icon: "brain",
      title: "Psic?logo",
      subtitle: "Psicoterapia online com conformidade CFP e prontu?rio seguro",
      heroDesc: "Sess?es por v?deo, escalas psicol?gicas, documentos assinados e agenda automatizada ? tudo alinhado ? Resolu??o CFP 09/2024 para TDICs.",
      useCases: [
        { title: "Psicoterapia por teleconsulta", desc: "Salas privadas por sess?o, sem instalar apps. Ideal para acompanhamento cont?nuo e primeiras consultas." },
        { title: "Escalas e instrumentos", desc: "Aplique PHQ-9, GAD-7 e outras escalas com pontua??o autom?tica salva no prontu?rio do paciente." },
        { title: "Documentos e termos", desc: "TCLE, contrato de presta??o de servi?os e relat?rios com assinatura digital integrada." },
        { title: "Primeiros Socorros Psicol?gicos (PFA)", desc: "No voluntariado SOS Venezuela, atenda pacientes em crise emocional com fila priorit?ria para urg?ncias." },
      ],
      platformFeatures: [
        "M?dulo psicol?gico com notas de sess?o estruturadas",
        "Conformidade com Resolu??o CFP 09/2024 (TDICs)",
        "Registro de emerg?ncias e encaminhamentos",
        "Fila humanit?ria com prioriza??o por n?vel de crise",
      ],
      volunteerTitle: "Ofere?a acolhimento psicol?gico gratuito",
      volunteerDesc: "A fila de psicologia humanit?ria prioriza pacientes em crise emocional. Voc? atende por v?deo com prontu?rio seguro e pode registrar encaminhamentos quando necess?rio.",
      ctaPrimary: "Criar conta de psic?logo",
      ctaVolunteer: "Voluntariar-se no SOS Venezuela",
    },
    psicanalista: {
      slug: "psicanalista",
      icon: "sparkles",
      title: "Psicanalista",
      subtitle: "Sess?es anal?ticas online com privacidade e continuidade",
      heroDesc: "Gerencie analisandos, sess?es regulares e documenta??o cl?nica em ambiente criptografado ? com suporte a voluntariado humanit?rio.",
      useCases: [
        { title: "Sess?es anal?ticas remotas", desc: "Salas de v?deo est?veis para processos de longa dura??o, com hist?rico de sess?es por paciente." },
        { title: "Gest?o de analisandos", desc: "Prontu?rio dedicado com evolu??o cl?nica, anota??es de sess?o e busca r?pida." },
        { title: "Agenda flex?vel", desc: "Configure frequ?ncia semanal, bloqueios e tipos de sess?o (primeira vez, retorno, supervis?o)." },
        { title: "Escuta humanit?ria", desc: "No SOS Venezuela, ofere?a escuta psicanal?tica a v?timas do terremoto em sofrimento profundo." },
      ],
      platformFeatures: [
        "Conta dedicada de psicanalista com perfil especializado",
        "Prontu?rio com sigilo e criptografia de ponta a ponta",
        "Agenda com lembretes autom?ticos para reduzir faltas",
        "Fila humanit?ria exclusiva para psicanalistas volunt?rios",
      ],
      volunteerTitle: "Escuta anal?tica para quem mais precisa",
      volunteerDesc: "A fila de psicanalistas atende pacientes que buscam escuta profunda ap?s trauma. Cadastre-se como psicanalista e entre na fila volunt?ria quando estiver dispon?vel.",
      ctaPrimary: "Criar conta de psicanalista",
      ctaVolunteer: "Voluntariar-se no SOS Venezuela",
    },
    terapeuta_integrativo: {
      slug: "terapeuta_integrativo",
      icon: "leaf",
      title: "Terapeuta integrativo",
      subtitle: "Pr?ticas hol?sticas e complementares com prontu?rio unificado",
      heroDesc: "Combine abordagens integrativas ? aromaterapia, florais, mindfulness ? com teleconsulta, documenta??o e agenda profissional na Doctor8.",
      useCases: [
        { title: "Consultas integrativas online", desc: "Atenda pacientes que buscam abordagem hol?stica com prontu?rio que registra protocolos e evolu??o." },
        { title: "Planos terap?uticos", desc: "Documente recomenda??es, combina??es e acompanhamento em evolu??es estruturadas." },
        { title: "Perfil especializado", desc: "Destaque suas linhas de atua??o no perfil p?blico e receba agendamentos diretos." },
        { title: "Acolhimento humanit?rio", desc: "No voluntariado, ofere?a suporte emocional integrativo a v?timas em abrigos e comunidades afetadas." },
      ],
      platformFeatures: [
        "Prontu?rio flex?vel para m?ltiplas abordagens terap?uticas",
        "Teleconsulta est?vel pelo navegador",
        "Documentos e orienta??es enviados ao paciente por e-mail",
        "Fila humanit?ria de terapia integrativa",
      ],
      volunteerTitle: "Cuidado integrativo gratuito para v?timas",
      volunteerDesc: "Pacientes na fila de terapia integrativa buscam acolhimento hol?stico ap?s o trauma. Atenda por v?deo com toda a documenta??o na plataforma.",
      ctaPrimary: "Criar conta profissional",
      ctaVolunteer: "Voluntariar-se no SOS Venezuela",
    },
    fisioterapeuta: {
      slug: "fisioterapeuta",
      icon: "dumbbell",
      title: "Fisioterapeuta",
      subtitle: "Reabilita??o remota com orienta??o de exerc?cios e acompanhamento",
      heroDesc: "Avalie, oriente e acompanhe pacientes por teleconsulta ? ideal para reabilita??o p?s-trauma, dores musculares e exerc?cios domiciliares.",
      useCases: [
        { title: "Teleconsulta fisioterap?utica", desc: "Avalie postura e movimento por v?deo, registre evolu??o e adapte protocolos de exerc?cios." },
        { title: "Orienta??o de exerc?cios", desc: "Envie planos de exerc?cios documentados no prontu?rio com acompanhamento em retornos." },
        { title: "P?s-operat?rio e trauma", desc: "Acompanhe reabilita??o de pacientes com les?es por escombros ou quedas ? comum no contexto humanit?rio." },
        { title: "Voluntariado p?s-terremoto", desc: "Atenda v?timas com dores musculares, limita??es de mobilidade e necessidade de reabilita??o." },
      ],
      platformFeatures: [
        "Prontu?rio com registro de amplitude, dor e evolu??o funcional",
        "Anexos de v?deos e imagens de exerc?cios",
        "Agenda por tipo de sess?o (avalia??o, retorno, orienta??o)",
        "Fila humanit?ria de fisioterapia com triagem de mobilidade",
      ],
      volunteerTitle: "Reabilita??o gratuita para v?timas do terremoto",
      volunteerDesc: "Muitas v?timas t?m dores musculares e limita??es de mobilidade. Entre na fila de fisioterapia e atenda com orienta??es pr?ticas por v?deo.",
      ctaPrimary: "Criar conta de fisioterapeuta",
      ctaVolunteer: "Voluntariar-se no SOS Venezuela",
    },
    nutricionista: {
      slug: "nutricionista",
      icon: "utensils",
      title: "Nutricionista",
      subtitle: "Consultas nutricionais online com planos alimentares documentados",
      heroDesc: "Avalie h?bitos alimentares, crie planos nutricionais e acompanhe evolu??o ? com teleconsulta integrada e prontu?rio completo.",
      useCases: [
        { title: "Consulta nutricional online", desc: "Anamnese alimentar, avalia??o de necessidades e orienta??o personalizada por v?deo." },
        { title: "Planos alimentares", desc: "Documente recomenda??es, restri??es e metas no prontu?rio com hist?rico de evolu??o." },
        { title: "Acompanhamento cont?nuo", desc: "Retornos programados com lembretes autom?ticos para manter ades?o ao tratamento." },
        { title: "Nutri??o humanit?ria", desc: "No SOS Venezuela, oriente fam?lias em abrigos sobre alimenta??o adequada com recursos limitados." },
      ],
      platformFeatures: [
        "Prontu?rio nutricional com antropometria e hist?rico",
        "Documentos de orienta??o enviados ao paciente",
        "Agenda com tipos de consulta (primeira vez, retorno, reeduca??o)",
        "Fila humanit?ria de nutri??o",
      ],
      volunteerTitle: "Orienta??o nutricional para fam?lias afetadas",
      volunteerDesc: "Fam?lias em abrigos precisam de orienta??o sobre alimenta??o com recursos escassos. Atenda na fila de nutri??o humanit?ria.",
      ctaPrimary: "Criar conta de nutricionista",
      ctaVolunteer: "Voluntariar-se no SOS Venezuela",
    },
    cuidados_paliativos: {
      slug: "cuidados_paliativos",
      icon: "heart",
      title: "Cuidados paliativos",
      subtitle: "Conforto, dignidade e suporte a pacientes e fam?lias",
      heroDesc: "Ofere?a cuidados paliativos por teleconsulta ? manejo de sintomas, suporte familiar e orienta??o ? com documenta??o sens?vel e segura.",
      useCases: [
        { title: "Consultas paliativas remotas", desc: "Avalie sintomas, ajuste orienta??es e acompanhe pacientes em cuidado domiciliar por v?deo." },
        { title: "Suporte ? fam?lia", desc: "Registre conversas com familiares, orienta??es de cuidado e encaminhamentos no prontu?rio." },
        { title: "Manejo de sintomas", desc: "Documente protocolos de conforto e evolu??o com prescri??es quando indicado pelo m?dico respons?vel." },
        { title: "Cuidado humanit?rio", desc: "No SOS Venezuela, ofere?a suporte paliativo a pacientes gravemente afetados e suas fam?lias." },
      ],
      platformFeatures: [
        "Prontu?rio com foco em qualidade de vida e sintomas",
        "Teleconsulta para acompanhamento familiar",
        "Documenta??o sens?vel com m?xima privacidade",
        "Fila humanit?ria de cuidados paliativos",
      ],
      volunteerTitle: "Dignidade e conforto para quem mais sofre",
      volunteerDesc: "A fila de cuidados paliativos atende pacientes em situa??o grave e fam?lias enlutadas. Sua presen?a faz diferen?a ? atenda por v?deo com toda a seguran?a da plataforma.",
      ctaPrimary: "Criar conta profissional",
      ctaVolunteer: "Voluntariar-se no SOS Venezuela",
    },
  },
};

// English ? abbreviated structure reuse via mapping for profession pages
const en: ProLandingContent = {
  meta: {
    title: "Doctor8 ? Healthcare Professional Platform",
    description: "Scheduling, telehealth, medical records, digital prescriptions and payments ? all in one place. For physicians and health professionals in Brazil, USA and Europe.",
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
    sub: "Smart scheduling, digital records, legally valid prescriptions and automatic payments ? all integrated in one platform. Works in Brazil, the USA and Europe.",
    ctaPrimary: "Start for free",
    ctaSecondary: "See how it works",
    proof: ["CFM registered", "LGPD & HIPAA", "Brazil ? USA ? Europe", "No lock-in contract"],
    dashTitle: "Dashboard ? Dr. Ana Rodrigues",
    stat1Val: "12",
    stat1Label: "Appointments today",
    stat1Up: "? 3 vs. yesterday",
    stat2Val: "$820",
    stat2Label: "Revenue this month",
    stat2Up: "? 18%",
    nextAppts: "Upcoming appointments",
    appts: [
      { name: "Maria Santos", meta: "2:00 PM ? Follow-up", badge: "Confirmed", color: "green" },
      { name: "Carlos Lima", meta: "3:30 PM ? First visit", badge: "Rx", color: "orange" },
      { name: "Paula Ferreira", meta: "4:00 PM ? Telehealth", badge: "Paid", color: "blue" },
    ],
    notifTitle: "Payment received",
    notifSub: "$64 ? Jo?o Mendes",
  },
  volunteerBanner: {
    eyebrow: "Volunteer care ? SOS Venezuela",
    title: "Your specialty can save lives today",
    desc: "Health professionals worldwide are providing free care to earthquake victims in Venezuela. Join your specialty queue, see patients by telehealth and make a difference ? from home.",
    cta: "I want to volunteer",
    link: "Learn more about SOS Venezuela",
    professionsTitle: "Specialties in volunteer care",
  },
  trust: ["CFM registered", "LGPD Compliant", "HIPAA Certified", "Brazil ? USA ? Europe", "End-to-end encryption", "Legally valid prescriptions"],
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
      { title: "See patients and get paid", desc: "Video visit, fill the chart, issue prescriptions ? all on one screen. Payment already confirmed." },
    ],
    phoneGreeting: "Good morning,",
    phoneName: "Dr. Fernanda Lima ??",
    phoneStats: [{ val: "8", lbl: "Today" }, { val: "$480", lbl: "Week" }, { val: "4.9?", lbl: "Rating" }],
    phoneSection: "Upcoming slots",
    phoneAppts: [{ name: "Roberto Alves", time: "2:00 PM ? Telehealth" }, { name: "S?lvia Castro", time: "3:00 PM ? Follow-up" }],
    phoneRxLabel: "Last prescription issued",
    phoneRxName: "Losartan 50mg",
    phoneRxDetail: "Roberto Alves ? Yesterday, 2:32 PM",
  },
  prescriptions: {
    eyebrow: "Digital Prescriptions",
    title: "Legally valid prescriptions in seconds",
    desc: "Doctor8 has a complete integrated drug database. Search the medication, set the dosage ? and the system generates a PDF with all required professional data.",
    points: ["Drug database with controlled substance tags", "PDF with patient data, address and calculated age", "Full physician and clinic data in header", "Available in Portuguese, English and Spanish", "Patient receives by email and accesses in My Prescriptions", "Special form for controlled substances"],
    rxDoc: "Dr. Ana Rodrigues ? License 12345/SP",
    rxMeta: "Cardiologist ? Doctor8 Clinic SP",
    rxPatient: "Patient",
    rxPatientName: "Carlos Eduardo Lima",
    rxPatientDetail: "52 years ? 120 Flower St ? S?o Paulo / SP",
    rxDrugs: [{ name: "Losartan Potassium 50mg", dose: "1 tablet daily in the morning ? 30 days" }, { name: "Clonazepam 2mg", dose: "? tablet at night ? 30 days", tag: "Controlled" }],
    rxSig: "PDF with digital signature ? Generated Jun 17, 2026",
  },
  schedule: {
    eyebrow: "Schedule & Telehealth",
    title: "Your schedule works for you, even when you're not",
    desc: "Patients in Brazil, the USA and Europe can book and pay anytime. You appear available to those who need you.",
    points: ["24/7 online booking with integrated payment", "Automatic email confirmation for patients", "Reminders to reduce no-shows by up to 60%", "Automatic blocking of booked slots", "Video calls without app installation", "Private room with exclusive link per visit"],
    weekLabel: "Current week ? June 2026",
    nextLabel: "Next 3 appointments",
    msgDoc: "Hi Maria, your appointment is confirmed for tomorrow at 2 PM. Access link sent to your email! ?",
    msgPat: "Thank you doctor, I received the link ??",
  },
  professions: {
    eyebrow: "Volunteer care",
    title: "How each specialty uses Doctor8",
    sub: "See how physicians, psychologists, physiotherapists and other professionals use the platform ? in clinical practice and humanitarian care.",
    cta: "See how it works for your field",
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Transparent. No surprises.",
    sub: "Start free. Scale when you want. Cancel anytime.",
    note: "* Prices subject to change. Monthly billing, no lock-in.",
    plans: [
      { badge: "Starter", name: "Free", price: "0", period: "To start and test", features: [{ text: "Up to 20 visits/month", included: true }, { text: "Integrated telehealth", included: true }, { text: "Digital records", included: true }, { text: "Digital prescriptions", included: true }, { text: "Automatic payments", included: false }, { text: "Indexed public profile", included: false }, { text: "Priority support", included: false }], cta: "Start free" },
      { badge: "?? Most popular", name: "Professional", price: "149", period: "For growing practices", featured: true, features: [{ text: "Unlimited visits", included: true }, { text: "Integrated telehealth", included: true }, { text: "Full digital records", included: true }, { text: "Digital prescriptions", included: true }, { text: "Automatic payments", included: true }, { text: "Indexed public profile", included: true }, { text: "Priority support", included: true }], cta: "Subscribe now" },
      { badge: "Clinic", name: "Team", price: "399", period: "For clinics and groups", features: [{ text: "Up to 5 professionals", included: true }, { text: "Everything in Professional", included: true }, { text: "Admin dashboard", included: true }, { text: "Consolidated reports", included: true }, { text: "Dedicated onboarding", included: true }, { text: "DPA contract (LGPD)", included: true }, { text: "Priority support", included: true }], cta: "Talk to our team", href: "mailto:contato@doctor8.org" },
    ],
  },
  lgpd: {
    title: "LGPD and HIPAA compliance ? because your patients trust you with the most sensitive data of their lives",
    body: "Doctor8 is fully compliant with Brazil's LGPD and US HIPAA. All data is stored with end-to-end encryption. Questions? Contact our DPO: dpo@doctor8.org",
  },
  ctaFinal: { title: "Ready to", titleEm: "simplify", sub: "your clinical practice?", primary: "Sign up for free", secondary: "Talk to our team" },
  footer: {
    desc: "Telehealth platform for health professionals. CFM registered. LGPD and HIPAA compliant. Serves Brazil, USA and Europe.",
    platform: "Platform", patients: "Patients", legal: "Legal",
    platformLinks: ["Features", "How it works", "Prescriptions", "Schedule", "Pricing"],
    patientLinks: ["Club Doctor", "Book appointment", "Medical Cannabis", "Doctor Energy"],
    legalLinks: ["Privacy Policy", "Terms of Use", "LGPD", "DPO"],
    copyright: "? 2026 Doctor8 ? INFO8 Desenvolvimento de Sistemas Ltda ? CNPJ 20.251.527/0001-04",
    badges: ["LGPD", "HIPAA", "CFM", "SSL 256-bit"],
  },
  cookie: { text: "We use cookies to improve your experience. By continuing, you agree to our Privacy Policy and LGPD.", accept: "Accept", decline: "Decline" },
  professionPages: {
    medico: { slug: "medico", icon: "stethoscope", title: "General physician", subtitle: "Visits, prescriptions and records in one platform", heroDesc: "From follow-up telehealth to prescription renewals, Doctor8 centralizes everything physicians need ? including humanitarian queues for free care.", useCases: [{ title: "Online clinical visits", desc: "See patients by video with integrated chart, SOAP notes and exam attachments on one screen." }, { title: "Legally valid prescriptions", desc: "Issue simple and controlled prescriptions with integrated database, signed PDF and automatic delivery." }, { title: "Schedule with upfront payment", desc: "Set hours, fees and visit types. Patients book and pay in advance ? no defaults." }, { title: "SOS Venezuela volunteering", desc: "Join the humanitarian medical queue, receive triaged patients and provide free telehealth." }], platformFeatures: ["Chart with full history and patient search", "Drug database with controlled substance alerts", "Indexed public profile to attract patients", "Humanitarian queue with automatic priority triage"], volunteerTitle: "Care for earthquake victims as a volunteer physician", volunteerDesc: "Patients in Venezuela complete quick triage and join the medical queue. When it's your turn, you get notified and see them by video ? with chart and prescriptions ready.", ctaPrimary: "Create physician account", ctaVolunteer: "Volunteer for SOS Venezuela" },
    psicologo: { slug: "psicologo", icon: "brain", title: "Psychologist", subtitle: "Online therapy with CFP compliance and secure records", heroDesc: "Video sessions, psychological scales, signed documents and automated scheduling ? aligned with professional telehealth standards.", useCases: [{ title: "Telehealth psychotherapy", desc: "Private rooms per session, no apps to install. Ideal for ongoing care and first visits." }, { title: "Scales and instruments", desc: "Apply PHQ-9, GAD-7 and other scales with automatic scoring saved to the patient chart." }, { title: "Documents and consent", desc: "Consent forms, service agreements and reports with integrated digital signature." }, { title: "Psychological First Aid (PFA)", desc: "In SOS Venezuela volunteering, see patients in emotional crisis with priority crisis queue." }], platformFeatures: ["Psychology module with structured session notes", "Compliance with telehealth professional standards", "Emergency and referral documentation", "Humanitarian queue with crisis-level prioritization"], volunteerTitle: "Offer free psychological support", volunteerDesc: "The humanitarian psychology queue prioritizes patients in emotional crisis. You see them by video with secure records and can document referrals when needed.", ctaPrimary: "Create psychologist account", ctaVolunteer: "Volunteer for SOS Venezuela" },
    psicanalista: { slug: "psicanalista", icon: "sparkles", title: "Psychoanalyst", subtitle: "Online analytic sessions with privacy and continuity", heroDesc: "Manage analysands, regular sessions and clinical documentation in an encrypted environment ? with humanitarian volunteering support.", useCases: [{ title: "Remote analytic sessions", desc: "Stable video rooms for long-term processes with session history per patient." }, { title: "Analysand management", desc: "Dedicated chart with clinical evolution, session notes and quick search." }, { title: "Flexible schedule", desc: "Configure weekly frequency, blocks and session types (first visit, return, supervision)." }, { title: "Humanitarian listening", desc: "In SOS Venezuela, offer psychoanalytic listening to earthquake victims in deep suffering." }], platformFeatures: ["Dedicated psychoanalyst account with specialized profile", "Chart with confidentiality and end-to-end encryption", "Schedule with automatic reminders to reduce no-shows", "Exclusive humanitarian queue for volunteer psychoanalysts"], volunteerTitle: "Analytic listening for those who need it most", volunteerDesc: "The psychoanalyst queue serves patients seeking deep listening after trauma. Sign up as a psychoanalyst and join the volunteer queue when available.", ctaPrimary: "Create psychoanalyst account", ctaVolunteer: "Volunteer for SOS Venezuela" },
    terapeuta_integrativo: { slug: "terapeuta_integrativo", icon: "leaf", title: "Integrative therapist", subtitle: "Holistic and complementary practices with unified records", heroDesc: "Combine integrative approaches ? aromatherapy, flower essences, mindfulness ? with telehealth, documentation and professional scheduling on Doctor8.", useCases: [{ title: "Online integrative consultations", desc: "See patients seeking holistic approaches with a chart that records protocols and progress." }, { title: "Therapeutic plans", desc: "Document recommendations, combinations and follow-up in structured notes." }, { title: "Specialized profile", desc: "Highlight your practice areas on your public profile and receive direct bookings." }, { title: "Humanitarian support", desc: "In volunteering, offer integrative emotional support to victims in shelters and affected communities." }], platformFeatures: ["Flexible chart for multiple therapeutic approaches", "Stable browser-based telehealth", "Documents and guidance sent to patients by email", "Humanitarian integrative therapy queue"], volunteerTitle: "Free integrative care for victims", volunteerDesc: "Patients in the integrative therapy queue seek holistic support after trauma. See them by video with full documentation on the platform.", ctaPrimary: "Create professional account", ctaVolunteer: "Volunteer for SOS Venezuela" },
    fisioterapeuta: { slug: "fisioterapeuta", icon: "dumbbell", title: "Physiotherapist", subtitle: "Remote rehabilitation with exercise guidance and follow-up", heroDesc: "Assess, guide and follow patients by telehealth ? ideal for post-trauma rehab, muscle pain and home exercises.", useCases: [{ title: "Physiotherapy telehealth", desc: "Assess posture and movement by video, record progress and adapt exercise protocols." }, { title: "Exercise guidance", desc: "Send documented exercise plans in the chart with follow-up on return visits." }, { title: "Post-op and trauma", desc: "Follow rehabilitation for patients with injuries from debris or falls ? common in humanitarian contexts." }, { title: "Post-earthquake volunteering", desc: "See victims with muscle pain, mobility limitations and rehabilitation needs." }], platformFeatures: ["Chart with range of motion, pain and functional progress", "Attachments for exercise videos and images", "Schedule by session type (assessment, follow-up, guidance)", "Humanitarian physiotherapy queue with mobility triage"], volunteerTitle: "Free rehabilitation for earthquake victims", volunteerDesc: "Many victims have muscle pain and mobility limitations. Join the physiotherapy queue and provide practical guidance by video.", ctaPrimary: "Create physiotherapist account", ctaVolunteer: "Volunteer for SOS Venezuela" },
    nutricionista: { slug: "nutricionista", icon: "utensils", title: "Nutritionist", subtitle: "Online nutrition consultations with documented meal plans", heroDesc: "Assess eating habits, create nutrition plans and track progress ? with integrated telehealth and complete records.", useCases: [{ title: "Online nutrition consultation", desc: "Dietary history, needs assessment and personalized guidance by video." }, { title: "Meal plans", desc: "Document recommendations, restrictions and goals in the chart with progress history." }, { title: "Ongoing follow-up", desc: "Scheduled return visits with automatic reminders to maintain treatment adherence." }, { title: "Humanitarian nutrition", desc: "In SOS Venezuela, guide families in shelters on adequate nutrition with limited resources." }], platformFeatures: ["Nutrition chart with anthropometry and history", "Guidance documents sent to patients", "Schedule by visit type (first visit, follow-up, re-education)", "Humanitarian nutrition queue"], volunteerTitle: "Nutrition guidance for affected families", volunteerDesc: "Families in shelters need guidance on nutrition with scarce resources. Serve in the humanitarian nutrition queue.", ctaPrimary: "Create nutritionist account", ctaVolunteer: "Volunteer for SOS Venezuela" },
    cuidados_paliativos: { slug: "cuidados_paliativos", icon: "heart", title: "Palliative care", subtitle: "Comfort, dignity and support for patients and families", heroDesc: "Offer palliative care by telehealth ? symptom management, family support and guidance ? with sensitive, secure documentation.", useCases: [{ title: "Remote palliative visits", desc: "Assess symptoms, adjust guidance and follow home-care patients by video." }, { title: "Family support", desc: "Record conversations with family members, care guidance and referrals in the chart." }, { title: "Symptom management", desc: "Document comfort protocols and progress with prescriptions when indicated by the responsible physician." }, { title: "Humanitarian care", desc: "In SOS Venezuela, offer palliative support to severely affected patients and their families." }], platformFeatures: ["Chart focused on quality of life and symptoms", "Telehealth for family follow-up", "Sensitive documentation with maximum privacy", "Humanitarian palliative care queue"], volunteerTitle: "Dignity and comfort for those who suffer most", volunteerDesc: "The palliative care queue serves patients in grave condition and grieving families. Your presence makes a difference ? see them by video with full platform security.", ctaPrimary: "Create professional account", ctaVolunteer: "Volunteer for SOS Venezuela" },
  },
};

const es: ProLandingContent = {
  meta: {
    title: "Doctor8 ? Plataforma para Profesionales de Salud",
    description: "Agenda, teleconsulta, historial cl?nico, prescripciones digitales y pagos ? todo en un lugar. Para m?dicos y profesionales de salud en Brasil, EE.UU. y Europa.",
  },
  nav: {
    features: "Funcionalidades",
    how: "C?mo funciona",
    prescriptions: "Prescripciones",
    schedule: "Agenda",
    plans: "Planes",
    volunteer: "Voluntariado",
    signIn: "Entrar",
    signUp: "Reg?strate gratis",
  },
  hero: {
    pill: "Para m?dicos y profesionales de salud",
    title: "Atiende m?s.",
    titleEm: "Administra menos.",
    sub: "Agenda inteligente, historial digital, prescripciones con validez legal y pagos autom?ticos ? todo integrado en una sola plataforma. Funciona en Brasil, EE.UU. y Europa.",
    ctaPrimary: "Empezar gratis",
    ctaSecondary: "Ver c?mo funciona",
    proof: ["Registrado en CFM", "LGPD & HIPAA", "Brasil ? EE.UU. ? Europa", "Sin contrato de permanencia"],
    dashTitle: "Panel ? Dra. Ana Rodrigues",
    stat1Val: "12",
    stat1Label: "Consultas hoy",
    stat1Up: "? 3 vs. ayer",
    stat2Val: "$820",
    stat2Label: "Ingresos este mes",
    stat2Up: "? 18%",
    nextAppts: "Pr?ximas consultas",
    appts: [
      { name: "Mar?a Santos", meta: "14:00 ? Control", badge: "Confirmado", color: "green" },
      { name: "Carlos Lima", meta: "15:30 ? Primera vez", badge: "Receta", color: "orange" },
      { name: "Paula Ferreira", meta: "16:00 ? Teleconsulta", badge: "Pagado", color: "blue" },
    ],
    notifTitle: "Pago recibido",
    notifSub: "$64 ? Jo?o Mendes",
  },
  volunteerBanner: {
    eyebrow: "Atenci?n voluntaria ? SOS Venezuela",
    title: "Tu especialidad puede salvar vidas hoy",
    desc: "Profesionales de salud de todo el mundo atienden gratis a v?ctimas del terremoto en Venezuela. ?nete a la fila de tu especialidad, atiende por teleconsulta y marca la diferencia ? desde casa.",
    cta: "Quiero ser voluntario",
    link: "M?s sobre SOS Venezuela",
    professionsTitle: "Especialidades en atenci?n voluntaria",
  },
  trust: ["Registrado en CFM", "LGPD Compliant", "HIPAA Certified", "Brasil ? EE.UU. ? Europa", "Cifrado de extremo a extremo", "Prescripciones con validez legal"],
  features: {
    eyebrow: "Funcionalidades",
    title: "Una plataforma.\nSeis herramientas esenciales.",
    sub: "Todo lo que usas hoy en herramientas separadas, ahora integrado y funcionando junto.",
    items: [
      { icon: "calendar", title: "Agenda Inteligente", desc: "Los pacientes agendan solos 24h al d?a. T? defines tu disponibilidad y el sistema hace el resto.", details: ["Confirmaci?n autom?tica por email", "Recordatorios para reducir ausencias", "Bloqueo autom?tico tras el pago", "Agenda por tipo de consulta"] },
      { icon: "video", title: "Teleconsulta Integrada", desc: "Videollamada de alta calidad directo en la plataforma. Sin apps externas para ti ni para el paciente.", details: ["Enlace ?nico por consulta", "Funciona en el navegador", "Sala privada con contrase?a", "Compatible con m?vil"] },
      { icon: "clipboard", title: "Historial Digital", desc: "Historial cl?nico cifrado, accesible desde cualquier dispositivo. Evoluci?n, adjuntos, ex?menes y recetas en un solo lugar.", details: ["Evoluci?n cl?nica por consulta", "Adjuntar ex?menes y documentos", "B?squeda r?pida por paciente", "Compartir de forma segura"] },
      { icon: "pill", title: "Prescripciones Digitales", desc: "Emite recetas con validez legal en PDF, con tu firma y datos profesionales.", details: ["Base de medicamentos integrada", "Recetario simple y controlado", "PDF con datos completos", "El paciente recibe por email"] },
      { icon: "credit", title: "Pagos Autom?ticos", desc: "Cobra antes de la consulta. Sin morosidad, sin cobranzas manuales. Tarjeta, Pix y PayPal.", details: ["Tarjeta, Pix y PayPal", "Pago obligatorio al agendar", "Extracto e informes mensuales", "Reembolso simplificado"] },
      { icon: "badge", title: "Perfil Profesional P?blico", desc: "Tu p?gina en doctor8.org/dr/tu-nombre. Comparte con pacientes y deja que agenden directo.", details: ["URL personalizada", "Foto, bio y especialidades", "Rese?as de pacientes", "Bot?n de agendamiento directo"] },
    ],
  },
  how: {
    eyebrow: "Paso a paso",
    title: "En menos de 10 minutos, ya est?s listo para atender",
    sub: "Sin burocracia, sin instalaci?n. Accede desde el navegador, en cualquier dispositivo.",
    steps: [
      { title: "Crea tu cuenta gratis", desc: "Indica nombre, especialidad y matr?cula. Sin tarjeta de cr?dito para empezar." },
      { title: "Completa tu perfil", desc: "A?ade foto, bio, valor de consulta y datos para prescripci?n. Toma 5 minutos." },
      { title: "Configura tu agenda", desc: "Define los horarios en que quieres atender. El sistema empieza a recibir citas autom?ticamente." },
      { title: "Atiende y cobra", desc: "Consulta por video, completa el historial, emite la receta ? todo en la misma pantalla. Pago ya confirmado." },
    ],
    phoneGreeting: "Buenos d?as,",
    phoneName: "Dra. Fernanda Lima ??",
    phoneStats: [{ val: "8", lbl: "Hoy" }, { val: "$480", lbl: "Semana" }, { val: "4.9?", lbl: "Valoraci?n" }],
    phoneSection: "Pr?ximos horarios",
    phoneAppts: [{ name: "Roberto Alves", time: "14:00 ? Teleconsulta" }, { name: "S?lvia Castro", time: "15:00 ? Control" }],
    phoneRxLabel: "?ltima receta emitida",
    phoneRxName: "Losart?n 50mg",
    phoneRxDetail: "Roberto Alves ? Ayer, 14:32",
  },
  prescriptions: {
    eyebrow: "Prescripciones Digitales",
    title: "Recetas con validez legal, generadas en segundos",
    desc: "Doctor8 tiene una base completa de medicamentos integrada. Buscas el medicamento, defines la posolog?a ? y el sistema genera el PDF con todos los datos exigidos.",
    points: ["Base de medicamentos con etiquetas para controlados", "PDF con datos del paciente, direcci?n y edad calculada", "Datos completos del m?dico y cl?nica en el encabezado", "Disponible en portugu?s, ingl?s y espa?ol", "El paciente recibe por email y accede en Mis Recetas", "Recetario especial para sustancias controladas"],
    rxDoc: "Dra. Ana Rodrigues ? Matr?cula 12345/SP",
    rxMeta: "Cardi?loga ? Cl?nica Doctor8 SP",
    rxPatient: "Paciente",
    rxPatientName: "Carlos Eduardo Lima",
    rxPatientDetail: "52 a?os ? C. Flores, 120 ? S?o Paulo / SP",
    rxDrugs: [{ name: "Losart?n Pot?sico 50mg", dose: "1 comprimido al d?a por la ma?ana ? 30 d?as" }, { name: "Clonazepam 2mg", dose: "? comprimido por la noche ? 30 d?as", tag: "Controlado" }],
    rxSig: "PDF con firma digital ? Generado el 17/06/2026",
  },
  schedule: {
    eyebrow: "Agenda y Teleconsulta",
    title: "Tu agenda trabaja por ti, incluso cuando no est?s",
    desc: "Pacientes en Brasil, EE.UU. y Europa pueden agendar y pagar a cualquier hora. Apareces disponible para quien te necesita.",
    points: ["Agendamiento online 24/7 con pago integrado", "Confirmaci?n autom?tica por email al paciente", "Recordatorios para reducir ausencias hasta un 60%", "Bloqueo autom?tico de horarios ya reservados", "Videollamada sin instalar aplicaci?n", "Sala privada con enlace exclusivo por consulta"],
    weekLabel: "Semana actual ? Junio 2026",
    nextLabel: "Pr?ximas 3 consultas",
    msgDoc: "Hola Mar?a, tu consulta est? confirmada para ma?ana a las 14h. ?Enlace de acceso enviado a tu email! ?",
    msgPat: "Gracias doctora, ya recib? el enlace ??",
  },
  professions: {
    eyebrow: "Voluntariado",
    title: "C?mo cada especialidad usa Doctor8",
    sub: "Conoce c?mo m?dicos, psic?logos, fisioterapeutas y otros profesionales aprovechan la plataforma ? en la pr?ctica cl?nica y en la atenci?n humanitaria.",
    cta: "Ver c?mo funciona para tu ?rea",
  },
  pricing: {
    eyebrow: "Planes",
    title: "Transparente. Sin sorpresas.",
    sub: "Empieza gratis. Escala cuando quieras. Cancela cuando quieras.",
    note: "* Precios sujetos a cambio. Facturaci?n mensual, sin permanencia.",
    plans: [
      { badge: "Starter", name: "Gratuito", price: "0", period: "Para empezar y probar", features: [{ text: "Hasta 20 consultas/mes", included: true }, { text: "Teleconsulta integrada", included: true }, { text: "Historial digital", included: true }, { text: "Prescripciones digitales", included: true }, { text: "Pagos autom?ticos", included: false }, { text: "Perfil p?blico indexado", included: false }, { text: "Soporte prioritario", included: false }], cta: "Empezar gratis" },
      { badge: "?? M?s popular", name: "Profesional", price: "149", period: "Para quien quiere crecer", featured: true, features: [{ text: "Consultas ilimitadas", included: true }, { text: "Teleconsulta integrada", included: true }, { text: "Historial digital completo", included: true }, { text: "Prescripciones digitales", included: true }, { text: "Pagos autom?ticos", included: true }, { text: "Perfil p?blico indexado", included: true }, { text: "Soporte prioritario", included: true }], cta: "Suscribirse ahora" },
      { badge: "Cl?nica", name: "Equipo", price: "399", period: "Para cl?nicas y grupos", features: [{ text: "Hasta 5 profesionales", included: true }, { text: "Todo del plan Profesional", included: true }, { text: "Panel administrativo", included: true }, { text: "Informes consolidados", included: true }, { text: "Onboarding dedicado", included: true }, { text: "Contrato DPA (LGPD)", included: true }, { text: "Soporte prioritario", included: true }], cta: "Hablar con el equipo", href: "mailto:contato@doctor8.org" },
    ],
  },
  lgpd: {
    title: "Cumplimiento LGPD e HIPAA ? porque tus pacientes te conf?an los datos m?s sensibles de sus vidas",
    body: "Doctor8 cumple totalmente con la LGPD brasile?a y el HIPAA estadounidense. Todos los datos se almacenan con cifrado de extremo a extremo. ?Preguntas? Contacta a nuestro DPO: dpo@doctor8.org",
  },
  ctaFinal: { title: "?Listo para", titleEm: "simplificar", sub: "tu pr?ctica cl?nica?", primary: "Reg?strate gratis", secondary: "Hablar con el equipo" },
  footer: {
    desc: "Plataforma de telemedicina para profesionales de salud. Registrada en CFM. Conforme LGPD e HIPAA. Atiende Brasil, EE.UU. y Europa.",
    platform: "Plataforma", patients: "Pacientes", legal: "Legal",
    platformLinks: ["Funcionalidades", "C?mo funciona", "Prescripciones", "Agenda", "Planes"],
    patientLinks: ["Club Doctor", "Agendar consulta", "Cannabis Medicinal", "Doctor Energy"],
    legalLinks: ["Pol?tica de Privacidad", "T?rminos de Uso", "LGPD", "DPO"],
    copyright: "? 2026 Doctor8 ? INFO8 Desenvolvimento de Sistemas Ltda ? CNPJ 20.251.527/0001-04",
    badges: ["LGPD", "HIPAA", "CFM", "SSL 256-bit"],
  },
  cookie: { text: "Utilizamos cookies para mejorar tu experiencia. Al continuar, aceptas nuestra Pol?tica de Privacidad y la LGPD.", accept: "Aceptar", decline: "Rechazar" },
  professionPages: {
    medico: { slug: "medico", icon: "stethoscope", title: "M?dico general", subtitle: "Consultas, prescripciones e historial en una sola plataforma", heroDesc: "Desde teleconsulta de control hasta renovaci?n de recetas, Doctor8 centraliza todo lo que el m?dico necesita ? incluyendo filas humanitarias para atenci?n gratuita.", useCases: [{ title: "Consulta cl?nica online", desc: "Atiende pacientes por video con historial integrado, notas SOAP y adjuntos de ex?menes en la misma pantalla." }, { title: "Prescripciones con validez legal", desc: "Emite recetas simples y controladas con base integrada, PDF firmado y env?o autom?tico al paciente." }, { title: "Agenda con pago anticipado", desc: "Define horarios, valores y tipos de consulta. El paciente agenda y paga antes ? sin morosidad." }, { title: "Voluntariado SOS Venezuela", desc: "?nete a la fila m?dica humanitaria, recibe pacientes triados por urgencia y atiende gratis por teleconsulta." }], platformFeatures: ["Historial con historial completo y b?squeda por paciente", "Base de medicamentos con alertas de controlados", "Perfil p?blico indexado para captar pacientes", "Fila humanitaria con triaje autom?tico de prioridad"], volunteerTitle: "Atiende a v?ctimas del terremoto como m?dico voluntario", volunteerDesc: "Los pacientes en Venezuela pasan por triaje r?pido y entran en la fila m?dica. Cuando sea tu turno, recibes la notificaci?n y atiendes por video ? con historial y prescripci?n listos.", ctaPrimary: "Crear cuenta m?dica", ctaVolunteer: "Voluntariarse en SOS Venezuela" },
    psicologo: { slug: "psicologo", icon: "brain", title: "Psic?logo", subtitle: "Psicoterapia online con conformidad profesional e historial seguro", heroDesc: "Sesiones por video, escalas psicol?gicas, documentos firmados y agenda automatizada ? alineado con est?ndares de telesalud profesional.", useCases: [{ title: "Psicoterapia por teleconsulta", desc: "Salas privadas por sesi?n, sin instalar apps. Ideal para seguimiento continuo y primeras consultas." }, { title: "Escalas e instrumentos", desc: "Aplica PHQ-9, GAD-7 y otras escalas con puntuaci?n autom?tica guardada en el historial." }, { title: "Documentos y consentimiento", desc: "TCLE, contrato de prestaci?n de servicios e informes con firma digital integrada." }, { title: "Primeros Auxilios Psicol?gicos (PAP)", desc: "En el voluntariado SOS Venezuela, atiende pacientes en crisis emocional con fila prioritaria." }], platformFeatures: ["M?dulo psicol?gico con notas de sesi?n estructuradas", "Conformidad con est?ndares de telesalud", "Registro de emergencias y derivaciones", "Fila humanitaria con priorizaci?n por nivel de crisis"], volunteerTitle: "Ofrece acogida psicol?gica gratuita", volunteerDesc: "La fila de psicolog?a humanitaria prioriza pacientes en crisis emocional. Atiendes por video con historial seguro y puedes registrar derivaciones cuando sea necesario.", ctaPrimary: "Crear cuenta de psic?logo", ctaVolunteer: "Voluntariarse en SOS Venezuela" },
    psicanalista: { slug: "psicanalista", icon: "sparkles", title: "Psicanalista", subtitle: "Sesiones anal?ticas online con privacidad y continuidad", heroDesc: "Gestiona analizantes, sesiones regulares y documentaci?n cl?nica en entorno cifrado ? con soporte a voluntariado humanitario.", useCases: [{ title: "Sesiones anal?ticas remotas", desc: "Salas de video estables para procesos de larga duraci?n, con historial de sesiones por paciente." }, { title: "Gesti?n de analizantes", desc: "Historial dedicado con evoluci?n cl?nica, notas de sesi?n y b?squeda r?pida." }, { title: "Agenda flexible", desc: "Configura frecuencia semanal, bloqueos y tipos de sesi?n (primera vez, control, supervisi?n)." }, { title: "Escucha humanitaria", desc: "En SOS Venezuela, ofrece escucha psicanal?tica a v?ctimas del terremoto en sufrimiento profundo." }], platformFeatures: ["Cuenta dedicada de psicanalista con perfil especializado", "Historial con sigilo y cifrado de extremo a extremo", "Agenda con recordatorios autom?ticos", "Fila humanitaria exclusiva para psicanalistas voluntarios"], volunteerTitle: "Escucha anal?tica para quien m?s lo necesita", volunteerDesc: "La fila de psicanalistas atiende pacientes que buscan escucha profunda tras el trauma. Reg?strate como psicanalista y ?nete a la fila voluntaria cuando est?s disponible.", ctaPrimary: "Crear cuenta de psicanalista", ctaVolunteer: "Voluntariarse en SOS Venezuela" },
    terapeuta_integrativo: { slug: "terapeuta_integrativo", icon: "leaf", title: "Terapeuta integrativo", subtitle: "Pr?cticas hol?sticas y complementarias con historial unificado", heroDesc: "Combina enfoques integrativos ? aromaterapia, flores de Bach, mindfulness ? con teleconsulta, documentaci?n y agenda profesional en Doctor8.", useCases: [{ title: "Consultas integrativas online", desc: "Atiende pacientes que buscan enfoque hol?stico con historial que registra protocolos y evoluci?n." }, { title: "Planes terap?uticos", desc: "Documenta recomendaciones, combinaciones y seguimiento en evoluciones estructuradas." }, { title: "Perfil especializado", desc: "Destaca tus l?neas de actuaci?n en el perfil p?blico y recibe agendamientos directos." }, { title: "Acogimiento humanitario", desc: "En el voluntariado, ofrece apoyo emocional integrativo a v?ctimas en refugios y comunidades afectadas." }], platformFeatures: ["Historial flexible para m?ltiples enfoques terap?uticos", "Teleconsulta estable por navegador", "Documentos y orientaciones enviados al paciente por email", "Fila humanitaria de terapia integrativa"], volunteerTitle: "Cuidado integrativo gratuito para v?ctimas", volunteerDesc: "Los pacientes en la fila de terapia integrativa buscan acogimiento hol?stico tras el trauma. Atiende por video con toda la documentaci?n en la plataforma.", ctaPrimary: "Crear cuenta profesional", ctaVolunteer: "Voluntariarse en SOS Venezuela" },
    fisioterapeuta: { slug: "fisioterapeuta", icon: "dumbbell", title: "Fisioterapeuta", subtitle: "Rehabilitaci?n remota con orientaci?n de ejercicios y seguimiento", heroDesc: "Eval?a, orienta y hace seguimiento de pacientes por teleconsulta ? ideal para rehabilitaci?n post-trauma, dolores musculares y ejercicios domiciliarios.", useCases: [{ title: "Teleconsulta fisioterap?utica", desc: "Eval?a postura y movimiento por video, registra evoluci?n y adapta protocolos de ejercicios." }, { title: "Orientaci?n de ejercicios", desc: "Env?a planes de ejercicios documentados en el historial con seguimiento en controles." }, { title: "Postoperatorio y trauma", desc: "Hace seguimiento de rehabilitaci?n de pacientes con lesiones por escombros o ca?das ? com?n en contexto humanitario." }, { title: "Voluntariado post-terremoto", desc: "Atiende v?ctimas con dolores musculares, limitaciones de movilidad y necesidad de rehabilitaci?n." }], platformFeatures: ["Historial con registro de amplitud, dolor y evoluci?n funcional", "Adjuntos de videos e im?genes de ejercicios", "Agenda por tipo de sesi?n (evaluaci?n, control, orientaci?n)", "Fila humanitaria de fisioterapia con triaje de movilidad"], volunteerTitle: "Rehabilitaci?n gratuita para v?ctimas del terremoto", volunteerDesc: "Muchas v?ctimas tienen dolores musculares y limitaciones de movilidad. ?nete a la fila de fisioterapia y atiende con orientaciones pr?cticas por video.", ctaPrimary: "Crear cuenta de fisioterapeuta", ctaVolunteer: "Voluntariarse en SOS Venezuela" },
    nutricionista: { slug: "nutricionista", icon: "utensils", title: "Nutricionista", subtitle: "Consultas nutricionales online con planes alimentarios documentados", heroDesc: "Eval?a h?bitos alimentarios, crea planes nutricionales y hace seguimiento de evoluci?n ? con teleconsulta integrada e historial completo.", useCases: [{ title: "Consulta nutricional online", desc: "Anamnesis alimentaria, evaluaci?n de necesidades y orientaci?n personalizada por video." }, { title: "Planes alimentarios", desc: "Documenta recomendaciones, restricciones y metas en el historial con evoluci?n." }, { title: "Seguimiento continuo", desc: "Controles programados con recordatorios autom?ticos para mantener adherencia al tratamiento." }, { title: "Nutrici?n humanitaria", desc: "En SOS Venezuela, orienta familias en refugios sobre alimentaci?n adecuada con recursos limitados." }], platformFeatures: ["Historial nutricional con antropometr?a e historial", "Documentos de orientaci?n enviados al paciente", "Agenda por tipo de consulta (primera vez, control, reeducaci?n)", "Fila humanitaria de nutrici?n"], volunteerTitle: "Orientaci?n nutricional para familias afectadas", volunteerDesc: "Las familias en refugios necesitan orientaci?n sobre alimentaci?n con recursos escasos. Atiende en la fila de nutrici?n humanitaria.", ctaPrimary: "Crear cuenta de nutricionista", ctaVolunteer: "Voluntariarse en SOS Venezuela" },
    cuidados_paliativos: { slug: "cuidados_paliativos", icon: "heart", title: "Cuidados paliativos", subtitle: "Confort, dignidad y apoyo a pacientes y familias", heroDesc: "Ofrece cuidados paliativos por teleconsulta ? manejo de s?ntomas, apoyo familiar y orientaci?n ? con documentaci?n sensible y segura.", useCases: [{ title: "Consultas paliativas remotas", desc: "Eval?a s?ntomas, ajusta orientaciones y hace seguimiento de pacientes en cuidado domiciliario por video." }, { title: "Apoyo a la familia", desc: "Registra conversaciones con familiares, orientaciones de cuidado y derivaciones en el historial." }, { title: "Manejo de s?ntomas", desc: "Documenta protocolos de confort y evoluci?n con prescripciones cuando lo indique el m?dico responsable." }, { title: "Cuidado humanitario", desc: "En SOS Venezuela, ofrece apoyo paliativo a pacientes gravemente afectados y sus familias." }], platformFeatures: ["Historial enfocado en calidad de vida y s?ntomas", "Teleconsulta para seguimiento familiar", "Documentaci?n sensible con m?xima privacidad", "Fila humanitaria de cuidados paliativos"], volunteerTitle: "Dignidad y confort para quien m?s sufre", volunteerDesc: "La fila de cuidados paliativos atiende pacientes en situaci?n grave y familias en duelo. Tu presencia marca la diferencia ? atiende por video con toda la seguridad de la plataforma.", ctaPrimary: "Crear cuenta profesional", ctaVolunteer: "Voluntariarse en SOS Venezuela" },
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
