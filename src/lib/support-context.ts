// Context helpers for the Doctor8 support AI — page-aware hints and suggested questions.

import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

export type SupportUserRole =
  | "PATIENT"
  | "PROFESSIONAL"
  | "PSYCHOANALYST"
  | "INTEGRATIVE_THERAPIST"
  | "ORGANIZATION"
  | "ADMIN"
  | "GUEST";

export type SupportContext = {
  pathname: string;
  role: SupportUserRole;
  isLoggedIn: boolean;
};

type PageHint = {
  match: (pathname: string) => boolean;
  hintPt: string;
  hintEn: string;
  hintEs: string;
};

const PAGE_HINTS: PageHint[] = [
  {
    match: (p) => p.startsWith("/patient/appointments"),
    hintPt: "O usuário está em Agendamentos (/patient/appointments). Priorize cancelamento, reagendamento, pagamento e entrada na videochamada.",
    hintEn: "User is on Appointments (/patient/appointments). Prioritize cancel, reschedule, payment, and joining the video call.",
    hintEs: "El usuario está en Citas (/patient/appointments). Priorice cancelación, reprogramación, pago y unirse a la videollamada.",
  },
  {
    match: (p) => p.startsWith("/patient/prescriptions"),
    hintPt: "O usuário está em Minhas receitas. Priorize download de PDF, assinatura digital e prazo de disponibilização pelo médico.",
    hintEn: "User is on My prescriptions. Prioritize PDF download, digital signature, and when the doctor makes it available.",
    hintEs: "El usuario está en Mis recetas. Priorice descarga PDF, firma digital y cuándo el médico la publica.",
  },
  {
    match: (p) => p.startsWith("/patient/medications"),
    hintPt: "O usuário está em Medicamentos. Priorize lista clínica, exportar PDF e comparar preços na farmácia parceira.",
    hintEn: "User is on Medications. Prioritize clinical list, PDF export, and pharmacy price comparison.",
    hintEs: "El usuario está en Medicamentos. Priorice lista clínica, exportar PDF y comparar precios en farmacia.",
  },
  {
    match: (p) => p.startsWith("/patient/history") || p.startsWith("/patient/medical-history"),
    hintPt: "O usuário está no histórico médico. Priorize preenchimento do questionário e compartilhamento com médicos.",
    hintEn: "User is on medical history. Prioritize filling the questionnaire and sharing with doctors.",
    hintEs: "El usuario está en historial médico. Priorice completar el cuestionario y compartir con médicos.",
  },
  {
    match: (p) => p.startsWith("/urgent"),
    hintPt: "O usuário está na fila de atendimento urgente (/urgent). Priorize pagamento, tempo de espera, cancelar fila e entrar na chamada.",
    hintEn: "User is on urgent care queue (/urgent). Prioritize payment, wait time, leaving queue, and joining the call.",
    hintEs: "El usuario está en la cola de urgencias (/urgent). Priorice pago, tiempo de espera, salir de la cola y unirse a la llamada.",
  },
  {
    match: (p) => p.startsWith(`/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`),
    hintPt: "O usuário está no SOS humanitário Venezuela. Priorize triagem, TCLE, verificação de telefone, fila por especialidade e videochamada.",
    hintEn: "User is on Venezuela humanitarian SOS. Prioritize triage, consent, phone verification, specialty queue, and video call.",
    hintEs: "El usuario está en SOS humanitario Venezuela. Priorice triaje, consentimiento, teléfono, cola por especialidad y videollamada.",
  },
  {
    match: (p) => p.startsWith("/humanitarian/volunteer"),
    hintPt: "O usuário é voluntário humanitário. Priorize ficar online, aceitar pacientes, handoff (Daily/WhatsApp/Meet) e encerrar atendimento.",
    hintEn: "User is a humanitarian volunteer. Prioritize going online, accepting patients, handoff options, and ending sessions.",
    hintEs: "El usuario es voluntario humanitario. Priorice ponerse en línea, aceptar pacientes, handoff y cerrar sesión.",
  },
  {
    match: (p) => p.startsWith("/professional/patients"),
    hintPt: "O usuário é profissional na ficha de pacientes. Priorize prontuário, evolução, receitas, pedidos de exame e assistente de notas com IA.",
    hintEn: "User is a professional on patient charts. Prioritize records, evolution notes, prescriptions, exam orders, and AI notes assistant.",
    hintEs: "El usuario es profesional en fichas de pacientes. Priorice historial, evolución, recetas, exámenes y asistente de notas con IA.",
  },
  {
    match: (p) => p.startsWith("/professional/jit") || p.startsWith("/psychologist/jit"),
    hintPt: "O usuário está no plantão (JIT). Priorize ativar plantão, pausar, fila de pacientes e atendimento imediato.",
    hintEn: "User is on on-call (JIT). Prioritize going online, pausing, patient queue, and immediate care.",
    hintEs: "El usuario está en guardia (JIT). Priorice activar guardia, pausar, cola de pacientes y atención inmediata.",
  },
  {
    match: (p) => p.startsWith("/professional/settings"),
    hintPt: "O usuário está nas configurações do profissional. Priorize verificação de perfil, assinatura digital ICP-Brasil e dados de consultório.",
    hintEn: "User is on professional settings. Prioritize profile verification, ICP-Brasil digital signature, and practice details.",
    hintEs: "El usuario está en configuración profesional. Priorice verificación de perfil, firma digital ICP-Brasil y datos del consultorio.",
  },
  {
    match: (p) => p.startsWith("/register") || p.startsWith("/login"),
    hintPt: "O usuário está em login ou cadastro. Priorize criar conta, verificar e-mail, escolher tipo (paciente/profissional) e login com Google.",
    hintEn: "User is on login or registration. Prioritize account creation, email verification, role selection, and Google login.",
    hintEs: "El usuario está en login o registro. Priorice crear cuenta, verificar correo, elegir rol y login con Google.",
  },
  {
    match: (p) => p.startsWith("/organization"),
    hintPt: "O usuário está no portal da clínica (CNPJ). Priorize agendamentos, pacientes, financeiro, convênios e equipe.",
    hintEn: "User is on the clinic (organization) portal. Prioritize appointments, patients, finance, insurance, and team.",
    hintEs: "El usuario está en el portal de clínica (organización). Priorice citas, pacientes, finanzas, convenios y equipo.",
  },
  {
    match: (p) => p.startsWith("/psychoanalyst"),
    hintPt: "O usuário é psicanalista. Priorize analisandos, sessões, biblioteca, assistente Freud (teoria) e voluntariado humanitário.",
    hintEn: "User is a psychoanalyst. Prioritize analysands, sessions, library, Freud assistant (theory), and humanitarian volunteering.",
    hintEs: "El usuario es psicoanalista. Priorice analizantes, sesiones, biblioteca, asistente Freud (teoría) y voluntariado.",
  },
  {
    match: (p) => p.startsWith("/psychologist"),
    hintPt: "O usuário é psicólogo. Priorize pacientes, escalas, sessões, documentos, conformidade CFP e plantão.",
    hintEn: "User is a psychologist. Prioritize patients, scales, sessions, documents, CFP compliance, and on-call.",
    hintEs: "El usuario es psicólogo. Priorice pacientes, escalas, sesiones, documentos, cumplimiento CFP y guardia.",
  },
];

const ROLE_LABEL: Record<SupportUserRole, { pt: string; en: string; es: string }> = {
  PATIENT: { pt: "paciente", en: "patient", es: "paciente" },
  PROFESSIONAL: { pt: "profissional de saúde (médico)", en: "healthcare professional (physician)", es: "profesional de salud (médico)" },
  PSYCHOANALYST: { pt: "psicanalista", en: "psychoanalyst", es: "psicoanalista" },
  INTEGRATIVE_THERAPIST: { pt: "terapeuta integrativo", en: "integrative therapist", es: "terapeuta integrativo" },
  ORGANIZATION: { pt: "clínica/organização (CNPJ)", en: "clinic/organization", es: "clínica/organización" },
  ADMIN: { pt: "administrador", en: "administrator", es: "administrador" },
  GUEST: { pt: "visitante (não logado)", en: "visitor (not logged in)", es: "visitante (sin sesión)" },
};

type Lang = "pt" | "en" | "es";

export function resolvePageHint(pathname: string, lang: Lang): string | null {
  const hint = PAGE_HINTS.find((h) => h.match(pathname));
  if (!hint) return null;
  if (lang === "pt") return hint.hintPt;
  if (lang === "es") return hint.hintEs;
  return hint.hintEn;
}

export function buildContextBlock(ctx: SupportContext, lang: Lang): string {
  const roleLabel = ROLE_LABEL[ctx.role]?.[lang] ?? ROLE_LABEL.GUEST[lang];
  const pageHint = resolvePageHint(ctx.pathname, lang);

  const lines = [
    "CURRENT SESSION CONTEXT (use to personalize — do not repeat verbatim to the user):",
    `- Logged in: ${ctx.isLoggedIn ? "yes" : "no"}`,
    `- User role: ${roleLabel}`,
    `- Current page: ${ctx.pathname || "/"}`,
  ];
  if (pageHint) lines.push(`- Page focus: ${pageHint}`);
  return lines.join("\n");
}

const SUGGESTED_BY_ROLE: Record<SupportUserRole, Record<Lang, string[]>> = {
  PATIENT: {
    pt: [
      "Como agendar uma consulta?",
      "Como baixo minha receita em PDF?",
      "Como cancelo ou remarco uma consulta?",
      "Como funciona o atendimento urgente?",
    ],
    en: [
      "How do I book a consultation?",
      "How do I download my prescription PDF?",
      "How do I cancel or reschedule an appointment?",
      "How does urgent care work?",
    ],
    es: [
      "¿Cómo reservo una consulta?",
      "¿Cómo descargo mi receta en PDF?",
      "¿Cómo cancelo o reprogramo una cita?",
      "¿Cómo funciona la atención urgente?",
    ],
  },
  PROFESSIONAL: {
    pt: [
      "Como uso o assistente de notas com IA?",
      "Como emitir e assinar receitas?",
      "Como ativar o plantão (JIT)?",
      "Como configurar minha agenda?",
    ],
    en: [
      "How do I use the AI notes assistant?",
      "How do I issue and sign prescriptions?",
      "How do I activate on-call (JIT)?",
      "How do I set up my availability?",
    ],
    es: [
      "¿Cómo uso el asistente de notas con IA?",
      "¿Cómo emito y firmo recetas?",
      "¿Cómo activo la guardia (JIT)?",
      "¿Cómo configuro mi agenda?",
    ],
  },
  PSYCHOANALYST: {
    pt: [
      "Como cadastrar analisandos?",
      "Como funciona o assistente Freud?",
      "Como ser voluntário humanitário?",
      "Como configurar disponibilidade?",
    ],
    en: [
      "How do I register analysands?",
      "How does the Freud assistant work?",
      "How do I volunteer for humanitarian care?",
      "How do I set availability?",
    ],
    es: [
      "¿Cómo registro analizantes?",
      "¿Cómo funciona el asistente Freud?",
      "¿Cómo ser voluntario humanitario?",
      "¿Cómo configuro disponibilidad?",
    ],
  },
  INTEGRATIVE_THERAPIST: {
    pt: [
      "Como cadastrar clientes?",
      "Como agendar consultas?",
      "Como ser voluntário humanitário?",
      "Como configurar disponibilidade?",
    ],
    en: [
      "How do I register clients?",
      "How do I schedule appointments?",
      "How do I volunteer for humanitarian care?",
      "How do I set availability?",
    ],
    es: [
      "¿Cómo registro clientes?",
      "¿Cómo agendo consultas?",
      "¿Cómo ser voluntario humanitario?",
      "¿Cómo configuro disponibilidad?",
    ],
  },
  ORGANIZATION: {
    pt: [
      "Como gerenciar agendamentos da clínica?",
      "Como convidar profissionais?",
      "Como acessar relatórios financeiros?",
      "Como cadastrar convênios?",
    ],
    en: [
      "How do I manage clinic appointments?",
      "How do I invite professionals?",
      "How do I access financial reports?",
      "How do I register insurance plans?",
    ],
    es: [
      "¿Cómo gestiono citas de la clínica?",
      "¿Cómo invito profesionales?",
      "¿Cómo accedo a informes financieros?",
      "¿Cómo registro convenios?",
    ],
  },
  ADMIN: {
    pt: ["Como funciona o Doctor8?", "Quais áreas existem na plataforma?"],
    en: ["How does Doctor8 work?", "What areas exist on the platform?"],
    es: ["¿Cómo funciona Doctor8?", "¿Qué áreas existen en la plataforma?"],
  },
  GUEST: {
    pt: [
      "Como funciona o Doctor8?",
      "Como me cadastro como paciente?",
      "Como me cadastro como profissional?",
      "O atendimento humanitário é gratuito?",
    ],
    en: [
      "How does Doctor8 work?",
      "How do I register as a patient?",
      "How do I register as a professional?",
      "Is humanitarian care free?",
    ],
    es: [
      "¿Cómo funciona Doctor8?",
      "¿Cómo me registro como paciente?",
      "¿Cómo me registro como profesional?",
      "¿La atención humanitaria es gratuita?",
    ],
  },
};

const SUGGESTED_BY_PATH: { match: (p: string) => boolean; questions: Record<Lang, string[]> }[] = [
  {
    match: (p) => p.startsWith("/patient/prescriptions"),
    questions: {
      pt: ["Por que não vejo minha receita?", "Como baixo o PDF assinado?", "Quanto tempo demora para aparecer?"],
      en: ["Why can't I see my prescription?", "How do I download the signed PDF?", "How long until it appears?"],
      es: ["¿Por qué no veo mi receta?", "¿Cómo descargo el PDF firmado?", "¿Cuánto tarda en aparecer?"],
    },
  },
  {
    match: (p) => p.startsWith("/patient/appointments"),
    questions: {
      pt: ["Como entrar na videochamada?", "Posso cancelar e receber reembolso?", "Como remarcar consulta?"],
      en: ["How do I join the video call?", "Can I cancel and get a refund?", "How do I reschedule?"],
      es: ["¿Cómo entro a la videollamada?", "¿Puedo cancelar y recibir reembolso?", "¿Cómo reprogramo?"],
    },
  },
  {
    match: (p) => p.startsWith("/professional/patients"),
    questions: {
      pt: ["Como usar o assistente de notas com IA?", "Como salvar evolução na ficha?", "Como pedir exames?"],
      en: ["How do I use the AI notes assistant?", "How do I save evolution to the chart?", "How do I order exams?"],
      es: ["¿Cómo uso el asistente de notas con IA?", "¿Cómo guardo evolución en la ficha?", "¿Cómo pido exámenes?"],
    },
  },
  {
    match: (p) => p.startsWith(`/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`),
    questions: {
      pt: ["Quais passos antes de entrar na fila?", "Preciso verificar telefone?", "Como sair da videochamada?"],
      en: ["What steps before joining the queue?", "Do I need phone verification?", "How do I leave the video call?"],
      es: ["¿Qué pasos antes de la cola?", "¿Debo verificar el teléfono?", "¿Cómo salgo de la videollamada?"],
    },
  },
];

export function getSuggestedQuestions(ctx: SupportContext, lang: Lang): string[] {
  const pathMatch = SUGGESTED_BY_PATH.find((s) => s.match(ctx.pathname));
  if (pathMatch) return pathMatch.questions[lang];

  const role = ctx.isLoggedIn ? ctx.role : "GUEST";
  return SUGGESTED_BY_ROLE[role]?.[lang] ?? SUGGESTED_BY_ROLE.GUEST[lang];
}

export function inferRoleFromPathname(pathname: string): SupportUserRole | null {
  if (pathname.startsWith("/patient")) return "PATIENT";
  if (pathname.startsWith("/psychoanalyst")) return "PSYCHOANALYST";
  if (pathname.startsWith("/integrative-therapist")) return "INTEGRATIVE_THERAPIST";
  if (pathname.startsWith("/psychologist") || pathname.startsWith("/professional")) return "PROFESSIONAL";
  if (pathname.startsWith("/organization")) return "ORGANIZATION";
  if (pathname.startsWith("/admin")) return "ADMIN";
  return null;
}

export function normalizeSupportRole(role: string | undefined | null, pathname: string): SupportUserRole {
  const valid: SupportUserRole[] = [
    "PATIENT", "PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST", "ORGANIZATION", "ADMIN",
  ];
  if (role && valid.includes(role as SupportUserRole)) return role as SupportUserRole;
  return inferRoleFromPathname(pathname) ?? "GUEST";
}
