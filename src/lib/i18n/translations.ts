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
};

export const dictionaries: Record<Lang, Dict> = { en, pt, es };

export function translate(lang: Lang, key: string): string {
  const d = dictionaries[lang] || en;
  return d[key] ?? en[key] ?? key;
}
