import type { Lang } from "@/lib/i18n/translations";

export type LandingPillar = { title: string; desc: string };
export type LandingStep = { title: string; desc: string };
export type LandingCompareRow = { them: string; focus: string; doctor8: string };

export type LandingContent = {
  nav: {
    how: string; specialties: string; club: string; cannabis: string; energy: string;
    urgent: string; pharmacy: string; ecosystem: string; signIn: string; signUp: string;
    groupAbout: string; groupCare: string; groupBenefits: string;
  };
  heroCtas: { urgent: string; register: string; corporate: string };
  trust: string[];
  stats: { value: string; label: string }[];
  ecosystem: { eyebrow: string; title: string; sub: string; pillars: LandingPillar[] };
  jit: { badge: string; title: string; titleHighlight: string; sub: string; points: string[]; cta: string };
  eap: { eyebrow: string; title: string; body: string; bullets: string[]; cta: string };
  pharmacy: { badge: string; title: string; sub: string; steps: LandingStep[]; cta: string };
  buyingClub: { badge: string; title: string; sub: string; points: string[]; cta: string };
  compare: {
    eyebrow: string; title: string; sub: string;
    headers: LandingCompareRow; rows: LandingCompareRow[];
  };
  how: { eyebrow: string; title: string; sub: string; steps: LandingStep[] };
  specialties: { eyebrow: string; title: string; sub: string; items: LandingPillar[] };
  club: {
    badge: string; title: string; titleEm: string; sub: string; disclaimer: string;
    benefits: string[]; priceLabel: string; period: string; includes: string[];
    cta: string; cancel: string;
  };
  cannabis: {
    badge: string; titleEm: string; titleRest: string; sub: string; points: string[];
    cta: string; conditionsHeader: string; tags: string[];
  };
  energy: {
    badge: string; titleEm: string; sub: string; points: string[];
    cta: string; pctLabel: string; disclaimer: string;
  };
  lgpd: { title: string; body: string };
  cta: { titleEm: string; titleRest: string; sub: string; primary: string; secondary: string };
  footer: {
    desc: string; services: string; ecosystem: string; professionals: string; legal: string;
    serviceLinks: { label: string; href: string }[];
    ecosystemLinks: { label: string; href: string }[];
    proLinks: string[]; legalLinks: string[];
    proDoctorLogin: string; proPsychologistLogin: string;
    proPsychoanalystLogin: string; proIntegrativeLogin: string; proNutritionistLogin: string;
    proOrganizationLogin: string; proAngelLogin: string;
    copyright: string;
  };
  cookie: { text: string; accept: string; decline: string };
  platform: {
    eyebrow: string; title: string; sub: string; footerNote: string; loginLink: string;
    items: Record<string, { labelKey: string; desc: string }>;
  };
};

const pt: LandingContent = {
  nav: {
    how: "Como funciona", specialties: "Especialidades", club: "Club Doctor", cannabis: "Cannabis",
    energy: "Doctor Energy", urgent: "Plantão", pharmacy: "Farmácia", ecosystem: "Ecossistema",
    signIn: "Entrar", signUp: "Cadastre-se",
    groupAbout: "Conheça", groupCare: "Atendimento", groupBenefits: "Benefícios",
  },
  heroCtas: {
    urgent: "Plantão imediato",
    register: "Criar conta grátis",
    corporate: "Benefício corporativo",
  },
  trust: ["Dados criptografados", "LGPD & HIPAA", "Brasil, EUA, Europa e Venezuela", "Pagamento seguro", "100% online"],
  stats: [
    { value: "80+", label: "especialidades médicas e de saúde" },
    { value: "R$ 34,90", label: "Club Doctor por mês" },
    { value: "24/7", label: "agendamento online" },
    { value: "4", label: "países atendidos" },
  ],
  ecosystem: {
    eyebrow: "Por que Doctor8",
    title: "Mais que telemedicina — um ecossistema completo de saúde",
    sub: "Do primeiro sintoma ao acompanhamento contínuo, com dados protegidos e profissionais verificados.",
    pillars: [
      { title: "Consultas online em minutos", desc: "Busque por especialidade, sintoma ou convênio. Teleconsulta segura, presencial ou plantão imediato." },
      { title: "Seus dados, suas regras", desc: "Prontuário criptografado, alinhado a LGPD e HIPAA. Você controla quem acessa seu histórico." },
      { title: "Club Doctor", desc: "Acesso à rede completa, cartão de carimbos, descontos em medicamentos e exames — R$34,90/mês." },
      { title: "Cannabis, farmácia e bem-estar", desc: "Medicina canabinoide, rede de farmácias, compras coletivas e benefícios exclusivos." },
    ],
  },
  jit: {
    badge: "Plantão JIT",
    title: "Precisa de atendimento ",
    titleHighlight: "agora?",
    sub: "Fila em tempo real com profissionais online. Sem agendar com dias de antecedência — entre na fila e consulte em minutos.",
    points: [
      "Atendimento imediato quando não pode esperar",
      "Busca por especialidade disponível no plantão",
      "Pagamento seguro antes de entrar na fila",
      "Histórico compartilhado com o profissional",
    ],
    cta: "Acessar plantão imediato",
  },
  eap: {
    eyebrow: "Benefício corporativo",
    title: "Sua empresa oferece Doctor8? Ative seu EAP em poucos cliques.",
    body: "Colaboradores com benefício corporativo acessam sessões de psicologia, trilhas de bem-estar e pulse check-in — com total sigilo. O RH vê apenas métricas agregadas.",
    bullets: [
      "Ative pelo convite recebido por e-mail da empresa",
      "Sessões sigilosas com psicólogos CRP credenciados",
      "Trilhas psicoeducativas e conteúdo de bem-estar",
      "Sem necessidade de e-mail corporativo (conforme política do RH)",
    ],
    cta: "Ativar meu benefício",
  },
  pharmacy: {
    badge: "Rede de farmácias",
    title: "Da receita digital à farmácia perto de você",
    sub: "Receba a prescrição do médico, compare preços por proximidade e peça entrega ou retirada na rede Doctor8.",
    steps: [
      { title: "Receita digital", desc: "PDF assinado com QR para validação na bancada." },
      { title: "Busque preços", desc: "Compare farmácias parceiras perto do seu CEP." },
      { title: "Receba em casa", desc: "Pague com PIX ou cartão — retirada ou entrega." },
    ],
    cta: "Buscar medicamentos",
  },
  buyingClub: {
    badge: "Buying Club",
    title: "Compre em grupo, pague menos",
    sub: "Junte-se a compras coletivas de medicamentos e negocie descontos quando o grupo atinge a meta.",
    points: [
      "Busque medicamentos no catálogo Doctor8",
      "Crie ou entre em grupos de compra",
      "Convide amigos e familiares para ampliar o desconto",
      "Benefício exclusivo para assinantes Club Doctor",
    ],
    cta: "Conhecer o Buying Club",
  },
  compare: {
    eyebrow: "Por que Doctor8",
    title: "Doctor8 vs. outras plataformas",
    sub: "Por que pacientes escolhem o ecossistema Doctor8.",
    headers: { them: "Outros", focus: "Foco", doctor8: "Doctor8" },
    rows: [
      { them: "Apps de consulta avulsa", focus: "Só telemedicina", doctor8: "Telemedicina + Club + farmácia + EAP" },
      { them: "Planos de saúde tradicionais", focus: "Caros e burocráticos", doctor8: "Club Doctor acessível + consultas avulsas" },
      { them: "Marketplaces genéricos", focus: "Lista de profissionais", doctor8: "Prontuário integrado, escalas clínicas e continuidade" },
    ],
  },
  how: {
    eyebrow: "Simples assim", title: "Consulta online em 3 passos",
    sub: "Sem filas, sem deslocamento. Consulte do conforto da sua casa.",
    steps: [
      { title: "Crie sua conta", desc: "Cadastre-se gratuitamente com e-mail ou Google. Leva menos de 2 minutos." },
      { title: "Escolha o especialista", desc: "Busque por especialidade, veja hor\u00e1rios dispon\u00edveis e escolha o profissional ideal." },
      { title: "Consulte e gerencie sua sa\u00fade", desc: "Pague com seguran\u00e7a, entre na teleconsulta e tenha todo seu hist\u00f3rico m\u00e9dico digital." },
    ],
  },
  specialties: {
    eyebrow: "Especialidades", title: "Cuidado para toda a fam\u00edlia",
    sub: "Encontre especialistas em mais de 80 \u00e1reas da sa\u00fade, dispon\u00edveis online ou presencialmente.",
    items: [
      { title: "Cl\u00ednica Geral", desc: "Triagem, orienta\u00e7\u00e3o e acompanhamento geral. Primeiro passo para sua sa\u00fade." },
      { title: "Sa\u00fade Mental", desc: "Psic\u00f3logos, psiquiatras, psicanalistas e terapeutas para o seu bem-estar emocional." },
      { title: "Nutri\u00e7\u00e3o", desc: "Nutricionistas e dietistas para alimenta\u00e7\u00e3o saud\u00e1vel, emagrecimento e performance." },
      { title: "Cardiologia", desc: "Consultas com cardiologistas para cuidado do cora\u00e7\u00e3o e sistema cardiovascular." },
      { title: "Fisioterapia", desc: "Reabilita\u00e7\u00e3o, dores musculares, p\u00f3s-cir\u00fargico e performance esportiva." },
      { title: "Cannabis Medicinal", desc: "Profissionais especializados em medicina canabinoide com prescri\u00e7\u00e3o segura e legal." },
      { title: "Odontologia", desc: "Dentistas para consultas, preven\u00e7\u00e3o e tratamentos bucais online ou presencial." },
      { title: "Cuidado Integrativo", desc: "Terapeutas integrativos, fitoterapia, florais e pr\u00e1ticas complementares." },
      { title: "Enfermagem", desc: "Enfermeiros para monitoramento, educa\u00e7\u00e3o em sa\u00fade e acompanhamento cl\u00ednico." },
    ],
  },
  club: {
    badge: "Club Doctor", title: "O plano que ", titleEm: "desbloqueia",
    sub: "Por apenas R$34,90/m\u00eas, voc\u00ea acessa a rede completa de profissionais Doctor8 e agenda teleconsultas com desconto. Cancele quando quiser.",
    disclaimer: "* O Club Doctor n\u00e3o \u00e9 plano de sa\u00fade nem servi\u00e7o de emerg\u00eancia m\u00e9dica. As consultas s\u00e3o cobradas separadamente.",
    benefits: [
      "Acesso \u00e0 rede completa de especialistas", "M\u00e9dicos, psic\u00f3logos, nutricionistas e mais",
      "Agendamento 100% online com confirma\u00e7\u00e3o imediata", "Pagamento seguro antes da teleconsulta",
      "Atendimento no Brasil, EUA, Europa e Venezuela", "Suporte dedicado",
    ],
    priceLabel: "Club Doctor", period: "por m\u00eas \u00b7 cancele quando quiser",
    includes: ["Acesso \u00e0 rede Doctor8", "Agendamento online 24/7", "Hist\u00f3rico m\u00e9dico digital", "Documentos e prescri\u00e7\u00f5es", "Suporte dedicado"],
    cta: "Assinar por R$34,90/m\u00eas", cancel: "Sem fidelidade \u00b7 Cancele a qualquer momento",
  },
  cannabis: {
    badge: "Cannabis Medicinal", titleEm: "Medicina canabinoide", titleRest: " com profissionais especializados",
    sub: "A Doctor8 conta com profissionais qualificados e estudiosos da medicina canabinoide. Prescri\u00e7\u00e3o segura, legal e online.",
    points: ["Profissionais especializados e certificados", "Consulta online com prescri\u00e7\u00e3o legal", "Acompanhamento cont\u00ednuo do tratamento", "Documenta\u00e7\u00e3o completa para importa\u00e7\u00e3o"],
    cta: "Agendar consulta", conditionsHeader: "Condi\u00e7\u00f5es tratadas",
    tags: ["Dor cr\u00f4nica", "Ansiedade", "Epilepsia", "Ins\u00f4nia", "Fibromialgia", "PTSD", "TEA", "TDAH", "Espasticidade", "Doen\u00e7as autoimunes", "Parkinson", "Oncologia (Suporte)", "Alzheimer", "+ outras"],
  },
  energy: {
    badge: "Doctor Energy", titleEm: "Club Doctor",
    sub: "Voc\u00ea \u00e9 de Minas Gerais e tem conta na Cemig? Sua conta de luz pode vir at\u00e9 20% mais baixa todo m\u00eas \u2014 exclusivo para assinantes do Club Doctor.",
    points: ["Economia garantida na conta de luz", "Sem trocar de fornecedora", "Impacto positivo no meio ambiente", "Benef\u00edcio exclusivo do Club Doctor"],
    cta: "Quero economizar", pctLabel: "de desconto na conta de luz",
    disclaimer: "*Para assinantes do Club Doctor residentes em MG com conta Cemig",
  },
  lgpd: {
    title: "Seus dados protegidos \u00b7 princ\u00edpios LGPD e HIPAA",
    body: "A Doctor8 foi desenvolvida seguindo os princ\u00edpios da Lei Geral de Prote\u00e7\u00e3o de Dados (LGPD) e do HIPAA americano. Suas informa\u00e7\u00f5es m\u00e9dicas s\u00e3o criptografadas e jamais compartilhadas sem seu consentimento. D\u00favidas? Fale com nosso DPO: dpo@doctor8.org",
  },
  cta: {
    titleEm: "Cuide da sua sa\u00fade", titleRest: " de onde voc\u00ea estiver",
    sub: "Cadastre-se gratuitamente e agende sua primeira consulta hoje.",
    primary: "Criar conta gr\u00e1tis", secondary: "Club Doctor \u2014 R$34,90/m\u00eas",
  },
  footer: {
    desc: "Plataforma de sa\u00fade digital para pacientes e profissionais. Arquitetura alinhada aos princ\u00edpios LGPD e HIPAA. Atua\u00e7\u00e3o no Brasil, EUA, Europa e Venezuela.",
    services: "Servi\u00e7os", ecosystem: "Ecossistema", professionals: "Profissionais", legal: "Legal",
    serviceLinks: [
      { label: "Plataforma", href: "#platform" },
      { label: "Especialidades", href: "#specialties" },
      { label: "Club Doctor", href: "#club" },
      { label: "Cannabis Medicinal", href: "#cannabis" },
      { label: "Doctor Energy", href: "#energy" },
    ],
    ecosystemLinks: [
      { label: "Plantão imediato", href: "#urgent" },
      { label: "Rede de farmácias", href: "/farmacias/buscar" },
      { label: "Buying Club", href: "#buying-club" },
      { label: "Benefício corporativo", href: "/empresas/colaborador" },
      { label: "AcuraBrasil", href: "/sos-venezuela" },
      { label: "Sobre o ecossistema", href: "/pacientes" },
    ],
    proLinks: ["Cadastre-se como profissional", "Entrar como médico"],
    proDoctorLogin: "Entrar como médico",
    proPsychologistLogin: "Entrar como psicólogo",
    proPsychoanalystLogin: "Entrar como psicanalista",
    proIntegrativeLogin: "Terapeuta integrativo",
    proNutritionistLogin: "Nutricionista",
    proOrganizationLogin: "Clínica / CNPJ",
    proAngelLogin: "Anjo voluntário",
    legalLinks: ["Pol\u00edtica de Privacidade", "Termos de Uso", "LGPD", "DPO"],
    copyright: "\u00a9 2026 Doctor8. Todos os direitos reservados.",
  },
  cookie: {
    text: "Usamos cookies para melhorar sua experi\u00eancia. Ao continuar, voc\u00ea concorda com nossa",
    accept: "Aceitar", decline: "Recusar",
  },
  platform: {
    eyebrow: "Sua \u00e1rea do paciente",
    title: "Tudo o que voc\u00ea precisa para cuidar da sa\u00fade",
    sub: "Ao criar sua conta gratuita, voc\u00ea acessa um painel completo \u2014 consultas, hist\u00f3rico, medicamentos, documentos e muito mais.",
    footerNote: "J\u00e1 tem conta?",
    loginLink: "Entrar na plataforma",
    items: {
      dashboard: { labelKey: "nav.dashboard", desc: "Vis\u00e3o geral da sua sa\u00fade, pr\u00f3ximas consultas e alertas importantes." },
      history: { labelKey: "nav.medicalHistory", desc: "Hist\u00f3rico cl\u00ednico completo, sempre acess\u00edvel e seguro." },
      medications: { labelKey: "nav.medications", desc: "Controle de rem\u00e9dios, lembretes e compartilhamento com m\u00e9dicos." },
      buyingClub: { labelKey: "nav.buyingClub", desc: "Descontos exclusivos em produtos de sa\u00fade parceiros." },
      prescriptions: { labelKey: "nav.myPrescriptions", desc: "Receitas digitais, renova\u00e7\u00f5es e prescri\u00e7\u00f5es em um s\u00f3 lugar." },
      examRequests: { labelKey: "nav.myExamRequests", desc: "Pedidos de exames e imagens emitidos pelos seus m\u00e9dicos." },
      doctorResources: { labelKey: "nav.doctorResources", desc: "Materiais, links e arquivos compartilhados pelos seus m\u00e9dicos." },
      appointments: { labelKey: "nav.appointments", desc: "Agende, pague e entre na teleconsulta pelo app." },
      documents: { labelKey: "nav.documents", desc: "Exames, laudos e arquivos m\u00e9dicos organizados." },
      messages: { labelKey: "nav.messages", desc: "Converse com seus profissionais de forma segura." },
      urgent: { labelKey: "nav.urgent", desc: "Atendimento imediato online quando precisar com urg\u00eancia." },
      find: { labelKey: "nav.find", desc: "Encontre profissionais por mapa, especialidade e conv\u00eanio." },
      account: { labelKey: "nav.account", desc: "Perfil, idioma, senha e prefer\u00eancias da conta." },
    },
  },
};

const en: LandingContent = {
  nav: {
    how: "How it works", specialties: "Specialties", club: "Club Doctor", cannabis: "Cannabis",
    energy: "Doctor Energy", urgent: "Urgent care", pharmacy: "Pharmacy", ecosystem: "Ecosystem",
    signIn: "Sign in", signUp: "Sign up",
    groupAbout: "Discover", groupCare: "Care", groupBenefits: "Benefits",
  },
  heroCtas: {
    urgent: "Immediate care",
    register: "Create free account",
    corporate: "Corporate benefit",
  },
  trust: ["Encrypted data", "LGPD & HIPAA", "Brazil, US, Europe & Venezuela", "Secure payment", "100% online"],
  stats: [
    { value: "80+", label: "medical and health specialties" },
    { value: "R$34.90", label: "Club Doctor per month" },
    { value: "24/7", label: "online scheduling" },
    { value: "4", label: "countries served" },
  ],
  ecosystem: {
    eyebrow: "Why Doctor8",
    title: "More than telemedicine — a complete health ecosystem",
    sub: "From first symptoms to ongoing care, with protected data and verified professionals.",
    pillars: [
      { title: "Online consultations in minutes", desc: "Search by specialty, symptom or insurance. Secure teleconsultation, in-person or immediate urgent care." },
      { title: "Your data, your rules", desc: "Encrypted health record aligned with LGPD and HIPAA. You control who accesses your history." },
      { title: "Club Doctor", desc: "Full specialist network access, stamp card, medication and exam discounts — R$34.90/month." },
      { title: "Cannabis, pharmacy and wellness", desc: "Cannabinoid medicine, pharmacy network, group buying and exclusive benefits." },
    ],
  },
  jit: {
    badge: "JIT Urgent Care",
    title: "Need care ",
    titleHighlight: "right now?",
    sub: "Real-time queue with online professionals. No scheduling days ahead — join the queue and consult in minutes.",
    points: [
      "Immediate care when you cannot wait",
      "Search by specialty available on duty",
      "Secure payment before joining the queue",
      "Share your history with the professional",
    ],
    cta: "Access immediate care",
  },
  eap: {
    eyebrow: "Corporate benefit",
    title: "Does your company offer Doctor8? Activate your EAP in a few clicks.",
    body: "Employees with corporate benefits access psychology sessions, wellness trails and pulse check-ins — with full confidentiality. HR sees only aggregate metrics.",
    bullets: [
      "Activate via the invite received from your employer",
      "Confidential sessions with credentialed CRP psychologists",
      "Psychoeducational trails and wellness content",
      "Corporate email not always required (per HR policy)",
    ],
    cta: "Activate my benefit",
  },
  pharmacy: {
    badge: "Pharmacy network",
    title: "From digital prescription to a pharmacy near you",
    sub: "Receive your doctor's prescription, compare prices by proximity and order pickup or delivery on the Doctor8 network.",
    steps: [
      { title: "Digital prescription", desc: "Signed PDF with QR for pharmacy validation." },
      { title: "Compare prices", desc: "Partner pharmacies near your ZIP code." },
      { title: "Get it delivered", desc: "Pay with PIX or card — pickup or delivery." },
    ],
    cta: "Search medications",
  },
  buyingClub: {
    badge: "Buying Club",
    title: "Buy together, pay less",
    sub: "Join group purchases for medications and unlock negotiated discounts when the group reaches its goal.",
    points: [
      "Search medications in the Doctor8 catalog",
      "Create or join buying groups",
      "Invite friends and family to grow the discount",
      "Exclusive benefit for Club Doctor subscribers",
    ],
    cta: "Explore Buying Club",
  },
  compare: {
    eyebrow: "Why Doctor8",
    title: "Doctor8 vs. other platforms",
    sub: "Why patients choose the Doctor8 ecosystem.",
    headers: { them: "Others", focus: "Focus", doctor8: "Doctor8" },
    rows: [
      { them: "One-off consult apps", focus: "Telemedicine only", doctor8: "Telemedicine + Club + pharmacy + EAP" },
      { them: "Traditional health plans", focus: "Expensive and bureaucratic", doctor8: "Affordable Club Doctor + pay-per-visit" },
      { them: "Generic marketplaces", focus: "Professional listings", doctor8: "Integrated records, clinical scales and continuity" },
    ],
  },
  how: {
    eyebrow: "Simple as that", title: "Online consultation in 3 steps",
    sub: "No queues, no commute. Consult from the comfort of your home.",
    steps: [
      { title: "Create your account", desc: "Sign up for free with email or Google. Takes less than 2 minutes." },
      { title: "Choose a specialist", desc: "Search by specialty, see available slots, and choose the right professional." },
      { title: "Consult & manage your health", desc: "Pay securely, join the teleconsultation, and keep your complete digital health record." },
    ],
  },
  specialties: {
    eyebrow: "Specialties", title: "Care for the whole family",
    sub: "Find specialists in over 80 health areas, available online or in-person.",
    items: [
      { title: "General Medicine", desc: "Triage, guidance, and general follow-up. The first step to your health." },
      { title: "Mental Health", desc: "Psychologists, psychiatrists, psychoanalysts and therapists for your emotional wellbeing." },
      { title: "Nutrition", desc: "Nutritionists and dietitians for healthy eating, weight loss, and performance." },
      { title: "Cardiology", desc: "Consultations with cardiologists for heart and cardiovascular care." },
      { title: "Physiotherapy", desc: "Rehabilitation, muscle pain, post-surgery care, and sports performance." },
      { title: "Medical Cannabis", desc: "Specialists in cannabinoid medicine with safe, legal prescriptions." },
      { title: "Dentistry", desc: "Dentists for consultations, prevention and oral treatments online or in-person." },
      { title: "Integrative Care", desc: "Integrative therapists, herbal medicine, flower essences and complementary practices." },
      { title: "Nursing", desc: "Nurses for monitoring, health education and clinical follow-up." },
    ],
  },
  club: {
    badge: "Club Doctor", title: "The plan that ", titleEm: "unlocks",
    sub: "For just R$34.90/month, access the complete Doctor8 professional network and book discounted teleconsultations. Cancel anytime.",
    disclaimer: "* Club Doctor is not a health insurance plan or emergency medical service. Consultations are billed separately.",
    benefits: [
      "Access to the full specialist network", "Doctors, psychologists, nutritionists and more",
      "100% online booking with immediate confirmation", "Secure payment before the teleconsultation",
      "Service in Brazil, US, Europe and Venezuela", "Dedicated support",
    ],
    priceLabel: "Club Doctor", period: "per month \u00b7 cancel anytime",
    includes: ["Access to Doctor8 network", "24/7 online booking", "Digital health record", "Documents & prescriptions", "Dedicated support"],
    cta: "Subscribe for R$34.90/month", cancel: "No commitment \u00b7 Cancel at any time",
  },
  cannabis: {
    badge: "Medical Cannabis", titleEm: "Cannabinoid medicine", titleRest: " with specialized professionals",
    sub: "Doctor8 has qualified professionals specialized in cannabinoid medicine. Safe, legal, and online prescriptions.",
    points: ["Specialized and certified professionals", "Online consultation with legal prescription", "Continuous treatment follow-up", "Complete documentation for importation"],
    cta: "Book consultation", conditionsHeader: "Conditions treated",
    tags: ["Chronic pain", "Anxiety", "Epilepsy", "Insomnia", "Fibromyalgia", "PTSD", "ASD", "ADHD", "Spasticity", "Autoimmune diseases", "Parkinson", "Oncology (Support)", "Alzheimer", "+ others"],
  },
  energy: {
    badge: "Doctor Energy", titleEm: "Club Doctor",
    sub: "Are you from Minas Gerais with a Cemig account? Your electricity bill could be up to 20% lower every month \u2014 exclusive to Club Doctor subscribers.",
    points: ["Guaranteed savings on your electricity bill", "No need to change providers", "Positive environmental impact", "Exclusive Club Doctor benefit"],
    cta: "I want to save", pctLabel: "savings on your electricity bill",
    disclaimer: "*For Club Doctor subscribers in MG with a Cemig account",
  },
  lgpd: {
    title: "Your data protected \u00b7 LGPD & HIPAA principles",
    body: "Doctor8 was built following the principles of Brazil's LGPD and US HIPAA. Your medical information is encrypted and never shared without your consent. Questions? Contact our DPO: dpo@doctor8.org",
  },
  cta: {
    titleEm: "Take care of your health", titleRest: " from anywhere",
    sub: "Sign up for free and book your first consultation today.",
    primary: "Create free account", secondary: "Club Doctor \u2014 R$34.90/month",
  },
  footer: {
    desc: "Digital health platform for patients and professionals. Architecture aligned with LGPD and HIPAA principles. Operating in Brazil, US, Europe and Venezuela.",
    services: "Services", ecosystem: "Ecosystem", professionals: "Professionals", legal: "Legal",
    serviceLinks: [
      { label: "Platform", href: "#platform" },
      { label: "Specialties", href: "#specialties" },
      { label: "Club Doctor", href: "#club" },
      { label: "Medical Cannabis", href: "#cannabis" },
      { label: "Doctor Energy", href: "#energy" },
    ],
    ecosystemLinks: [
      { label: "Immediate care", href: "#urgent" },
      { label: "Pharmacy network", href: "/farmacias/buscar" },
      { label: "Buying Club", href: "#buying-club" },
      { label: "Corporate benefit", href: "/empresas/colaborador" },
      { label: "AcuraBrasil", href: "/sos-venezuela" },
      { label: "About the ecosystem", href: "/pacientes" },
    ],
    proLinks: ["Register as professional", "Sign in as doctor"],
    proDoctorLogin: "Sign in as doctor",
    proPsychologistLogin: "Sign in as psychologist",
    proPsychoanalystLogin: "Sign in as psychoanalyst",
    proIntegrativeLogin: "Integrative therapist",
    proNutritionistLogin: "Nutritionist",
    proOrganizationLogin: "Clinic / organization",
    proAngelLogin: "Angel volunteer",
    legalLinks: ["Privacy Policy", "Terms of Service", "LGPD", "DPO"],
    copyright: "\u00a9 2026 Doctor8. All rights reserved.",
  },
  cookie: {
    text: "We use cookies to improve your experience. By continuing, you agree to our",
    accept: "Accept", decline: "Decline",
  },
  platform: {
    eyebrow: "Your patient area",
    title: "Everything you need to manage your health",
    sub: "Create your free account and access a complete dashboard \u2014 appointments, records, medications, documents and more.",
    footerNote: "Already have an account?",
    loginLink: "Sign in to the platform",
    items: {
      dashboard: { labelKey: "nav.dashboard", desc: "Overview of your health, upcoming appointments and important alerts." },
      history: { labelKey: "nav.medicalHistory", desc: "Complete clinical history, always accessible and secure." },
      medications: { labelKey: "nav.medications", desc: "Medication tracking, reminders and sharing with doctors." },
      buyingClub: { labelKey: "nav.buyingClub", desc: "Exclusive discounts on partner health products." },
      prescriptions: { labelKey: "nav.myPrescriptions", desc: "Digital prescriptions and renewals in one place." },
      examRequests: { labelKey: "nav.myExamRequests", desc: "Lab and imaging orders from your doctors." },
      doctorResources: { labelKey: "nav.doctorResources", desc: "Materials, links and files shared by your doctors." },
      appointments: { labelKey: "nav.appointments", desc: "Book, pay and join teleconsultations from the app." },
      documents: { labelKey: "nav.documents", desc: "Exams, reports and medical files organized." },
      messages: { labelKey: "nav.messages", desc: "Chat securely with your healthcare professionals." },
      urgent: { labelKey: "nav.urgent", desc: "Immediate online care when you need urgent attention." },
      find: { labelKey: "nav.find", desc: "Find professionals by map, specialty and insurance." },
      account: { labelKey: "nav.account", desc: "Profile, language, password and account preferences." },
    },
  },
};

const es: LandingContent = {
  ...en,
  nav: {
    how: "C\u00f3mo funciona", specialties: "Especialidades", club: "Club Doctor", cannabis: "Cannabis",
    energy: "Doctor Energy", urgent: "Urgencias", pharmacy: "Farmacia", ecosystem: "Ecosistema",
    signIn: "Iniciar sesi\u00f3n", signUp: "Registrarse",
    groupAbout: "Conoce", groupCare: "Atenci\u00f3n", groupBenefits: "Beneficios",
  },
  heroCtas: {
    urgent: "Atenci\u00f3n inmediata",
    register: "Crear cuenta gratis",
    corporate: "Beneficio corporativo",
  },
  trust: ["Datos cifrados", "LGPD & HIPAA", "Brasil, EE.UU., Europa y Venezuela", "Pago seguro", "100% online"],
  stats: [
    { value: "80+", label: "especialidades m\u00e9dicas y de salud" },
    { value: "R$34,90", label: "Club Doctor por mes" },
    { value: "24/7", label: "agendamiento online" },
    { value: "4", label: "pa\u00edses atendidos" },
  ],
  ecosystem: {
    eyebrow: "Por qu\u00e9 Doctor8",
    title: "M\u00e1s que telemedicina \u2014 un ecosistema completo de salud",
    sub: "Del primer s\u00edntoma al seguimiento continuo, con datos protegidos y profesionales verificados.",
    pillars: [
      { title: "Consultas online en minutos", desc: "Busca por especialidad, s\u00edntoma o seguro. Teleconsulta segura, presencial o urgencias inmediatas." },
      { title: "Tus datos, tus reglas", desc: "Historial cifrado, alineado a LGPD e HIPAA. T\u00fa controlas qui\u00e9n accede a tu historial." },
      { title: "Club Doctor", desc: "Acceso a la red completa, tarjeta de sellos, descuentos en medicamentos y ex\u00e1menes \u2014 R$34,90/mes." },
      { title: "Cannabis, farmacia y bienestar", desc: "Medicina cannabinoide, red de farmacias, compras colectivas y beneficios exclusivos." },
    ],
  },
  jit: {
    badge: "Urgencias JIT",
    title: "¿Necesitas atenci\u00f3n ",
    titleHighlight: "ahora?",
    sub: "Cola en tiempo real con profesionales online. Sin agendar con d\u00edas de anticipaci\u00f3n \u2014 entra en la fila y consulta en minutos.",
    points: [
      "Atenci\u00f3n inmediata cuando no puedes esperar",
      "B\u00fasqueda por especialidad disponible en guardia",
      "Pago seguro antes de entrar en la fila",
      "Comparte tu historial con el profesional",
    ],
    cta: "Acceder a urgencias",
  },
  eap: {
    eyebrow: "Beneficio corporativo",
    title: "¿Tu empresa ofrece Doctor8? Activa tu EAP en pocos clics.",
    body: "Colaboradores con beneficio corporativo acceden a sesiones de psicolog\u00eda, rutas de bienestar y pulse check-in \u2014 con total confidencialidad. RRHH ve solo m\u00e9tricas agregadas.",
    bullets: [
      "Activa con la invitaci\u00f3n recibida por email de la empresa",
      "Sesiones confidenciales con psic\u00f3logos CRP acreditados",
      "Rutas psicoeducativas y contenido de bienestar",
      "Email corporativo no siempre requerido (seg\u00fan pol\u00edtica de RRHH)",
    ],
    cta: "Activar mi beneficio",
  },
  pharmacy: {
    badge: "Red de farmacias",
    title: "De la receta digital a la farmacia cerca de ti",
    sub: "Recibe la prescripci\u00f3n del m\u00e9dico, compara precios por proximidad y pide entrega o retiro en la red Doctor8.",
    steps: [
      { title: "Receta digital", desc: "PDF firmado con QR para validaci\u00f3n en mostrador." },
      { title: "Compara precios", desc: "Farmacias asociadas cerca de tu c\u00f3digo postal." },
      { title: "Recibe en casa", desc: "Paga con PIX o tarjeta \u2014 retiro o entrega." },
    ],
    cta: "Buscar medicamentos",
  },
  buyingClub: {
    badge: "Buying Club",
    title: "Compra en grupo, paga menos",
    sub: "Únete a compras colectivas de medicamentos y desbloquea descuentos cuando el grupo alcanza la meta.",
    points: [
      "Busca medicamentos en el cat\u00e1logo Doctor8",
      "Crea o \u00fanete a grupos de compra",
      "Invita amigos y familiares para ampliar el descuento",
      "Beneficio exclusivo para suscriptores Club Doctor",
    ],
    cta: "Conocer el Buying Club",
  },
  compare: {
    eyebrow: "Por qu\u00e9 Doctor8",
    title: "Doctor8 vs. otras plataformas",
    sub: "Por qu\u00e9 los pacientes eligen el ecosistema Doctor8.",
    headers: { them: "Otros", focus: "Enfoque", doctor8: "Doctor8" },
    rows: [
      { them: "Apps de consulta suelta", focus: "Solo telemedicina", doctor8: "Telemedicina + Club + farmacia + EAP" },
      { them: "Planes de salud tradicionales", focus: "Caros y burocr\u00e1ticos", doctor8: "Club Doctor accesible + consultas sueltas" },
      { them: "Marketplaces gen\u00e9ricos", focus: "Lista de profesionales", doctor8: "Historial integrado, escalas cl\u00ednicas y continuidad" },
    ],
  },
  how: {
    eyebrow: "As\u00ed de simple", title: "Consulta online en 3 pasos",
    sub: "Sin filas, sin desplazamiento. Consulta desde la comodidad de tu casa.",
    steps: [
      { title: "Crea tu cuenta", desc: "Reg\u00edstrate gratis con email o Google. Toma menos de 2 minutos." },
      { title: "Elige el especialista", desc: "Busca por especialidad, ve horarios disponibles y elige al profesional ideal." },
      { title: "Consulta y gestiona tu salud", desc: "Paga con seguridad, entra a la teleconsulta y guarda tu historial m\u00e9dico digital." },
    ],
  },
  specialties: {
    eyebrow: "Especialidades", title: "Cuidado para toda la familia",
    sub: "Encuentra especialistas en m\u00e1s de 80 \u00e1reas de salud, disponibles online o presencialmente.",
    items: [
      { title: "Medicina General", desc: "Triaje, orientaci\u00f3n y seguimiento general." },
      { title: "Salud Mental", desc: "Psic\u00f3logos, psiquiatras y terapeutas para tu bienestar emocional." },
      { title: "Nutrici\u00f3n", desc: "Nutricionistas para alimentaci\u00f3n saludable y rendimiento." },
      { title: "Cardiolog\u00eda", desc: "Consultas con cardi\u00f3logos para el cuidado cardiovascular." },
      { title: "Fisioterapia", desc: "Rehabilitaci\u00f3n, dolor muscular y rendimiento deportivo." },
      { title: "Cannabis Medicinal", desc: "Especialistas en medicina cannabinoide con prescripci\u00f3n legal." },
      { title: "Odontolog\u00eda", desc: "Dentistas para consultas, prevenci\u00f3n y tratamientos bucales." },
      { title: "Cuidado Integrativo", desc: "Terapeutas integrativos, fitoterapia, florais y pr\u00e1cticas complementarias." },
      { title: "Enfermer\u00eda", desc: "Enfermeros para monitoreo, educaci\u00f3n en salud y seguimiento cl\u00ednico." },
    ],
  },
  cannabis: {
    ...en.cannabis,
    badge: "Cannabis Medicinal",
    titleEm: "Medicina cannabinoide",
    titleRest: " con profesionales especializados",
    sub: "Doctor8 cuenta con profesionales calificados en medicina cannabinoide. Prescripci\u00f3n segura, legal y online.",
    points: [
      "Profesionales especializados y certificados",
      "Consulta online con prescripci\u00f3n legal",
      "Seguimiento continuo del tratamiento",
      "Documentaci\u00f3n completa para importaci\u00f3n",
    ],
    cta: "Agendar consulta",
    conditionsHeader: "Condiciones tratadas",
    tags: ["Dolor cr\u00f3nico", "Ansiedad", "Epilepsia", "Insomnio", "Fibromialgia", "PTSD", "TEA", "TDAH", "Espasticidad", "Enfermedades autoinmunes", "Parkinson", "Oncolog\u00eda (Soporte)", "Alzheimer", "+ otras"],
  },
  lgpd: {
    title: "Tus datos protegidos \u00b7 principios LGPD e HIPAA",
    body: "Doctor8 fue desarrollada siguiendo los principios de la LGPD brasile\u00f1a y del HIPAA estadounidense. Tu informaci\u00f3n m\u00e9dica est\u00e1 cifrada y nunca se comparte sin tu consentimiento. \u00bfPreguntas? Contacta a nuestro DPO: dpo@doctor8.org",
  },
  cta: {
    titleEm: "Cuida tu salud", titleRest: " desde donde est\u00e9s",
    sub: "Reg\u00edstrate gratis y agenda tu primera consulta hoy.",
    primary: "Crear cuenta gratis", secondary: "Club Doctor \u2014 R$34,90/m\u00eas",
  },
  footer: {
    ...en.footer,
    desc: "Plataforma de salud digital para pacientes y profesionales. Arquitectura alineada a los principios LGPD e HIPAA. Brasil, EE.UU., Europa y Venezuela.",
    services: "Servicios", ecosystem: "Ecosistema",
    serviceLinks: [
      { label: "Plataforma", href: "#platform" },
      { label: "Especialidades", href: "#specialties" },
      { label: "Club Doctor", href: "#club" },
      { label: "Cannabis Medicinal", href: "#cannabis" },
      { label: "Doctor Energy", href: "#energy" },
    ],
    ecosystemLinks: [
      { label: "Urgencias inmediatas", href: "#urgent" },
      { label: "Red de farmacias", href: "/farmacias/buscar" },
      { label: "Buying Club", href: "#buying-club" },
      { label: "Beneficio corporativo", href: "/empresas/colaborador" },
      { label: "AcuraBrasil", href: "/sos-venezuela" },
      { label: "Sobre el ecosistema", href: "/pacientes" },
    ],
    proDoctorLogin: "Iniciar sesión como médico",
    proPsychologistLogin: "Iniciar sesión como psicólogo",
    proPsychoanalystLogin: "Iniciar sesión como psicanalista",
    proIntegrativeLogin: "Terapeuta integrativo",
    proNutritionistLogin: "Nutricionista",
    proOrganizationLogin: "Clínica / CNPJ",
    proAngelLogin: "Voluntario anjo",
    copyright: "\u00a9 2026 Doctor8. Todos los derechos reservados.",
  },
  cookie: { text: "Usamos cookies para mejorar tu experiencia. Al continuar, aceptas nuestra", accept: "Aceptar", decline: "Rechazar" },
  platform: {
    eyebrow: "Tu \u00e1rea de paciente",
    title: "Todo lo que necesitas para cuidar tu salud",
    sub: "Al crear tu cuenta gratis, accedes a un panel completo: consultas, historial, medicamentos, documentos y m\u00e1s.",
    footerNote: "\u00bfYa tienes cuenta?",
    loginLink: "Iniciar sesi\u00f3n",
    items: {
      dashboard: { labelKey: "nav.dashboard", desc: "Resumen de tu salud, pr\u00f3ximas consultas y alertas." },
      history: { labelKey: "nav.medicalHistory", desc: "Historial cl\u00ednico completo, seguro y accesible." },
      medications: { labelKey: "nav.medications", desc: "Control de medicamentos, recordatorios y compartir con m\u00e9dicos." },
      buyingClub: { labelKey: "nav.buyingClub", desc: "Descuentos exclusivos en productos de salud." },
      prescriptions: { labelKey: "nav.myPrescriptions", desc: "Recetas digitales y renovaciones en un solo lugar." },
      examRequests: { labelKey: "nav.myExamRequests", desc: "Pedidos de laboratorio e imagen de sus m\u00e9dicos." },
      doctorResources: { labelKey: "nav.doctorResources", desc: "Materiales, enlaces y archivos compartidos por sus m\u00e9dicos." },
      appointments: { labelKey: "nav.appointments", desc: "Agenda, paga y entra a la teleconsulta." },
      documents: { labelKey: "nav.documents", desc: "Ex\u00e1menes, informes y archivos m\u00e9dicos organizados." },
      messages: { labelKey: "nav.messages", desc: "Chatea de forma segura con tus profesionales." },
      urgent: { labelKey: "nav.urgent", desc: "Atenci\u00f3n inmediata online cuando lo necesites." },
      find: { labelKey: "nav.find", desc: "Encuentra profesionales por mapa y especialidad." },
      account: { labelKey: "nav.account", desc: "Perfil, idioma y preferencias de la cuenta." },
    },
  },
};

export function getLandingContent(lang: Lang): LandingContent {
  if (lang === "pt") return pt;
  if (lang === "es") return es;
  return en;
}

