// Transactional email copy — en / pt / es

import type { EmailLang } from "./email-core";

export const EMAIL_PRIVACY: Record<EmailLang, string> = {
  en: "Privacy Policy",
  pt: "Política de Privacidade",
  es: "Política de Privacidad",
};

export const EMAIL_VERIFICATION: Record<EmailLang, {
  subject: string;
  heading: string;
  hi: (name: string) => string;
  body: string;
  cta: string;
  expires: string;
  ignore: string;
  orCopy: string;
}> = {
  en: {
    subject: "Verify your Doctor8 email address",
    heading: "Confirm your email address",
    hi: (n) => `Hi <strong>${n}</strong>,`,
    body: "Welcome to Doctor8! Please verify your email address to complete your registration and access your account.",
    cta: "Verify Email Address",
    expires: "This link expires in <strong>24 hours</strong>.",
    ignore: "If you didn't create a Doctor8 account, you can safely ignore this email.",
    orCopy: "Or copy this link:",
  },
  pt: {
    subject: "Verifique seu email no Doctor8",
    heading: "Confirme seu endereço de email",
    hi: (n) => `Olá <strong>${n}</strong>,`,
    body: "Bem-vindo ao Doctor8! Verifique seu endereço de email para concluir o cadastro e acessar sua conta.",
    cta: "Verificar email",
    expires: "Este link expira em <strong>24 horas</strong>.",
    ignore: "Se você não criou uma conta no Doctor8, pode ignorar este email com segurança.",
    orCopy: "Ou copie este link:",
  },
  es: {
    subject: "Verifica tu email en Doctor8",
    heading: "Confirma tu dirección de email",
    hi: (n) => `Hola <strong>${n}</strong>,`,
    body: "¡Bienvenido a Doctor8! Verifica tu dirección de email para completar el registro y acceder a tu cuenta.",
    cta: "Verificar email",
    expires: "Este enlace expira en <strong>24 horas</strong>.",
    ignore: "Si no creaste una cuenta en Doctor8, puedes ignorar este email.",
    orCopy: "O copia este enlace:",
  },
};

export const EMAIL_MAGIC_LINK: Record<EmailLang, {
  subject: string;
  heading: string;
  hi: (name: string) => string;
  body: string;
  cta: string;
  expires: string;
  ignore: string;
  orCopy: string;
}> = {
  en: {
    subject: "Continue your Doctor8 booking",
    heading: "Your secure login link",
    hi: (n) => `Hi <strong>${n}</strong>,`,
    body: "Click below to sign in and finish scheduling your appointment. No password needed.",
    cta: "Continue booking",
    expires: "This link expires in <strong>30 minutes</strong>.",
    ignore: "If you didn't request this, you can safely ignore this email.",
    orCopy: "Or copy this link:",
  },
  pt: {
    subject: "Continue seu agendamento no Doctor8",
    heading: "Seu link seguro de acesso",
    hi: (n) => `Olá <strong>${n}</strong>,`,
    body: "Clique abaixo para entrar e concluir o agendamento da sua consulta. Sem senha.",
    cta: "Continuar agendamento",
    expires: "Este link expira em <strong>30 minutos</strong>.",
    ignore: "Se você não solicitou isso, pode ignorar este email com segurança.",
    orCopy: "Ou copie este link:",
  },
  es: {
    subject: "Continúa tu reserva en Doctor8",
    heading: "Tu enlace seguro de acceso",
    hi: (n) => `Hola <strong>${n}</strong>,`,
    body: "Haz clic abajo para iniciar sesión y terminar de agendar tu consulta. Sin contraseña.",
    cta: "Continuar reserva",
    expires: "Este enlace expira en <strong>30 minutos</strong>.",
    ignore: "Si no solicitaste esto, puedes ignorar este email.",
    orCopy: "O copia este enlace:",
  },
};

export const EMAIL_PASSWORD_RESET: Record<EmailLang, {
  subject: string;
  heading: string;
  hi: (name: string) => string;
  body: string;
  cta: string;
  ignore: string;
  linkLabel: string;
  spamHint: string;
}> = {
  en: {
    subject: "Doctor8 account — password reset request",
    heading: "Password reset",
    hi: (n) => `Hi ${n},`,
    body: "We received a request to reset the password for your Doctor8 account. Use the button below within 1 hour. If you did not request this, you can safely ignore this message.",
    cta: "Reset password",
    ignore: "Your password will not change unless you use the link above.",
    linkLabel: "Or copy this link into your browser:",
    spamHint: "If you do not see this message in your inbox, check your spam or junk folder and mark Doctor8 as a safe sender.",
  },
  pt: {
    subject: "Doctor8 — redefinir senha da sua conta",
    heading: "Redefinir senha",
    hi: (n) => `Olá ${n},`,
    body: "Recebemos um pedido para redefinir a senha da sua conta Doctor8. Use o botão abaixo em até 1 hora. Se você não fez este pedido, ignore este e-mail.",
    cta: "Redefinir senha",
    ignore: "Sua senha não será alterada se você não usar o link acima.",
    linkLabel: "Ou copie e cole este link no navegador:",
    spamHint: "Se não encontrar na caixa de entrada, verifique o spam e marque o Doctor8 como remetente seguro.",
  },
  es: {
    subject: "Doctor8 — restablecer contraseña de tu cuenta",
    heading: "Restablecer contraseña",
    hi: (n) => `Hola ${n},`,
    body: "Recibimos una solicitud para restablecer la contraseña de tu cuenta Doctor8. Usa el botón en hasta 1 hora. Si no la solicitaste, ignora este correo.",
    cta: "Restablecer contraseña",
    ignore: "Tu contraseña no cambiará si no usas el enlace anterior.",
    linkLabel: "O copia y pega este enlace en el navegador:",
    spamHint: "Si no lo ves en la bandeja de entrada, revisa spam y marca Doctor8 como remitente seguro.",
  },
};

export const EMAIL_CHANGE: Record<EmailLang, {
  subjectNew: string;
  subjectOld: string;
  headingNew: string;
  headingOld: string;
  hi: (name: string) => string;
  bodyNew: (email: string) => string;
  bodyOld: string;
  ctaNew: string;
  ctaOld: string;
  ignore: string;
}> = {
  en: {
    subjectNew: "Verify your new email address — Doctor8",
    subjectOld: "Confirm email address change — Doctor8",
    headingNew: "Verify new email",
    headingOld: "Confirm email change",
    hi: (n) => `Hi ${n},`,
    bodyNew: (e) => `Click below to verify <strong>${e}</strong> as your new email address. This link expires in 24 hours.`,
    bodyOld: "Click below to confirm you want to change your email address. This link expires in 24 hours.",
    ctaNew: "Verify Email",
    ctaOld: "Confirm Change",
    ignore: "If you didn't request this, ignore this email.",
  },
  pt: {
    subjectNew: "Verifique seu novo email — Doctor8",
    subjectOld: "Confirme a alteração de email — Doctor8",
    headingNew: "Verificar novo email",
    headingOld: "Confirmar alteração de email",
    hi: (n) => `Olá ${n},`,
    bodyNew: (e) => `Clique abaixo para verificar <strong>${e}</strong> como seu novo email. Este link expira em 24 horas.`,
    bodyOld: "Clique abaixo para confirmar que deseja alterar seu endereço de email. Este link expira em 24 horas.",
    ctaNew: "Verificar email",
    ctaOld: "Confirmar alteração",
    ignore: "Se você não solicitou isso, ignore este email.",
  },
  es: {
    subjectNew: "Verifica tu nuevo email — Doctor8",
    subjectOld: "Confirma el cambio de email — Doctor8",
    headingNew: "Verificar nuevo email",
    headingOld: "Confirmar cambio de email",
    hi: (n) => `Hola ${n},`,
    bodyNew: (e) => `Haz clic para verificar <strong>${e}</strong> como tu nuevo email. Este enlace expira en 24 horas.`,
    bodyOld: "Haz clic para confirmar que deseas cambiar tu dirección de email. Este enlace expira en 24 horas.",
    ctaNew: "Verificar email",
    ctaOld: "Confirmar cambio",
    ignore: "Si no solicitaste esto, ignora este email.",
  },
};

export const EMAIL_APPOINTMENT_CONFIRM: Record<EmailLang, {
  subject: (date: string) => string;
  heading: string;
  hi: (name: string) => string;
  intro: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  type: string;
  teleconsult: string;
  inPerson: string;
  join: string;
  reminderNote: string;
  view: string;
  cancel: string;
  addToCalendar: string;
}> = {
  en: {
    subject: (d) => `Appointment confirmed – ${d}`,
    heading: "Your appointment is confirmed",
    hi: (n) => `Hi <strong>${n}</strong>,`,
    intro: "Your appointment has been successfully booked. Here are the details:",
    doctor: "Doctor",
    specialty: "Specialty",
    date: "Date",
    time: "Time",
    type: "Type",
    teleconsult: "Teleconsultation (online)",
    inPerson: "In-person",
    join: "Join Consultation",
    reminderNote: "You will receive a reminder 24 hours and 1 hour before your appointment.",
    view: "View appointment",
    cancel: "Cancel",
    addToCalendar: "Add to calendar",
  },
  pt: {
    subject: (d) => `Consulta confirmada – ${d}`,
    heading: "Sua consulta foi confirmada",
    hi: (n) => `Olá <strong>${n}</strong>,`,
    intro: "Sua consulta foi agendada com sucesso. Confira os detalhes:",
    doctor: "Médico",
    specialty: "Especialidade",
    date: "Data",
    time: "Horário",
    type: "Tipo",
    teleconsult: "Teleconsulta (online)",
    inPerson: "Presencial",
    join: "Entrar na consulta",
    reminderNote: "Você receberá lembretes 24 horas e 1 hora antes da consulta.",
    view: "Ver consulta",
    cancel: "Cancelar",
    addToCalendar: "Adicionar ao calendário",
  },
  es: {
    subject: (d) => `Cita confirmada – ${d}`,
    heading: "Tu cita fue confirmada",
    hi: (n) => `Hola <strong>${n}</strong>,`,
    intro: "Tu cita fue reservada con éxito. Aquí están los detalles:",
    doctor: "Médico",
    specialty: "Especialidad",
    date: "Fecha",
    time: "Hora",
    type: "Tipo",
    teleconsult: "Teleconsulta (en línea)",
    inPerson: "Presencial",
    join: "Unirse a la consulta",
    reminderNote: "Recibirás recordatorios 24 horas y 1 hora antes de tu cita.",
    view: "Ver cita",
    cancel: "Cancelar",
    addToCalendar: "Añadir al calendario",
  },
};

export const EMAIL_SLOT_ALERT: Record<EmailLang, {
  subject: (provider: string) => string;
  heading: string;
  hi: string;
  body: (provider: string, time: string) => string;
  cta: string;
  footnote: string;
}> = {
  en: {
    subject: (p) => `New appointment time with ${p}`,
    heading: "A time slot opened up",
    hi: "Hello,",
    body: (p, t) => `A consultation with <strong>${p}</strong> is now available on <strong>${t}</strong>. Book before someone else takes it.`,
    cta: "Book now",
    footnote: "You received this because you asked to be notified about new times on Doctor8.",
  },
  pt: {
    subject: (p) => `Novo horário disponível com ${p}`,
    heading: "Um horário foi liberado",
    hi: "Olá,",
    body: (p, t) => `Uma consulta com <strong>${p}</strong> está disponível em <strong>${t}</strong>. Agende antes que o horário seja preenchido.`,
    cta: "Agendar agora",
    footnote: "Você recebeu este e-mail porque pediu para ser avisado sobre novos horários no Doctor8.",
  },
  es: {
    subject: (p) => `Nuevo horario disponible con ${p}`,
    heading: "Se liberó un horario",
    hi: "Hola,",
    body: (p, t) => `Una consulta con <strong>${p}</strong> está disponible el <strong>${t}</strong>. Reserva antes de que se ocupe.`,
    cta: "Reservar ahora",
    footnote: "Recibiste este correo porque pediste avisos de nuevos horarios en Doctor8.",
  },
};

export const EMAIL_REVIEW_REQUEST: Record<EmailLang, {
  subject: (provider: string) => string;
  heading: string;
  hi: (name: string) => string;
  body: (provider: string) => string;
  cta: string;
  footnote: string;
}> = {
  en: {
    subject: (p) => `How was your visit with ${p}?`,
    heading: "Rate your consultation",
    hi: (n) => `Hi <strong>${n}</strong>,`,
    body: (p) => `Your consultation with <strong>${p}</strong> is complete. Your feedback helps other patients choose with confidence.`,
    cta: "Leave a review",
    footnote: "You can only review professionals you have consulted on Doctor8.",
  },
  pt: {
    subject: (p) => `Como foi sua consulta com ${p}?`,
    heading: "Avalie sua consulta",
    hi: (n) => `Olá <strong>${n}</strong>,`,
    body: (p) => `Sua consulta com <strong>${p}</strong> foi concluída. Sua avaliação ajuda outros pacientes a escolher com confiança.`,
    cta: "Deixar avaliação",
    footnote: "Você só pode avaliar profissionais com quem já consultou no Doctor8.",
  },
  es: {
    subject: (p) => `¿Cómo fue tu consulta con ${p}?`,
    heading: "Califica tu consulta",
    hi: (n) => `Hola <strong>${n}</strong>,`,
    body: (p) => `Tu consulta con <strong>${p}</strong> ha finalizado. Tu opinión ayuda a otros pacientes a elegir con confianza.`,
    cta: "Dejar calificación",
    footnote: "Solo puedes calificar a profesionales con los que ya consultaste en Doctor8.",
  },
};

export const EMAIL_APPOINTMENT_REMINDER: Record<EmailLang, {
  subject: (doctor: string, hours: number) => string;
  heading: string;
  hi: (name: string) => string;
  body: (doctor: string, hours: number, time: string) => string;
  join: string;
  hour: string;
  hours: string;
}> = {
  en: {
    subject: (d, h) => `Reminder: Appointment with Dr. ${d} in ${h}h`,
    heading: "Upcoming appointment",
    hi: (n) => `Hi ${n},`,
    body: (d, h, t) => `You have an appointment with <strong>Dr. ${d}</strong> in <strong>${h} ${h === 1 ? "hour" : "hours"}</strong> at <strong>${t}</strong>.`,
    join: "Join Now",
    hour: "hour",
    hours: "hours",
  },
  pt: {
    subject: (d, h) => `Lembrete: consulta com Dr. ${d} em ${h}h`,
    heading: "Consulta próxima",
    hi: (n) => `Olá ${n},`,
    body: (d, h, t) => `Você tem uma consulta com <strong>Dr. ${d}</strong> em <strong>${h} ${h === 1 ? "hora" : "horas"}</strong>, às <strong>${t}</strong>.`,
    join: "Entrar agora",
    hour: "hora",
    hours: "horas",
  },
  es: {
    subject: (d, h) => `Recordatorio: cita con Dr. ${d} en ${h}h`,
    heading: "Próxima cita",
    hi: (n) => `Hola ${n},`,
    body: (d, h, t) => `Tienes una cita con <strong>Dr. ${d}</strong> en <strong>${h} ${h === 1 ? "hora" : "horas"}</strong>, a las <strong>${t}</strong>.`,
    join: "Unirse ahora",
    hour: "hora",
    hours: "horas",
  },
};

export const EMAIL_PATIENT_INVITE: Record<EmailLang, {
  subject: (doctor: string) => string;
  heading: string;
  hi: (name: string) => string;
  body: (doctor: string) => string;
  cta: string;
  footnote: string;
  orCopy: string;
}> = {
  en: {
    subject: (d) => `Dr. ${d} shared health records with you on Doctor8`,
    heading: "You've been invited",
    hi: (n) => `Hi <strong>${n}</strong>,`,
    body: (d) => `<strong>Dr. ${d}</strong> would like to share your health records with you securely through Doctor8. To access them, create your free account using this email address.`,
    cta: "Create my account",
    footnote: "Once you sign up, your doctor can share exams, results and other records with you safely.",
    orCopy: "Or copy this link:",
  },
  pt: {
    subject: (d) => `Dr. ${d} compartilhou registros de saúde com você no Doctor8`,
    heading: "Você foi convidado",
    hi: (n) => `Olá <strong>${n}</strong>,`,
    body: (d) => `<strong>Dr. ${d}</strong> gostaria de compartilhar seus registros de saúde com você de forma segura pelo Doctor8. Para acessá-los, crie sua conta gratuita com este email.`,
    cta: "Criar minha conta",
    footnote: "Após o cadastro, seu médico poderá compartilhar exames, resultados e outros registros com segurança.",
    orCopy: "Ou copie este link:",
  },
  es: {
    subject: (d) => `El Dr. ${d} compartió registros de salud contigo en Doctor8`,
    heading: "Has sido invitado",
    hi: (n) => `Hola <strong>${n}</strong>,`,
    body: (d) => `<strong>Dr. ${d}</strong> quiere compartir tus registros de salud contigo de forma segura en Doctor8. Para acceder, crea tu cuenta gratuita con este email.`,
    cta: "Crear mi cuenta",
    footnote: "Una vez registrado, tu médico podrá compartir exámenes, resultados y otros registros contigo.",
    orCopy: "O copia este enlace:",
  },
};

export const EMAIL_COLLEAGUE_INVITE: Record<EmailLang, {
  subject: (sender: string) => string;
  heading: string;
  hi: (name: string) => string;
  body: (sender: string) => string;
  ctaLogin: string;
  ctaRegister: string;
  whatsapp: string;
  whatsappLink: string;
  accessAt: string;
}> = {
  en: {
    subject: (s) => `${s} shared a resource with you on Doctor8`,
    heading: "Resource shared by colleague",
    hi: (n) => `Hi, <strong>${n}</strong>!`,
    body: (s) => `<strong>${s}</strong> shared a resource with you on Doctor8:`,
    ctaLogin: "View in my account",
    ctaRegister: "Create account and view resource",
    whatsapp: "You can also reach out on WhatsApp:",
    whatsappLink: "Open WhatsApp",
    accessAt: "Access at:",
  },
  pt: {
    subject: (s) => `${s} compartilhou um recurso com você no Doctor8`,
    heading: "Recurso compartilhado por colega",
    hi: (n) => `Olá, <strong>${n}</strong>!`,
    body: (s) => `<strong>${s}</strong> compartilhou um recurso com você pela plataforma Doctor8:`,
    ctaLogin: "Ver na minha conta",
    ctaRegister: "Criar conta e ver recurso",
    whatsapp: "Você também pode entrar em contato pelo WhatsApp:",
    whatsappLink: "Abrir WhatsApp",
    accessAt: "Acesse em:",
  },
  es: {
    subject: (s) => `${s} compartió un recurso contigo en Doctor8`,
    heading: "Recurso compartido por colega",
    hi: (n) => `Hola, <strong>${n}</strong>!`,
    body: (s) => `<strong>${s}</strong> compartió un recurso contigo en Doctor8:`,
    ctaLogin: "Ver en mi cuenta",
    ctaRegister: "Crear cuenta y ver recurso",
    whatsapp: "También puedes contactar por WhatsApp:",
    whatsappLink: "Abrir WhatsApp",
    accessAt: "Accede en:",
  },
};

export const EMAIL_ORG_STAFF_INVITE: Record<EmailLang, {
  subject: (orgName: string) => string;
  heading: string;
  hi: string;
  body: (orgName: string, role: string) => string;
  cta: string;
  expires: string;
  orCopy: string;
}> = {
  en: {
    subject: (o) => `You're invited to join ${o} on Doctor8`,
    heading: "Organization team invite",
    hi: "Hello,",
    body: (o, r) => `You have been invited to join <strong>${o}</strong> as <strong>${r}</strong> on Doctor8.`,
    cta: "Accept invitation",
    expires: "This link expires in <strong>7 days</strong>.",
    orCopy: "Or copy this link:",
  },
  pt: {
    subject: (o) => `Convite para integrar ${o} no Doctor8`,
    heading: "Convite para equipe da clínica",
    hi: "Olá,",
    body: (o, r) => `Você foi convidado(a) para integrar <strong>${o}</strong> como <strong>${r}</strong> no Doctor8.`,
    cta: "Aceitar convite",
    expires: "Este link expira em <strong>7 dias</strong>.",
    orCopy: "Ou copie este link:",
  },
  es: {
    subject: (o) => `Invitación para unirse a ${o} en Doctor8`,
    heading: "Invitación al equipo de la clínica",
    hi: "Hola,",
    body: (o, r) => `Has sido invitado(a) a unirte a <strong>${o}</strong> como <strong>${r}</strong> en Doctor8.`,
    cta: "Aceptar invitación",
    expires: "Este enlace expira en <strong>7 días</strong>.",
    orCopy: "O copia este enlace:",
  },
};

const ORG_ROLE_LABELS: Record<string, Record<EmailLang, string>> = {
  ADMIN: { en: "Administrator", pt: "Administrador", es: "Administrador" },
  RECEPTIONIST: { en: "Reception", pt: "Recepção", es: "Recepción" },
  FINANCE: { en: "Finance", pt: "Financeiro", es: "Finanzas" },
  HR: { en: "HR", pt: "RH", es: "RRHH" },
  ACCOUNTANT: { en: "Accounting", pt: "Contabilidade", es: "Contabilidad" },
};

export function orgRoleLabel(role: string, lang: EmailLang): string {
  return ORG_ROLE_LABELS[role]?.[lang] || role;
}
