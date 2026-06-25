import type { Lang } from "@/lib/i18n/translations";

export type LandingContent = {
  nav: { how: string; specialties: string; club: string; cannabis: string; energy: string; signIn: string; signUp: string };
  trust: string[];
  how: { eyebrow: string; title: string; sub: string; steps: { title: string; desc: string }[] };
  specialties: { eyebrow: string; title: string; sub: string; items: { title: string; desc: string }[] };
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
    desc: string; services: string; professionals: string; legal: string;
    serviceLinks: string[]; proLinks: string[]; legalLinks: string[];
    copyright: string;
  };
  cookie: { text: string; accept: string; decline: string };
};

const pt: LandingContent = {
  nav: { how: "Como funciona", specialties: "Especialidades", club: "Club Doctor", cannabis: "Cannabis", energy: "Doctor Energy", signIn: "Entrar", signUp: "Cadastre-se" },
  trust: ["Dados criptografados", "LGPD & HIPAA", "Brasil, EUA e Europa", "Pagamento seguro", "100% online"],
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
    ],
  },
  club: {
    badge: "Club Doctor", title: "O plano que ", titleEm: "desbloqueia",
    sub: "Por apenas R$34,90/m\u00eas, voc\u00ea acessa a rede completa de profissionais Doctor8 e agenda teleconsultas com desconto. Cancele quando quiser.",
    disclaimer: "* O Club Doctor n\u00e3o \u00e9 plano de sa\u00fade nem servi\u00e7o de emerg\u00eancia m\u00e9dica. As consultas s\u00e3o cobradas separadamente.",
    benefits: [
      "Acesso \u00e0 rede completa de especialistas", "M\u00e9dicos, psic\u00f3logos, nutricionistas e mais",
      "Agendamento 100% online com confirma\u00e7\u00e3o imediata", "Pagamento seguro antes da teleconsulta",
      "Atendimento no Brasil, EUA e Europa", "Suporte dedicado",
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
    tags: ["Dor cr\u00f4nica", "Ansiedade", "Epilepsia", "Ins\u00f4nia", "Fibromialgia", "PTSD", "Espasticidade", "Doen\u00e7as autoimunes", "Parkinson", "N\u00e1useas (oncologia)", "Alzheimer", "+ outras"],
  },
  energy: {
    badge: "Doctor Energy", titleEm: "Club Doctor",
    sub: "Voc\u00ea \u00e9 de Minas Gerais e tem conta na Cemig? Sua conta de luz pode vir at\u00e9 20% mais baixa todo m\u00eas \u2014 exclusivo para assinantes do Club Doctor.",
    points: ["Economia garantida na conta de luz", "Sem trocar de fornecedora", "Impacto positivo no meio ambiente", "Benef\u00edcio exclusivo do Club Doctor"],
    cta: "Quero economizar", pctLabel: "de desconto na conta de luz",
    disclaimer: "*Para assinantes do Club Doctor residentes em MG com conta Cemig",
  },
  lgpd: {
    title: "Seus dados protegidos \u00b7 LGPD & HIPAA",
    body: "A Doctor8 \u00e9 plenamente compat\u00edvel com a Lei Geral de Prote\u00e7\u00e3o de Dados (LGPD) e com o HIPAA americano. Suas informa\u00e7\u00f5es m\u00e9dicas s\u00e3o criptografadas e jamais compartilhadas sem seu consentimento.",
  },
  cta: {
    titleEm: "Cuide da sua sa\u00fade", titleRest: " de onde voc\u00ea estiver",
    sub: "Cadastre-se gratuitamente e agende sua primeira consulta hoje.",
    primary: "Criar conta gr\u00e1tis", secondary: "Club Doctor \u2014 R$34,90/m\u00eas",
  },
  footer: {
    desc: "Plataforma de sa\u00fade digital para pacientes e profissionais. Conforme LGPD e HIPAA. Atua\u00e7\u00e3o no Brasil, EUA e Europa.",
    services: "Servi\u00e7os", professionals: "Profissionais", legal: "Legal",
    serviceLinks: ["Especialidades", "Club Doctor", "Cannabis Medicinal", "Doctor Energy"],
    proLinks: ["Cadastre-se como profissional", "Entrar na plataforma"],
    legalLinks: ["Pol\u00edtica de Privacidade", "Termos de Uso", "LGPD", "DPO"],
    copyright: "\u00a9 2026 Doctor8. Todos os direitos reservados.",
  },
  cookie: {
    text: "Usamos cookies para melhorar sua experi\u00eancia. Ao continuar, voc\u00ea concorda com nossa",
    accept: "Aceitar", decline: "Recusar",
  },
};

const en: LandingContent = {
  nav: { how: "How it works", specialties: "Specialties", club: "Club Doctor", cannabis: "Cannabis", energy: "Doctor Energy", signIn: "Sign in", signUp: "Sign up" },
  trust: ["Encrypted data", "LGPD & HIPAA", "Brazil, US & Europe", "Secure payment", "100% online"],
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
    ],
  },
  club: {
    badge: "Club Doctor", title: "The plan that ", titleEm: "unlocks",
    sub: "For just R$34.90/month, access the complete Doctor8 professional network and book discounted teleconsultations. Cancel anytime.",
    disclaimer: "* Club Doctor is not a health insurance plan or emergency medical service. Consultations are billed separately.",
    benefits: [
      "Access to the full specialist network", "Doctors, psychologists, nutritionists and more",
      "100% online booking with immediate confirmation", "Secure payment before the teleconsultation",
      "Service in Brazil, US and Europe", "Dedicated support",
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
    tags: ["Chronic pain", "Anxiety", "Epilepsy", "Insomnia", "Fibromyalgia", "PTSD", "Spasticity", "Autoimmune diseases", "Parkinson", "Nausea (oncology)", "Alzheimer", "+ others"],
  },
  energy: {
    badge: "Doctor Energy", titleEm: "Club Doctor",
    sub: "Are you from Minas Gerais with a Cemig account? Your electricity bill could be up to 20% lower every month \u2014 exclusive to Club Doctor subscribers.",
    points: ["Guaranteed savings on your electricity bill", "No need to change providers", "Positive environmental impact", "Exclusive Club Doctor benefit"],
    cta: "I want to save", pctLabel: "savings on your electricity bill",
    disclaimer: "*For Club Doctor subscribers in MG with a Cemig account",
  },
  lgpd: {
    title: "Your data protected \u00b7 LGPD & HIPAA",
    body: "Doctor8 is fully compliant with Brazil's LGPD and the US HIPAA. Your medical information is encrypted and never shared without your consent.",
  },
  cta: {
    titleEm: "Take care of your health", titleRest: " from anywhere",
    sub: "Sign up for free and book your first consultation today.",
    primary: "Create free account", secondary: "Club Doctor \u2014 R$34.90/month",
  },
  footer: {
    desc: "Digital health platform for patients and professionals. LGPD and HIPAA compliant. Operating in Brazil, US and Europe.",
    services: "Services", professionals: "Professionals", legal: "Legal",
    serviceLinks: ["Specialties", "Club Doctor", "Medical Cannabis", "Doctor Energy"],
    proLinks: ["Register as professional", "Sign into platform"],
    legalLinks: ["Privacy Policy", "Terms of Service", "LGPD", "DPO"],
    copyright: "\u00a9 2026 Doctor8. All rights reserved.",
  },
  cookie: {
    text: "We use cookies to improve your experience. By continuing, you agree to our",
    accept: "Accept", decline: "Decline",
  },
};

const es: LandingContent = {
  ...en,
  nav: { how: "C\u00f3mo funciona", specialties: "Especialidades", club: "Club Doctor", cannabis: "Cannabis", energy: "Doctor Energy", signIn: "Iniciar sesi\u00f3n", signUp: "Registrarse" },
  trust: ["Datos cifrados", "LGPD & HIPAA", "Brasil, EE.UU. y Europa", "Pago seguro", "100% online"],
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
    ],
  },
  cta: {
    titleEm: "Cuida tu salud", titleRest: " desde donde est\u00e9s",
    sub: "Reg\u00edstrate gratis y agenda tu primera consulta hoy.",
    primary: "Crear cuenta gratis", secondary: "Club Doctor \u2014 R$34,90/mes",
  },
  footer: { ...en.footer, desc: "Plataforma de salud digital para pacientes y profesionales. Conforme LGPD y HIPAA.", copyright: "\u00a9 2026 Doctor8. Todos los derechos reservados." },
  cookie: { text: "Usamos cookies para mejorar tu experiencia. Al continuar, aceptas nuestra", accept: "Aceptar", decline: "Rechazar" },
};

export function getLandingContent(lang: Lang): LandingContent {
  if (lang === "pt") return pt;
  if (lang === "es") return es;
  return en;
}

export const SPECIALTY_ICONS = ["\uD83E\uDE7A", "\uD83E\uDDE0", "\uD83E\uDD57", "\uD83E\uDEC0", "\uD83D\uDCAA", "\uD83C\uDF3F"];
