// Context helpers for the Doctor8 support AI ? page-aware hints and suggested questions.

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
    hintPt: "O usu?rio est? em Agendamentos (/patient/appointments). Priorize cancelamento, reagendamento, pagamento e entrada na videochamada.",
    hintEn: "User is on Appointments (/patient/appointments). Prioritize cancel, reschedule, payment, and joining the video call.",
    hintEs: "El usuario est? en Citas (/patient/appointments). Priorice cancelaci?n, reprogramaci?n, pago y unirse a la videollamada.",
  },
  {
    match: (p) => p.startsWith("/patient/prescriptions"),
    hintPt: "O usu?rio est? em Minhas receitas. Priorize download de PDF, assinatura digital e prazo de disponibiliza??o pelo m?dico.",
    hintEn: "User is on My prescriptions. Prioritize PDF download, digital signature, and when the doctor makes it available.",
    hintEs: "El usuario est? en Mis recetas. Priorice descarga PDF, firma digital y cu?ndo el m?dico la publica.",
  },
  {
    match: (p) => p.startsWith("/patient/medications"),
    hintPt: "O usu?rio est? em Medicamentos. Priorize lista cl?nica, exportar PDF e comparar pre?os na farm?cia parceira.",
    hintEn: "User is on Medications. Prioritize clinical list, PDF export, and pharmacy price comparison.",
    hintEs: "El usuario est? en Medicamentos. Priorice lista cl?nica, exportar PDF y comparar precios en farmacia.",
  },
  {
    match: (p) => p.startsWith("/patient/history") || p.startsWith("/patient/medical-history"),
    hintPt: "O usu?rio est? no hist?rico m?dico. Priorize preenchimento do question?rio e compartilhamento com m?dicos.",
    hintEn: "User is on medical history. Prioritize filling the questionnaire and sharing with doctors.",
    hintEs: "El usuario est? en historial m?dico. Priorice completar el cuestionario y compartir con m?dicos.",
  },
  {
    match: (p) => p.startsWith("/urgent"),
    hintPt: "O usu?rio est? na fila de atendimento urgente (/urgent). Priorize pagamento, tempo de espera, cancelar fila e entrar na chamada.",
    hintEn: "User is on urgent care queue (/urgent). Prioritize payment, wait time, leaving queue, and joining the call.",
    hintEs: "El usuario est? en la cola de urgencias (/urgent). Priorice pago, tiempo de espera, salir de la cola y unirse a la llamada.",
  },
  {
    match: (p) => p.startsWith(`/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`),
    hintPt: "O usu?rio est? no SOS humanit?rio Venezuela. Priorize triagem, TCLE, verifica??o de telefone, fila por especialidade e videochamada.",
    hintEn: "User is on Venezuela humanitarian SOS. Prioritize triage, consent, phone verification, specialty queue, and video call.",
    hintEs: "El usuario est? en SOS humanitario Venezuela. Priorice triaje, consentimiento, tel?fono, cola por especialidad y videollamada.",
  },
  {
    match: (p) => p.startsWith("/humanitarian/volunteer"),
    hintPt: "O usu?rio ? volunt?rio humanit?rio. Priorize ficar online, aceitar pacientes, handoff (Daily/WhatsApp/Meet) e encerrar atendimento.",
    hintEn: "User is a humanitarian volunteer. Prioritize going online, accepting patients, handoff options, and ending sessions.",
    hintEs: "El usuario es voluntario humanitario. Priorice ponerse en l?nea, aceptar pacientes, handoff y cerrar sesi?n.",
  },
  {
    match: (p) => p.startsWith("/professional/patients"),
    hintPt: "O usu?rio ? profissional na ficha de pacientes. Priorize prontu?rio, evolu??o, receitas, pedidos de exame e assistente de notas com IA.",
    hintEn: "User is a professional on patient charts. Prioritize records, evolution notes, prescriptions, exam orders, and AI notes assistant.",
    hintEs: "El usuario es profesional en fichas de pacientes. Priorice historial, evoluci?n, recetas, ex?menes y asistente de notas con IA.",
  },
  {
    match: (p) => p.startsWith("/professional/jit") || p.startsWith("/psychologist/jit"),
    hintPt: "O usu?rio est? no plant?o (JIT). Priorize ativar plant?o, pausar, fila de pacientes e atendimento imediato.",
    hintEn: "User is on on-call (JIT). Prioritize going online, pausing, patient queue, and immediate care.",
    hintEs: "El usuario est? en guardia (JIT). Priorice activar guardia, pausar, cola de pacientes y atenci?n inmediata.",
  },
  {
    match: (p) => p.startsWith("/professional/settings"),
    hintPt: "O usu?rio est? nas configura??es do profissional. Priorize verifica??o de perfil, assinatura digital ICP-Brasil e dados de consult?rio.",
    hintEn: "User is on professional settings. Prioritize profile verification, ICP-Brasil digital signature, and practice details.",
    hintEs: "El usuario est? en configuraci?n profesional. Priorice verificaci?n de perfil, firma digital ICP-Brasil y datos del consultorio.",
  },
  {
    match: (p) => p.startsWith("/register") || p.startsWith("/login"),
    hintPt: "O usu?rio est? em login ou cadastro. Priorize criar conta, verificar e-mail, escolher tipo (paciente/profissional) e login com Google.",
    hintEn: "User is on login or registration. Prioritize account creation, email verification, role selection, and Google login.",
    hintEs: "El usuario est? en login o registro. Priorice crear cuenta, verificar correo, elegir rol y login con Google.",
  },
  {
    match: (p) => p.startsWith("/organization"),
    hintPt: "O usu?rio est? no portal da cl?nica (CNPJ). Priorize agendamentos, pacientes, financeiro, conv?nios e equipe.",
    hintEn: "User is on the clinic (organization) portal. Prioritize appointments, patients, finance, insurance, and team.",
    hintEs: "El usuario est? en el portal de cl?nica (organizaci?n). Priorice citas, pacientes, finanzas, convenios y equipo.",
  },
  {
    match: (p) => p.startsWith("/psychoanalyst"),
    hintPt: "O usu?rio ? psicanalista. Priorize analisandos, sess?es, biblioteca, assistente Freud (teoria) e voluntariado humanit?rio.",
    hintEn: "User is a psychoanalyst. Prioritize analysands, sessions, library, Freud assistant (theory), and humanitarian volunteering.",
    hintEs: "El usuario es psicoanalista. Priorice analizantes, sesiones, biblioteca, asistente Freud (teor?a) y voluntariado.",
  },
  {
    match: (p) => p.startsWith("/psychologist"),
    hintPt: "O usu?rio ? psic?logo. Priorize pacientes, escalas, sess?es, documentos, conformidade CFP e plant?o.",
    hintEn: "User is a psychologist. Prioritize patients, scales, sessions, documents, CFP compliance, and on-call.",
    hintEs: "El usuario es psic?logo. Priorice pacientes, escalas, sesiones, documentos, cumplimiento CFP y guardia.",
  },
];

const ROLE_LABEL: Record<SupportUserRole, { pt: string; en: string; es: string }> = {
  PATIENT: { pt: "paciente", en: "patient", es: "paciente" },
  PROFESSIONAL: { pt: "profissional de sa?de (m?dico)", en: "healthcare professional (physician)", es: "profesional de salud (m?dico)" },
  PSYCHOANALYST: { pt: "psicanalista", en: "psychoanalyst", es: "psicoanalista" },
  INTEGRATIVE_THERAPIST: { pt: "terapeuta integrativo", en: "integrative therapist", es: "terapeuta integrativo" },
  ORGANIZATION: { pt: "cl?nica/organiza??o (CNPJ)", en: "clinic/organization", es: "cl?nica/organizaci?n" },
  ADMIN: { pt: "administrador", en: "administrator", es: "administrador" },
  GUEST: { pt: "visitante (n?o logado)", en: "visitor (not logged in)", es: "visitante (sin sesi?n)" },
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
    "CURRENT SESSION CONTEXT (use to personalize ? do not repeat verbatim to the user):",
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
      "?C?mo reservo una consulta?",
      "?C?mo descargo mi receta en PDF?",
      "?C?mo cancelo o reprogramo una cita?",
      "?C?mo funciona la atenci?n urgente?",
    ],
  },
  PROFESSIONAL: {
    pt: [
      "Como uso o assistente de notas com IA?",
      "Como emitir e assinar receitas?",
      "Como ativar o plant?o (JIT)?",
      "Como configurar minha agenda?",
    ],
    en: [
      "How do I use the AI notes assistant?",
      "How do I issue and sign prescriptions?",
      "How do I activate on-call (JIT)?",
      "How do I set up my availability?",
    ],
    es: [
      "?C?mo uso el asistente de notas con IA?",
      "?C?mo emito y firmo recetas?",
      "?C?mo activo la guardia (JIT)?",
      "?C?mo configuro mi agenda?",
    ],
  },
  PSYCHOANALYST: {
    pt: [
      "Como cadastrar analisandos?",
      "Como funciona o assistente Freud?",
      "Como ser volunt?rio humanit?rio?",
      "Como configurar disponibilidade?",
    ],
    en: [
      "How do I register analysands?",
      "How does the Freud assistant work?",
      "How do I volunteer for humanitarian care?",
      "How do I set availability?",
    ],
    es: [
      "?C?mo registro analizantes?",
      "?C?mo funciona el asistente Freud?",
      "?C?mo ser voluntario humanitario?",
      "?C?mo configuro disponibilidad?",
    ],
  },
  INTEGRATIVE_THERAPIST: {
    pt: [
      "Como cadastrar clientes?",
      "Como agendar consultas?",
      "Como ser volunt?rio humanit?rio?",
      "Como configurar disponibilidade?",
    ],
    en: [
      "How do I register clients?",
      "How do I schedule appointments?",
      "How do I volunteer for humanitarian care?",
      "How do I set availability?",
    ],
    es: [
      "?C?mo registro clientes?",
      "?C?mo agendo consultas?",
      "?C?mo ser voluntario humanitario?",
      "?C?mo configuro disponibilidad?",
    ],
  },
  ORGANIZATION: {
    pt: [
      "Como gerenciar agendamentos da cl?nica?",
      "Como convidar profissionais?",
      "Como acessar relat?rios financeiros?",
      "Como cadastrar conv?nios?",
    ],
    en: [
      "How do I manage clinic appointments?",
      "How do I invite professionals?",
      "How do I access financial reports?",
      "How do I register insurance plans?",
    ],
    es: [
      "?C?mo gestiono citas de la cl?nica?",
      "?C?mo invito profesionales?",
      "?C?mo accedo a informes financieros?",
      "?C?mo registro convenios?",
    ],
  },
  ADMIN: {
    pt: ["Como funciona o Doctor8?", "Quais ?reas existem na plataforma?"],
    en: ["How does Doctor8 work?", "What areas exist on the platform?"],
    es: ["?C?mo funciona Doctor8?", "?Qu? ?reas existen en la plataforma?"],
  },
  GUEST: {
    pt: [
      "Como funciona o Doctor8?",
      "Como me cadastro como paciente?",
      "Como me cadastro como profissional?",
      "O atendimento humanit?rio ? gratuito?",
    ],
    en: [
      "How does Doctor8 work?",
      "How do I register as a patient?",
      "How do I register as a professional?",
      "Is humanitarian care free?",
    ],
    es: [
      "?C?mo funciona Doctor8?",
      "?C?mo me registro como paciente?",
      "?C?mo me registro como profesional?",
      "?La atenci?n humanitaria es gratuita?",
    ],
  },
};

const SUGGESTED_BY_PATH: { match: (p: string) => boolean; questions: Record<Lang, string[]> }[] = [
  {
    match: (p) => p.startsWith("/patient/prescriptions"),
    questions: {
      pt: ["Por que n?o vejo minha receita?", "Como baixo o PDF assinado?", "Quanto tempo demora para aparecer?"],
      en: ["Why can't I see my prescription?", "How do I download the signed PDF?", "How long until it appears?"],
      es: ["?Por qu? no veo mi receta?", "?C?mo descargo el PDF firmado?", "?Cu?nto tarda en aparecer?"],
    },
  },
  {
    match: (p) => p.startsWith("/patient/appointments"),
    questions: {
      pt: ["Como entrar na videochamada?", "Posso cancelar e receber reembolso?", "Como remarcar consulta?"],
      en: ["How do I join the video call?", "Can I cancel and get a refund?", "How do I reschedule?"],
      es: ["?C?mo entro a la videollamada?", "?Puedo cancelar y recibir reembolso?", "?C?mo reprogramo?"],
    },
  },
  {
    match: (p) => p.startsWith("/professional/patients"),
    questions: {
      pt: ["Como usar o assistente de notas com IA?", "Como salvar evolu??o na ficha?", "Como pedir exames?"],
      en: ["How do I use the AI notes assistant?", "How do I save evolution to the chart?", "How do I order exams?"],
      es: ["?C?mo uso el asistente de notas con IA?", "?C?mo guardo evoluci?n en la ficha?", "?C?mo pido ex?menes?"],
    },
  },
  {
    match: (p) => p.startsWith(`/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`),
    questions: {
      pt: ["Quais passos antes de entrar na fila?", "Preciso verificar telefone?", "Como sair da videochamada?"],
      en: ["What steps before joining the queue?", "Do I need phone verification?", "How do I leave the video call?"],
      es: ["?Qu? pasos antes de la cola?", "?Debo verificar el tel?fono?", "?C?mo salgo de la videollamada?"],
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
