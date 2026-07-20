import { doctor8ContactWhatsAppHref } from "@/lib/doctor8-contact-whatsapp";
import {
  DENTIST_REGISTER,
  DISTRIBUTOR_LOGIN,
  DISTRIBUTOR_REGISTER,
  EMPLOYER_LOGIN,
  EMPLOYER_REGISTER,
  INTEGRATIVE_REGISTER,
  LABORATORY_LOGIN,
  LABORATORY_REGISTER,
  NUTRITIONIST_REGISTER,
  NURSE_REGISTER,
  ORGANIZATION_REGISTER,
  PHARMACIST_REGISTER,
  PHARMACY_STORE_LOGIN,
  PHARMACY_STORE_REGISTER,
  PROFESSIONAL_REGISTER,
  PSYCHOANALYST_REGISTER,
  PSYCHOLOGIST_REGISTER,
} from "@/lib/auth-portals";

export type MarketingLeadInterest =
  | "empresas"
  | "clinica"
  | "especialistas"
  | "farmacias"
  | "laboratorios"
  | "distribuidores"
  | "parceiros"
  | "humanitario"
  | "pacientes"
  | "outro";

export type MarketingAudienceCard = {
  id: string;
  anchor: string;
  title: string;
  summary: string;
  score: "alto" | "medio" | "self";
  landingHref: string;
  loginHref: string;
  registerHref: string;
  whatsappMessage: string;
  bullets: string[];
};

export type MarketingAccessRow = {
  persona: string;
  landing: { label: string; href: string };
  login: { label: string; href: string };
  register: { label: string; href: string };
};

export type MarketingProduct = {
  title: string;
  body: string;
  href: string;
};

export type MarketingSpecialty = {
  label: string;
  loginHref: string;
  registerHref: string;
};

export const MARKETING_HUB_META = {
  title: "Doctor8 — Ecossistema de saúde digital (mapa completo)",
  description:
    "Mapa comercial da Doctor8: empresas, profissionais, clínicas, farmácias, laboratórios, distribuidores, pacientes e programas humanitários — com landing, login e cadastro de cada perfil.",
};

export const MARKETING_LEAD_INTERESTS: {
  value: MarketingLeadInterest;
  label: string;
}[] = [
  { value: "empresas", label: "Empresa / RH / SST" },
  { value: "clinica", label: "Clínica / organização" },
  { value: "especialistas", label: "Profissional de saúde" },
  { value: "farmacias", label: "Farmácia" },
  { value: "laboratorios", label: "Laboratório" },
  { value: "distribuidores", label: "Distribuidor" },
  { value: "parceiros", label: "Parceiro / investidor / agência" },
  { value: "humanitario", label: "Humanitário / voluntário" },
  { value: "pacientes", label: "Paciente" },
  { value: "outro", label: "Outro" },
];

export const MARKETING_AUDIENCES: MarketingAudienceCard[] = [
  {
    id: "empresas",
    anchor: "empresas",
    title: "Empresas",
    summary: "NR-1, EAP, PCMSO e eSocial no mesmo contrato.",
    score: "alto",
    landingHref: "/empresas",
    loginHref: EMPLOYER_LOGIN,
    registerHref: EMPLOYER_REGISTER,
    whatsappMessage:
      "Olá, vi o mapa em /marketing. Sou empresa (RH/SST) e quero entender como começar com a Doctor8.",
    bullets: [
      "Inventário NR-1, AEP e plano de ação",
      "EAP com psicólogos CRP",
      "Exames/ASO e eSocial",
    ],
  },
  {
    id: "especialistas",
    anchor: "especialistas",
    title: "Profissionais",
    summary: "Teleconsulta, prontuário, receitas e rede EAP.",
    score: "medio",
    landingHref: "/especialistas",
    loginHref: "/login",
    registerHref: PROFESSIONAL_REGISTER,
    whatsappMessage:
      "Olá, vi o mapa em /marketing. Sou profissional de saúde e quero conhecer a Doctor8.",
    bullets: [
      "Agenda, vídeo e prontuário",
      "Prescrições com validade legal",
      "Rede corporativa e plantão JIT",
    ],
  },
  {
    id: "clinica",
    anchor: "clinicas",
    title: "Clínicas",
    summary: "Organização CNPJ com multi-profissionais e faturamento.",
    score: "alto",
    landingHref: "/parceiros",
    loginHref: "/login?portal=organization",
    registerHref: ORGANIZATION_REGISTER,
    whatsappMessage:
      "Olá, vi o mapa em /marketing. Represento uma clínica/organização e quero uma conversa comercial.",
    bullets: [
      "Cadastro por CNPJ",
      "Equipe e agenda compartilhada",
      "Credenciamento na rede",
    ],
  },
  {
    id: "farmacias",
    anchor: "farmacias",
    title: "Farmácias",
    summary: "Publique preços e entre na rede Doctor8.",
    score: "alto",
    landingHref: "/farmacias",
    loginHref: PHARMACY_STORE_LOGIN,
    registerHref: PHARMACY_STORE_REGISTER,
    whatsappMessage:
      "Olá, vi o mapa em /marketing. Sou farmácia e quero cadastrar minha drogaria na rede Doctor8.",
    bullets: [
      "Importação CSV de preços",
      "Busca por proximidade",
      "Portal do farmacêutico",
    ],
  },
  {
    id: "laboratorios",
    anchor: "laboratorios",
    title: "Laboratórios",
    summary: "Publique exames e preços para a rede.",
    score: "alto",
    landingHref: "/laboratorios",
    loginHref: LABORATORY_LOGIN,
    registerHref: LABORATORY_REGISTER,
    whatsappMessage:
      "Olá, vi o mapa em /marketing. Sou laboratório e quero publicar exames na Doctor8.",
    bullets: ["Catálogo de exames", "Preços e endereço", "Onboarding gratuito"],
  },
  {
    id: "distribuidores",
    anchor: "distribuidores",
    title: "Distribuidores",
    summary: "Portal de fornecedores (importação D2C / US).",
    score: "alto",
    landingHref: "/distribuidores",
    loginHref: DISTRIBUTOR_LOGIN,
    registerHref: DISTRIBUTOR_REGISTER,
    whatsappMessage:
      "Olá, vi o mapa em /marketing. Sou distribuidor e quero entender o portal Doctor8.",
    bullets: [
      "Cadastro de fornecedor",
      "Pedidos com clearance",
      "Operação com aprovação Doctor8",
    ],
  },
  {
    id: "pacientes",
    anchor: "pacientes",
    title: "Pacientes",
    summary: "Agende consultas e acompanhe sua saúde.",
    score: "self",
    landingHref: "/pacientes",
    loginHref: "/login",
    registerHref: "/register",
    whatsappMessage:
      "Olá, vi o mapa em /marketing. Sou paciente e preciso de ajuda para começar.",
    bullets: [
      "Teleconsulta e agendamento",
      "Histórico e receitas",
      "Club Doctor e benefícios",
    ],
  },
  {
    id: "humanitario",
    anchor: "humanitario",
    title: "Humanitário",
    summary: "Atendimento voluntário e missões de impacto.",
    score: "medio",
    landingHref: "/humanitarian",
    loginHref: "/humanitarian/angel/login",
    registerHref: "/register/angel",
    whatsappMessage:
      "Olá, vi o mapa em /marketing. Quero saber sobre o programa humanitário / voluntariado Doctor8.",
    bullets: [
      "SOS Venezuela e AcuraBrasil",
      "Fila de voluntários",
      "Pacientes humanitários",
    ],
  },
  {
    id: "parceiros",
    anchor: "parceiros",
    title: "Parceiros",
    summary: "Educação, buying club, APIs e alianças.",
    score: "alto",
    landingHref: "/parceiros",
    loginHref: "/login",
    registerHref: "/parceiros",
    whatsappMessage:
      "Olá, vi o mapa em /marketing. Sou parceiro/investidor/agência e quero falar com a Doctor8.",
    bullets: ["Cursos e certificados", "Buying clubs", "Integrações e APIs"],
  },
];

export const MARKETING_PRODUCTS: MarketingProduct[] = [
  {
    title: "Teleconsulta",
    body: "Salas de vídeo com TCLE, privacidade por sessão e fluxo clínico completo.",
    href: "/especialistas",
  },
  {
    title: "Prontuário eletrônico",
    body: "Notas clínicas, anamnese, escalas e histórico com trilha de auditoria.",
    href: "/especialistas",
  },
  {
    title: "Prescrições digitais",
    body: "Receitas com validade legal e integração à rede de farmácias.",
    href: "/especialistas",
  },
  {
    title: "Doctor8 Empresas",
    body: "NR-1, EAP, PCMSO, exames/ASO e eSocial em um painel B2B.",
    href: "/empresas",
  },
  {
    title: "Rede de farmácias",
    body: "Preços publicados, busca por proximidade e dispensação.",
    href: "/farmacias",
  },
  {
    title: "Rede de laboratórios",
    body: "Exames e preços para pacientes e profissionais da rede.",
    href: "/laboratorios",
  },
  {
    title: "Clínicas e organizações",
    body: "Multi-profissionais, faturamento e gestão centralizada.",
    href: "/register/organization",
  },
  {
    title: "Medicina integrativa",
    body: "PICS, florais, fitoterapia e catálogo com prescrição.",
    href: "/medicinaintegrativa",
  },
  {
    title: "Cursos e educação",
    body: "Conteúdo para profissionais com certificados na plataforma.",
    href: "/cursos",
  },
  {
    title: "Atendimento humanitário",
    body: "Filas voluntárias, anjos e programas de impacto social.",
    href: "/humanitarian",
  },
  {
    title: "Distribuidores",
    body: "Portal de fornecedores para pedidos de importação.",
    href: "/distribuidores",
  },
  {
    title: "Paciente / Club Doctor",
    body: "Agendamento, histórico, benefícios e acesso à rede.",
    href: "/pacientes",
  },
];

export const MARKETING_SPECIALTIES: MarketingSpecialty[] = [
  {
    label: "Médico",
    loginHref: "/login?portal=doctor",
    registerHref: PROFESSIONAL_REGISTER,
  },
  {
    label: "Psicólogo",
    loginHref: "/login?portal=psychologist",
    registerHref: PSYCHOLOGIST_REGISTER,
  },
  {
    label: "Psicanalista",
    loginHref: "/login?portal=psychoanalyst",
    registerHref: PSYCHOANALYST_REGISTER,
  },
  {
    label: "Terapeuta integrativo",
    loginHref: "/login?portal=integrative",
    registerHref: INTEGRATIVE_REGISTER,
  },
  {
    label: "Nutricionista",
    loginHref: "/login?portal=nutritionist",
    registerHref: NUTRITIONIST_REGISTER,
  },
  {
    label: "Enfermeiro",
    loginHref: "/login?portal=nurse",
    registerHref: NURSE_REGISTER,
  },
  {
    label: "Farmacêutico",
    loginHref: "/login?portal=pharmacist",
    registerHref: PHARMACIST_REGISTER,
  },
  {
    label: "Dentista",
    loginHref: "/login?portal=dentist",
    registerHref: DENTIST_REGISTER,
  },
  {
    label: "Fisioterapeuta",
    loginHref: "/login?portal=physiotherapist",
    registerHref: `${PROFESSIONAL_REGISTER}?portal=physiotherapist&profession=fisioterapeuta`,
  },
  {
    label: "Organização / clínica",
    loginHref: "/login?portal=organization",
    registerHref: ORGANIZATION_REGISTER,
  },
  {
    label: "Médico do trabalho",
    loginHref: "/empresas/medico/login",
    registerHref: "/empresas/medico/cadastro",
  },
  {
    label: "Psicólogo EAP",
    loginHref: "/empresas/psicologo/login",
    registerHref: PSYCHOLOGIST_REGISTER,
  },
  {
    label: "Farmacêutico (loja)",
    loginHref: "/farmacias/farmaceutico/login",
    registerHref: PHARMACIST_REGISTER,
  },
  {
    label: "Anjo voluntário",
    loginHref: "/humanitarian/angel/login",
    registerHref: "/register/angel",
  },
];

export const MARKETING_ACCESS_ROWS: MarketingAccessRow[] = [
  {
    persona: "Empresa (RH / SST)",
    landing: { label: "Landing empresas", href: "/empresas" },
    login: { label: "Login empresa", href: EMPLOYER_LOGIN },
    register: { label: "Cadastro / demo", href: EMPLOYER_REGISTER },
  },
  {
    persona: "Médico do trabalho",
    landing: { label: "Landing empresas", href: "/empresas" },
    login: { label: "Login médico SST", href: "/empresas/medico/login" },
    register: { label: "Cadastro médico SST", href: "/empresas/medico/cadastro" },
  },
  {
    persona: "Psicólogo EAP",
    landing: { label: "Landing empresas", href: "/empresas" },
    login: { label: "Login EAP", href: "/empresas/psicologo/login" },
    register: { label: "Cadastro profissional", href: PSYCHOLOGIST_REGISTER },
  },
  {
    persona: "Profissional de saúde",
    landing: { label: "Landing especialistas", href: "/especialistas" },
    login: { label: "Login unificado", href: "/login" },
    register: { label: "Cadastro profissional", href: PROFESSIONAL_REGISTER },
  },
  {
    persona: "Clínica / organização",
    landing: { label: "Landing parceiros", href: "/parceiros" },
    login: { label: "Login organização", href: "/login?portal=organization" },
    register: { label: "Cadastro CNPJ", href: ORGANIZATION_REGISTER },
  },
  {
    persona: "Farmácia",
    landing: { label: "Landing farmácias", href: "/farmacias" },
    login: { label: "Login farmácia", href: PHARMACY_STORE_LOGIN },
    register: { label: "Cadastro farmácia", href: PHARMACY_STORE_REGISTER },
  },
  {
    persona: "Laboratório",
    landing: { label: "Landing labs", href: "/laboratorios" },
    login: { label: "Login laboratório", href: LABORATORY_LOGIN },
    register: { label: "Cadastro lab", href: LABORATORY_REGISTER },
  },
  {
    persona: "Distribuidor",
    landing: { label: "Landing distribuidores", href: "/distribuidores" },
    login: { label: "Login distribuidor", href: DISTRIBUTOR_LOGIN },
    register: { label: "Cadastro distribuidor", href: DISTRIBUTOR_REGISTER },
  },
  {
    persona: "Paciente",
    landing: { label: "Landing pacientes", href: "/pacientes" },
    login: { label: "Login paciente", href: "/login" },
    register: { label: "Cadastro paciente", href: "/register" },
  },
  {
    persona: "Humanitário / anjo",
    landing: { label: "Landing humanitário", href: "/humanitarian" },
    login: { label: "Login anjo", href: "/humanitarian/angel/login" },
    register: { label: "Cadastro anjo", href: "/register/angel" },
  },
  {
    persona: "Paciente humanitário",
    landing: { label: "Atendimento humanitário", href: "/atendimentohumanitario" },
    login: { label: "Entrar humanitário", href: "/atendimentohumanitario" },
    register: { label: "SOS Venezuela", href: "/sos-venezuela" },
  },
  {
    persona: "Cursos / educação",
    landing: { label: "Catálogo de cursos", href: "/cursos" },
    login: { label: "Login profissional", href: "/login" },
    register: { label: "Cadastro profissional", href: PROFESSIONAL_REGISTER },
  },
];

export const MARKETING_TRUST = [
  "LGPD e princípios HIPAA",
  "Conformidade com conselhos (CFM, CFP, CFF, CRO, COREN, CRN)",
  "NR-1 · NR-7 (PCMSO) · NR-17 (AEP) · eSocial",
  "Criptografia e trilha de auditoria",
  "Brasil · EUA · Europa",
  "Rede B2B + B2B2C no mesmo ecossistema",
];

export const MARKETING_MODEL_POINTS = [
  {
    title: "B2B recorrente",
    body: "Empresas, clínicas, farmácias e laboratórios com relacionamento longo e ticket relevante.",
  },
  {
    title: "Profissionais na rede",
    body: "Especialistas usam a plataforma no consultório e recebem demanda da rede (incluindo EAP).",
  },
  {
    title: "Pacientes e benefícios",
    body: "Agendamento, Club Doctor e acesso a farmácias, labs e programas corporativos.",
  },
];

export function marketingWhatsAppHref(message: string): string {
  return doctor8ContactWhatsAppHref(message);
}

export function marketingCommercialWhatsAppHref(): string {
  return doctor8ContactWhatsAppHref(
    "Olá, vi o mapa completo em /marketing e quero falar com o comercial da Doctor8.",
  );
}

export function marketingLeadWhatsAppHref(interest: MarketingLeadInterest, name?: string): string {
  const label =
    MARKETING_LEAD_INTERESTS.find((i) => i.value === interest)?.label ?? interest;
  const who = name?.trim() ? ` Meu nome é ${name.trim()}.` : "";
  return doctor8ContactWhatsAppHref(
    `Olá, enviei interesse pelo mapa /marketing (${label}).${who} Quero continuar a conversa.`,
  );
}
