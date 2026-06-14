// src/lib/i18n/translations.ts
// Central translation dictionary. Add keys here as we translate more screens.
// Keys are grouped by area. Use dot notation in t("nav.dashboard").

export type Lang = "pt" | "en" | "es";

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

type Dict = Record<string, string>;

const en: Dict = {
  // Navigation — patient
  "nav.dashboard": "Dashboard",
  "nav.medicalHistory": "Medical History",
  "nav.medications": "Medications",
  "nav.appointments": "Appointments",
  "nav.documents": "Documents",
  "nav.messages": "Messages",
  "nav.account": "Account",
  // Navigation — professional
  "nav.myProfile": "My Profile",
  "nav.patients": "Patients",
  "nav.sharedWithMe": "Shared with me",
  "nav.categories": "Categories",
  "nav.prescriptions": "Prescriptions",
  "nav.availability": "Availability",
  // Navigation — admin
  "nav.adminCategories": "Categories",
  "nav.adminDoctors": "Doctors",
  "nav.adminPatients": "Patients",
  "nav.adminPayments": "Payments",
  // Roles
  "role.patient": "Patient",
  "role.professional": "Professional",
  "role.admin": "Admin",
  // Common
  "common.signOut": "Sign out",
  "common.language": "Language",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.loading": "Loading...",
  "common.viewAll": "View all",
  "common.active": "Active",
  // Greetings
  "greeting.morning": "Good morning",
  "greeting.afternoon": "Good afternoon",
  "greeting.evening": "Good evening",
  // Patient dashboard
  "pdash.subtitle": "Here's your health overview for today.",
  "pdash.stat.upcoming": "Upcoming appointments",
  "pdash.stat.medications": "Active medications",
  "pdash.stat.documents": "Documents",
  "pdash.stat.healthScore": "Health score",
  "pdash.upcoming.title": "Upcoming appointments",
  "pdash.upcoming.empty": "No upcoming appointments",
  "pdash.upcoming.action": "Book a consultation",
  "pdash.meds.title": "Active medications",
  "pdash.meds.empty": "No active medications",
  "pdash.meds.action": "Add medication",
  "pdash.docs.title": "Recent documents",
  "pdash.docs.empty": "No documents yet",
  "pdash.docs.action": "Upload a document",
  "pdash.quick.title": "Quick actions",
  "pdash.quick.book": "Book appointment",
  "pdash.quick.export": "Export health record",
  "pdash.quick.addMed": "Add medication",
  "pdash.quick.share": "Share with doctor",
  "pdash.privacy.bold": "Your data is protected.",
  "pdash.privacy.text": "All your health information is encrypted and stored securely in compliance with HIPAA (US) and GDPR (EU) regulations. Only you and professionals you authorize can access your records.",
  // Professional dashboard
  "prodash.welcome": "Welcome, Dr.",
  "prodash.stat.today": "Today's appointments",
  "prodash.stat.totalConsults": "Total consultations",
  "prodash.stat.earnings": "Total earnings",
  "prodash.stat.upcoming": "Upcoming",
  "prodash.upcoming.title": "Upcoming appointments",
  "prodash.upcoming.empty": "No upcoming appointments",
  "prodash.type.teleconsult": "🎥 Teleconsultation",
  "prodash.type.inPerson": "🏥 In-person",
  "prodash.join": "Join",
  "prodash.verify.title": "Complete your profile to start receiving patients",
  "prodash.verify.text": "Add your availability, pricing and credentials to appear in search results.",
  "prodash.verify.action": "Complete profile",
};

const pt: Dict = {
  "nav.dashboard": "Painel",
  "nav.medicalHistory": "Histórico Médico",
  "nav.medications": "Medicações",
  "nav.appointments": "Consultas",
  "nav.documents": "Documentos",
  "nav.messages": "Mensagens",
  "nav.account": "Conta",
  "nav.myProfile": "Meu Perfil",
  "nav.patients": "Pacientes",
  "nav.sharedWithMe": "Compartilhados comigo",
  "nav.categories": "Categorias",
  "nav.prescriptions": "Prescrições",
  "nav.availability": "Disponibilidade",
  "nav.adminCategories": "Categorias",
  "nav.adminDoctors": "Médicos",
  "nav.adminPatients": "Pacientes",
  "nav.adminPayments": "Pagamentos",
  "role.patient": "Paciente",
  "role.professional": "Profissional",
  "role.admin": "Administrador",
  "common.signOut": "Sair",
  "common.language": "Idioma",
  "common.save": "Salvar",
  "common.cancel": "Cancelar",
  "common.loading": "Carregando...",
  "common.viewAll": "Ver todos",
  "common.active": "Ativo",
  "greeting.morning": "Bom dia",
  "greeting.afternoon": "Boa tarde",
  "greeting.evening": "Boa noite",
  "pdash.subtitle": "Aqui está o resumo da sua saúde para hoje.",
  "pdash.stat.upcoming": "Próximas consultas",
  "pdash.stat.medications": "Medicações ativas",
  "pdash.stat.documents": "Documentos",
  "pdash.stat.healthScore": "Índice de saúde",
  "pdash.upcoming.title": "Próximas consultas",
  "pdash.upcoming.empty": "Nenhuma consulta agendada",
  "pdash.upcoming.action": "Agendar uma consulta",
  "pdash.meds.title": "Medicações ativas",
  "pdash.meds.empty": "Nenhuma medicação ativa",
  "pdash.meds.action": "Adicionar medicação",
  "pdash.docs.title": "Documentos recentes",
  "pdash.docs.empty": "Nenhum documento ainda",
  "pdash.docs.action": "Enviar um documento",
  "pdash.quick.title": "Ações rápidas",
  "pdash.quick.book": "Agendar consulta",
  "pdash.quick.export": "Exportar prontuário",
  "pdash.quick.addMed": "Adicionar medicação",
  "pdash.quick.share": "Compartilhar com médico",
  "pdash.privacy.bold": "Seus dados estão protegidos.",
  "pdash.privacy.text": "Todas as suas informações de saúde são criptografadas e armazenadas com segurança, em conformidade com a LGPD (Brasil), HIPAA (EUA) e GDPR (Europa). Apenas você e os profissionais que autorizar podem acessar seus registros.",
  "prodash.welcome": "Bem-vindo, Dr.",
  "prodash.stat.today": "Consultas de hoje",
  "prodash.stat.totalConsults": "Total de consultas",
  "prodash.stat.earnings": "Faturamento total",
  "prodash.stat.upcoming": "Próximas",
  "prodash.upcoming.title": "Próximas consultas",
  "prodash.upcoming.empty": "Nenhuma consulta agendada",
  "prodash.type.teleconsult": "🎥 Teleconsulta",
  "prodash.type.inPerson": "🏥 Presencial",
  "prodash.join": "Entrar",
  "prodash.verify.title": "Complete seu perfil para começar a receber pacientes",
  "prodash.verify.text": "Adicione sua disponibilidade, valores e credenciais para aparecer nos resultados de busca.",
  "prodash.verify.action": "Completar perfil",
};

const es: Dict = {
  "nav.dashboard": "Panel",
  "nav.medicalHistory": "Historial médico",
  "nav.medications": "Medicaciones",
  "nav.appointments": "Citas",
  "nav.documents": "Documentos",
  "nav.messages": "Mensajes",
  "nav.account": "Cuenta",
  "nav.myProfile": "Mi perfil",
  "nav.patients": "Pacientes",
  "nav.sharedWithMe": "Compartidos conmigo",
  "nav.categories": "Categorías",
  "nav.prescriptions": "Recetas",
  "nav.availability": "Disponibilidad",
  "nav.adminCategories": "Categorías",
  "nav.adminDoctors": "Médicos",
  "nav.adminPatients": "Pacientes",
  "nav.adminPayments": "Pagos",
  "role.patient": "Paciente",
  "role.professional": "Profesional",
  "role.admin": "Administrador",
  "common.signOut": "Cerrar sesión",
  "common.language": "Idioma",
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.loading": "Cargando...",
  "common.viewAll": "Ver todo",
  "common.active": "Activo",
  "greeting.morning": "Buenos días",
  "greeting.afternoon": "Buenas tardes",
  "greeting.evening": "Buenas noches",
  "pdash.subtitle": "Aquí está el resumen de tu salud para hoy.",
  "pdash.stat.upcoming": "Próximas citas",
  "pdash.stat.medications": "Medicaciones activas",
  "pdash.stat.documents": "Documentos",
  "pdash.stat.healthScore": "Índice de salud",
  "pdash.upcoming.title": "Próximas citas",
  "pdash.upcoming.empty": "No hay citas programadas",
  "pdash.upcoming.action": "Reservar una consulta",
  "pdash.meds.title": "Medicaciones activas",
  "pdash.meds.empty": "No hay medicaciones activas",
  "pdash.meds.action": "Agregar medicación",
  "pdash.docs.title": "Documentos recientes",
  "pdash.docs.empty": "Aún no hay documentos",
  "pdash.docs.action": "Subir un documento",
  "pdash.quick.title": "Acciones rápidas",
  "pdash.quick.book": "Reservar cita",
  "pdash.quick.export": "Exportar historial",
  "pdash.quick.addMed": "Agregar medicación",
  "pdash.quick.share": "Compartir con médico",
  "pdash.privacy.bold": "Tus datos están protegidos.",
  "pdash.privacy.text": "Toda tu información de salud está cifrada y almacenada de forma segura, en cumplimiento con HIPAA (EE. UU.) y GDPR (Europa). Solo tú y los profesionales que autorices pueden acceder a tus registros.",
  "prodash.welcome": "Bienvenido, Dr.",
  "prodash.stat.today": "Citas de hoy",
  "prodash.stat.totalConsults": "Total de consultas",
  "prodash.stat.earnings": "Ingresos totales",
  "prodash.stat.upcoming": "Próximas",
  "prodash.upcoming.title": "Próximas citas",
  "prodash.upcoming.empty": "No hay citas programadas",
  "prodash.type.teleconsult": "🎥 Teleconsulta",
  "prodash.type.inPerson": "🏥 Presencial",
  "prodash.join": "Entrar",
  "prodash.verify.title": "Completa tu perfil para empezar a recibir pacientes",
  "prodash.verify.text": "Agrega tu disponibilidad, precios y credenciales para aparecer en los resultados de búsqueda.",
  "prodash.verify.action": "Completar perfil",
};

export const dictionaries: Record<Lang, Dict> = { en, pt, es };

export function translate(lang: Lang, key: string): string {
  const d = dictionaries[lang] || en;
  return d[key] ?? en[key] ?? key;
}

// Server-safe helpers (usable in Server Components) -----------------

export function normalizeLang(value: string | null | undefined): Lang {
  if (value === "pt" || value === "en" || value === "es") return value;
  return "en";
}

// Locale code for date/number formatting based on language
export function localeOf(lang: Lang): string {
  return lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
}

// Time-of-day greeting key
export function greetingKey(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "greeting.morning";
  if (h < 18) return "greeting.afternoon";
  return "greeting.evening";
}
