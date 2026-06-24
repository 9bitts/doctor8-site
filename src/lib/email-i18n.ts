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

export const EMAIL_PASSWORD_RESET: Record<EmailLang, {
  subject: string;
  heading: string;
  hi: (name: string) => string;
  body: string;
  cta: string;
  ignore: string;
  linkLabel: string;
}> = {
  en: {
    subject: "Reset your Doctor8 password",
    heading: "Reset your password",
    hi: (n) => `Hi ${n},`,
    body: "Click the button below to reset your password. This link expires in 1 hour.",
    cta: "Reset Password",
    ignore: "If you didn't request this, ignore this email. Your password won't change.",
    linkLabel: "Link:",
  },
  pt: {
    subject: "Redefinir sua senha do Doctor8",
    heading: "Redefinir senha",
    hi: (n) => `Olá ${n},`,
    body: "Clique no botão abaixo para redefinir sua senha. Este link expira em 1 hora.",
    cta: "Redefinir senha",
    ignore: "Se você não solicitou isso, ignore este email. Sua senha não será alterada.",
    linkLabel: "Link:",
  },
  es: {
    subject: "Restablecer tu contraseña de Doctor8",
    heading: "Restablecer contraseña",
    hi: (n) => `Hola ${n},`,
    body: "Haz clic en el botón para restablecer tu contraseña. Este enlace expira en 1 hora.",
    cta: "Restablecer contraseña",
    ignore: "Si no solicitaste esto, ignora este email. Tu contraseña no cambiará.",
    linkLabel: "Enlace:",
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
