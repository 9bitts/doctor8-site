/**
 * Single source of truth for dashboard navigation routes.
 * Used by: dashboard layout, support AI knowledge (auto-generated index).
 * When adding a menu item here, the support assistant learns the route automatically.
 */

export type NavIconKey =
  | "LayoutDashboard"
  | "FileText"
  | "Pill"
  | "ShoppingBag"
  | "Sparkles"
  | "Stethoscope"
  | "FlaskConical"
  | "Flower2"
  | "Calendar"
  | "Users"
  | "Leaf"
  | "ClipboardList"
  | "BookOpen"
  | "MessageSquare"
  | "Radio"
  | "Heart"
  | "MapPin"
  | "Settings"
  | "UserCog"
  | "Brain"
  | "Inbox"
  | "Layers"
  | "TrendingUp"
  | "BarChart3"
  | "Shield"
  | "Briefcase"
  | "FileSpreadsheet"
  | "Receipt"
  | "Package"
  | "Megaphone"
  | "Building2"
  | "CreditCard"
  | "Plug"
  | "ScrollText"
  | "PieChart"
  | "Video"
  | "GraduationCap";

export type PlatformNavEntry = {
  href: string;
  labelKey: string;
  roles: string[];
  iconKey: NavIconKey;
};

export type PlatformNavGroup = {
  labelKey: string;
  items: PlatformNavEntry[];
};

export type PlatformPortalId =
  | "PATIENT"
  | "PROFESSIONAL"
  | "PSYCHOLOGIST"
  | "NUTRITIONIST"
  | "NURSE"
  | "PHARMACIST"
  | "DENTIST"
  | "PSYCHOANALYST"
  | "INTEGRATIVE_THERAPIST"
  | "ORGANIZATION"
  | "EMPLOYER"
  | "OCCUPATIONAL_PHYSICIAN"
  | "ADMIN"
  | "ANGEL";

export type PublicRouteEntry = {
  href: string;
  description: string;
};

export const PATIENT_DASHBOARD_ENTRY: PlatformNavEntry = {
  href: "/patient",
  labelKey: "nav.dashboard",
  roles: ["PATIENT"],
  iconKey: "LayoutDashboard",
};

export const PATIENT_HUMANITARIAN_ENTRY: PlatformNavEntry = {
  href: "/humanitarian/venezuela-terremoto-2026",
  labelKey: "nav.humanitarian",
  roles: ["PATIENT"],
  iconKey: "Heart",
};

export const PATIENT_SCHEDULED_VOLUNTEER_ENTRY: PlatformNavEntry = {
  href: "/patient/volunteer-appointments",
  labelKey: "nav.scheduledVolunteer",
  roles: ["PATIENT"],
  iconKey: "Calendar",
};

/** Patient sidebar groups — flat PATIENT_NAV is derived for support-knowledge index. */
export const PATIENT_NAV_GROUPS: PlatformNavGroup[] = [
  {
    labelKey: "nav.group.careNow",
    items: [
      { href: "/urgent", labelKey: "nav.urgent", roles: ["PATIENT"], iconKey: "Radio" },
      { href: "/patient/appointments", labelKey: "nav.appointments", roles: ["PATIENT"], iconKey: "Calendar" },
      { href: "/patient/find", labelKey: "nav.find", roles: ["PATIENT"], iconKey: "MapPin" },
    ],
  },
  {
    labelKey: "nav.group.myHealth",
    items: [
      { href: "/patient/history", labelKey: "nav.medicalHistory", roles: ["PATIENT"], iconKey: "FileText" },
      { href: "/patient/prescriptions", labelKey: "nav.myPrescriptions", roles: ["PATIENT"], iconKey: "Stethoscope" },
      { href: "/patient/exam-requests", labelKey: "nav.myExamRequests", roles: ["PATIENT"], iconKey: "FlaskConical" },
      { href: "/patient/documents", labelKey: "nav.documents", roles: ["PATIENT"], iconKey: "ClipboardList" },
      { href: "/patient/medications", labelKey: "nav.medications", roles: ["PATIENT"], iconKey: "Pill" },
      { href: "/patient/resources", labelKey: "nav.doctorResources", roles: ["PATIENT"], iconKey: "BookOpen" },
      { href: "/patient/integrative-care", labelKey: "nav.integrativeCare", roles: ["PATIENT"], iconKey: "Leaf" },
      { href: "/patient/nutrition", labelKey: "nav.nutrition", roles: ["PATIENT"], iconKey: "BarChart3" },
      { href: "/patient/nursing", labelKey: "nav.nursing", roles: ["PATIENT"], iconKey: "Heart" },
      { href: "/patient/pharmacy", labelKey: "nav.pharmacy", roles: ["PATIENT"], iconKey: "Pill" },
      { href: "/patient/pharmacy/orders", labelKey: "nav.pharmacyOrders", roles: ["PATIENT"], iconKey: "ShoppingBag" },
    ],
  },
  {
    labelKey: "nav.group.accountMore",
    items: [
      { href: "/patient/messages", labelKey: "nav.messages", roles: ["PATIENT"], iconKey: "MessageSquare" },
      { href: "/patient/providers", labelKey: "nav.myProviders", roles: ["PATIENT"], iconKey: "Users" },
      { href: "/patient/club-doctor", labelKey: "nav.benefits", roles: ["PATIENT"], iconKey: "Sparkles" },
      { href: "/patient/account", labelKey: "nav.account", roles: ["PATIENT"], iconKey: "Settings" },
    ],
  },
];

export const PATIENT_NAV: PlatformNavEntry[] = [
  PATIENT_DASHBOARD_ENTRY,
  ...PATIENT_NAV_GROUPS.flatMap((g) => g.items),
  PATIENT_HUMANITARIAN_ENTRY,
  PATIENT_SCHEDULED_VOLUNTEER_ENTRY,
];

function flattenNavGroups(groups: PlatformNavGroup[]): PlatformNavEntry[] {
  return groups.flatMap((g) => g.items);
}

/** Medical professional sidebar groups — flat PROFESSIONAL_NAV is derived for support-knowledge index. */
export const PROFESSIONAL_NAV_GROUPS: PlatformNavGroup[] = [
  {
    labelKey: "nav.group.attendNow",
    items: [
      { href: "/professional", labelKey: "nav.dashboard", roles: ["PROFESSIONAL"], iconKey: "LayoutDashboard" },
      { href: "/professional/jit", labelKey: "nav.jit", roles: ["PROFESSIONAL"], iconKey: "Radio" },
      { href: "/professional/appointments", labelKey: "nav.appointments", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
      { href: "/professional/settings/availability", labelKey: "nav.availability", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
    ],
  },
  {
    labelKey: "nav.group.patients",
    items: [
      { href: "/professional/patients", labelKey: "nav.patients", roles: ["PROFESSIONAL"], iconKey: "Users" },
      { href: "/professional/shared", labelKey: "nav.sharedWithMe", roles: ["PROFESSIONAL"], iconKey: "Inbox" },
      { href: "/professional/categories", labelKey: "nav.categories", roles: ["PROFESSIONAL"], iconKey: "Layers" },
      { href: "/professional/messages", labelKey: "nav.messages", roles: ["PROFESSIONAL"], iconKey: "MessageSquare" },
    ],
  },
  {
    labelKey: "nav.group.clinical",
    items: [
      { href: "/professional/prescriptions", labelKey: "nav.prescriptions", roles: ["PROFESSIONAL"], iconKey: "Stethoscope" },
      { href: "/professional/chas-medicinais", labelKey: "nav.medicinalTeas", roles: ["PROFESSIONAL"], iconKey: "FlaskConical" },
      { href: "/professional/florais", labelKey: "nav.florais", roles: ["PROFESSIONAL"], iconKey: "Flower2" },
      { href: "/professional/medicina-natural", labelKey: "nav.naturalMedicine", roles: ["PROFESSIONAL"], iconKey: "Leaf" },
      { href: "/professional/resources", labelKey: "nav.library", roles: ["PROFESSIONAL"], iconKey: "BookOpen" },
      { href: "/professional/courses", labelKey: "nav.courses", roles: ["PROFESSIONAL"], iconKey: "GraduationCap" },
      { href: "/professional/courses/learn", labelKey: "nav.myCourses", roles: ["PROFESSIONAL"], iconKey: "BookOpen" },
      { href: "/professional/psychology", labelKey: "nav.psychologyArea", roles: ["PROFESSIONAL"], iconKey: "Brain" },
      { href: "/professional/buying-club", labelKey: "nav.buyingClub", roles: ["PROFESSIONAL"], iconKey: "ShoppingBag" },
      { href: "/professional/meeting-rooms", labelKey: "nav.meetingRooms", roles: ["PROFESSIONAL"], iconKey: "Video" },
      { href: "/professional/settings/clinic", labelKey: "nav.clinicSettings", roles: ["PROFESSIONAL"], iconKey: "Building2" },
      { href: "/professional/settings/templates", labelKey: "nav.templates", roles: ["PROFESSIONAL"], iconKey: "FileText" },
    ],
  },
  {
    labelKey: "nav.group.accountMore",
    items: [
      { href: "/professional/financeiro", labelKey: "nav.financeiro", roles: ["PROFESSIONAL"], iconKey: "TrendingUp" },
      { href: "/professional/settings", labelKey: "nav.myProfile", roles: ["PROFESSIONAL"], iconKey: "UserCog" },
      { href: "/professional/doctor-connection", labelKey: "nav.doctorConnection", roles: ["PROFESSIONAL"], iconKey: "Sparkles" },
      { href: "/professional/account", labelKey: "nav.account", roles: ["PROFESSIONAL"], iconKey: "Settings" },
      { href: "/humanitarian/volunteer", labelKey: "nav.humanitarianVolunteer", roles: ["PROFESSIONAL"], iconKey: "Heart" },
    ],
  },
];

export const PROFESSIONAL_NAV: PlatformNavEntry[] = flattenNavGroups(PROFESSIONAL_NAV_GROUPS);

/** Psychologist portal sidebar groups. */
export const PSYCHOLOGIST_NAV_GROUPS: PlatformNavGroup[] = [
  {
    labelKey: "nav.group.attendNow",
    items: [
      { href: "/psychologist", labelKey: "nav.dashboard", roles: ["PROFESSIONAL"], iconKey: "LayoutDashboard" },
      { href: "/psychologist/jit", labelKey: "nav.jit", roles: ["PROFESSIONAL"], iconKey: "Radio" },
      { href: "/psychologist/appointments", labelKey: "nav.appointments", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
      { href: "/psychologist/empresas", labelKey: "psy.nav.empresas", roles: ["PROFESSIONAL"], iconKey: "Building2" },
      { href: "/psychologist/settings/availability", labelKey: "nav.availability", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
    ],
  },
  {
    labelKey: "nav.group.patients",
    items: [
      { href: "/psychologist/patients", labelKey: "nav.patients", roles: ["PROFESSIONAL"], iconKey: "Users" },
      { href: "/psychologist/shared", labelKey: "nav.sharedWithMe", roles: ["PROFESSIONAL"], iconKey: "Inbox" },
      { href: "/psychologist/categories", labelKey: "nav.categories", roles: ["PROFESSIONAL"], iconKey: "Layers" },
      { href: "/psychologist/messages", labelKey: "nav.messages", roles: ["PROFESSIONAL"], iconKey: "MessageSquare" },
    ],
  },
  {
    labelKey: "nav.group.clinical",
    items: [
      { href: "/psychologist/sessions", labelKey: "psy.mod.sessions.title", roles: ["PROFESSIONAL"], iconKey: "ClipboardList" },
      { href: "/psychologist/anamnesis", labelKey: "psy.mod.anamnesis.title", roles: ["PROFESSIONAL"], iconKey: "FileSpreadsheet" },
      { href: "/psychologist/scales", labelKey: "psy.mod.scales.title", roles: ["PROFESSIONAL"], iconKey: "BarChart3" },
      { href: "/psychologist/documents", labelKey: "psy.mod.documents.title", roles: ["PROFESSIONAL"], iconKey: "FileText" },
      { href: "/psychologist/receita-saude", labelKey: "psy.mod.receita.title", roles: ["PROFESSIONAL"], iconKey: "Receipt" },
      { href: "/psychologist/chart-chat", labelKey: "psy.mod.chartChat.title", roles: ["PROFESSIONAL"], iconKey: "MessageSquare" },
      { href: "/psychologist/settings/calendar", labelKey: "psy.gcal.title", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
      { href: "/psychologist/compliance", labelKey: "psy.mod.compliance.title", roles: ["PROFESSIONAL"], iconKey: "Shield" },
      { href: "/psychologist/resources", labelKey: "nav.library", roles: ["PROFESSIONAL"], iconKey: "BookOpen" },
      { href: "/psychologist/courses", labelKey: "nav.courses", roles: ["PROFESSIONAL"], iconKey: "GraduationCap" },
      { href: "/professional/courses/learn", labelKey: "nav.myCourses", roles: ["PROFESSIONAL"], iconKey: "BookOpen" },
      { href: "/psychologist/meeting-rooms", labelKey: "nav.meetingRooms", roles: ["PROFESSIONAL"], iconKey: "Video" },
    ],
  },
  {
    labelKey: "nav.group.accountMore",
    items: [
      { href: "/psychologist/financeiro", labelKey: "nav.financeiro", roles: ["PROFESSIONAL"], iconKey: "TrendingUp" },
      { href: "/psychologist/settings", labelKey: "nav.myProfile", roles: ["PROFESSIONAL"], iconKey: "UserCog" },
      { href: "/psychologist/doctor-connection", labelKey: "nav.doctorConnection", roles: ["PROFESSIONAL"], iconKey: "Sparkles" },
      { href: "/psychologist/account", labelKey: "nav.account", roles: ["PROFESSIONAL"], iconKey: "Settings" },
      { href: "/humanitarian/volunteer", labelKey: "nav.humanitarianVolunteer", roles: ["PROFESSIONAL"], iconKey: "Heart" },
    ],
  },
];

export const PSYCHOLOGIST_NAV: PlatformNavEntry[] = flattenNavGroups(PSYCHOLOGIST_NAV_GROUPS);

/** Nutritionist portal — aligned with Dietbox / WebDiet / Nutrium workflows. */
export const NUTRITIONIST_NAV_GROUPS: PlatformNavGroup[] = [
  {
    labelKey: "nav.group.attendNow",
    items: [
      { href: "/nutricionista", labelKey: "nav.dashboard", roles: ["PROFESSIONAL"], iconKey: "LayoutDashboard" },
      { href: "/nutricionista/appointments", labelKey: "nav.appointments", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
      { href: "/nutricionista/settings/availability", labelKey: "nav.availability", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
    ],
  },
  {
    labelKey: "nav.group.patients",
    items: [
      { href: "/nutricionista/patients", labelKey: "nav.patients", roles: ["PROFESSIONAL"], iconKey: "Users" },
      { href: "/nutricionista/shared", labelKey: "nav.sharedWithMe", roles: ["PROFESSIONAL"], iconKey: "Inbox" },
      { href: "/nutricionista/messages", labelKey: "nav.messages", roles: ["PROFESSIONAL"], iconKey: "MessageSquare" },
    ],
  },
  {
    labelKey: "nav.group.clinical",
    items: [
      { href: "/nutricionista/anamnese", labelKey: "nutri.mod.anamnese.title", roles: ["PROFESSIONAL"], iconKey: "ClipboardList" },
      { href: "/nutricionista/antropometria", labelKey: "nutri.mod.anthropometry.title", roles: ["PROFESSIONAL"], iconKey: "BarChart3" },
      { href: "/nutricionista/planos", labelKey: "nutri.mod.mealPlans.title", roles: ["PROFESSIONAL"], iconKey: "FileText" },
      { href: "/nutricionista/diario", labelKey: "nutri.mod.foodDiary.title", roles: ["PROFESSIONAL"], iconKey: "BookOpen" },
      { href: "/nutricionista/meeting-rooms", labelKey: "nav.meetingRooms", roles: ["PROFESSIONAL"], iconKey: "Video" },
    ],
  },
  {
    labelKey: "nav.group.accountMore",
    items: [
      { href: "/nutricionista/financeiro", labelKey: "nav.financeiro", roles: ["PROFESSIONAL"], iconKey: "TrendingUp" },
      { href: "/nutricionista/settings", labelKey: "nav.myProfile", roles: ["PROFESSIONAL"], iconKey: "UserCog" },
      { href: "/nutricionista/account", labelKey: "nav.account", roles: ["PROFESSIONAL"], iconKey: "Settings" },
      { href: "/humanitarian/volunteer", labelKey: "nav.humanitarianVolunteer", roles: ["PROFESSIONAL"], iconKey: "Heart" },
    ],
  },
];

export const NUTRITIONIST_NAV: PlatformNavEntry[] = flattenNavGroups(NUTRITIONIST_NAV_GROUPS);

/** Nurse portal — SAE, scales, care plans, monitoring. */
export const NURSE_NAV_GROUPS: PlatformNavGroup[] = [
  {
    labelKey: "nav.group.attendNow",
    items: [
      { href: "/enfermeiro", labelKey: "nav.dashboard", roles: ["PROFESSIONAL"], iconKey: "LayoutDashboard" },
      { href: "/enfermeiro/appointments", labelKey: "nav.appointments", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
      { href: "/enfermeiro/settings/availability", labelKey: "nav.availability", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
    ],
  },
  {
    labelKey: "nav.group.patients",
    items: [
      { href: "/enfermeiro/patients", labelKey: "nav.patients", roles: ["PROFESSIONAL"], iconKey: "Users" },
      { href: "/enfermeiro/shared", labelKey: "nav.sharedWithMe", roles: ["PROFESSIONAL"], iconKey: "Inbox" },
      { href: "/enfermeiro/messages", labelKey: "nav.messages", roles: ["PROFESSIONAL"], iconKey: "MessageSquare" },
    ],
  },
  {
    labelKey: "nav.group.clinical",
    items: [
      { href: "/enfermeiro/sae", labelKey: "nurse.mod.sae.title", roles: ["PROFESSIONAL"], iconKey: "ClipboardList" },
      { href: "/enfermeiro/escalas", labelKey: "nurse.mod.scales.title", roles: ["PROFESSIONAL"], iconKey: "BarChart3" },
      { href: "/enfermeiro/prescricao", labelKey: "nurse.mod.carePlan.title", roles: ["PROFESSIONAL"], iconKey: "FileText" },
      { href: "/enfermeiro/medicamentos", labelKey: "nurse.mod.medRx.title", roles: ["PROFESSIONAL"], iconKey: "Pill" },
      { href: "/enfermeiro/checagem", labelKey: "nurse.mod.medCheck.title", roles: ["PROFESSIONAL"], iconKey: "Shield" },
      { href: "/enfermeiro/sbar", labelKey: "nurse.mod.sbar.title", roles: ["PROFESSIONAL"], iconKey: "MessageSquare" },
      { href: "/enfermeiro/monitoramento", labelKey: "nurse.mod.monitoring.title", roles: ["PROFESSIONAL"], iconKey: "Heart" },
      { href: "/enfermeiro/meeting-rooms", labelKey: "nav.meetingRooms", roles: ["PROFESSIONAL"], iconKey: "Video" },
    ],
  },
  {
    labelKey: "nav.group.accountMore",
    items: [
      { href: "/enfermeiro/financeiro", labelKey: "nav.financeiro", roles: ["PROFESSIONAL"], iconKey: "TrendingUp" },
      { href: "/enfermeiro/settings", labelKey: "nav.myProfile", roles: ["PROFESSIONAL"], iconKey: "UserCog" },
      { href: "/enfermeiro/account", labelKey: "nav.account", roles: ["PROFESSIONAL"], iconKey: "Settings" },
      { href: "/humanitarian/volunteer", labelKey: "nav.humanitarianVolunteer", roles: ["PROFESSIONAL"], iconKey: "Heart" },
    ],
  },
];

export const NURSE_NAV: PlatformNavEntry[] = flattenNavGroups(NURSE_NAV_GROUPS);

/** Pharmacist portal — telepharmacy (CFF 727). */
export const PHARMACIST_NAV_GROUPS: PlatformNavGroup[] = [
  {
    labelKey: "nav.group.attendNow",
    items: [
      { href: "/farmaceutico", labelKey: "nav.dashboard", roles: ["PROFESSIONAL"], iconKey: "LayoutDashboard" },
      { href: "/farmaceutico/appointments", labelKey: "nav.appointments", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
      { href: "/farmaceutico/settings/availability", labelKey: "nav.availability", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
    ],
  },
  {
    labelKey: "nav.group.patients",
    items: [
      { href: "/farmaceutico/patients", labelKey: "nav.patients", roles: ["PROFESSIONAL"], iconKey: "Users" },
      { href: "/farmaceutico/shared", labelKey: "nav.sharedWithMe", roles: ["PROFESSIONAL"], iconKey: "Inbox" },
      { href: "/farmaceutico/messages", labelKey: "nav.messages", roles: ["PROFESSIONAL"], iconKey: "MessageSquare" },
    ],
  },
  {
    labelKey: "nav.group.clinical",
    items: [
      { href: "/farmaceutico/revisao", labelKey: "pharma.mod.medReview.title", roles: ["PROFESSIONAL"], iconKey: "ClipboardList" },
      { href: "/farmaceutico/conciliacao", labelKey: "pharma.mod.reconciliation.title", roles: ["PROFESSIONAL"], iconKey: "FileSpreadsheet" },
      { href: "/farmaceutico/monitoramento", labelKey: "pharma.mod.monitoring.title", roles: ["PROFESSIONAL"], iconKey: "Heart" },
      { href: "/farmaceutico/prescricao", labelKey: "pharma.mod.pharmaRx.title", roles: ["PROFESSIONAL"], iconKey: "Pill" },
      { href: "/farmaceutico/educacao", labelKey: "pharma.mod.education.title", roles: ["PROFESSIONAL"], iconKey: "BookOpen" },
      { href: "/farmaceutico/dispensacao", labelKey: "pharma.mod.dispensing.title", roles: ["PROFESSIONAL"], iconKey: "Shield" },
      { href: "/farmaceutico/interacoes", labelKey: "pharma.mod.interactions.title", roles: ["PROFESSIONAL"], iconKey: "FlaskConical" },
      { href: "/farmaceutico/meeting-rooms", labelKey: "nav.meetingRooms", roles: ["PROFESSIONAL"], iconKey: "Video" },
    ],
  },
  {
    labelKey: "nav.group.accountMore",
    items: [
      { href: "/farmaceutico/financeiro", labelKey: "nav.financeiro", roles: ["PROFESSIONAL"], iconKey: "TrendingUp" },
      { href: "/farmaceutico/settings", labelKey: "nav.myProfile", roles: ["PROFESSIONAL"], iconKey: "UserCog" },
      { href: "/farmaceutico/account", labelKey: "nav.account", roles: ["PROFESSIONAL"], iconKey: "Settings" },
      { href: "/humanitarian/volunteer", labelKey: "nav.humanitarianVolunteer", roles: ["PROFESSIONAL"], iconKey: "Heart" },
    ],
  },
];

export const PHARMACIST_NAV: PlatformNavEntry[] = flattenNavGroups(PHARMACIST_NAV_GROUPS);

/** Dentist portal — odontogram, periodontogram, treatment plans, prosthetics, ortho. */
export const DENTIST_NAV_GROUPS: PlatformNavGroup[] = [
  {
    labelKey: "nav.group.attendNow",
    items: [
      { href: "/odontologo", labelKey: "nav.dashboard", roles: ["PROFESSIONAL"], iconKey: "LayoutDashboard" },
      { href: "/odontologo/jit", labelKey: "nav.jit", roles: ["PROFESSIONAL"], iconKey: "Radio" },
      { href: "/odontologo/appointments", labelKey: "nav.appointments", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
      { href: "/odontologo/settings/availability", labelKey: "nav.availability", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
      { href: "/odontologo/cadeiras", labelKey: "dental.mod.chairs.title", roles: ["PROFESSIONAL"], iconKey: "Building2" },
    ],
  },
  {
    labelKey: "nav.group.patients",
    items: [
      { href: "/odontologo/patients", labelKey: "nav.patients", roles: ["PROFESSIONAL"], iconKey: "Users" },
      { href: "/odontologo/shared", labelKey: "nav.sharedWithMe", roles: ["PROFESSIONAL"], iconKey: "Inbox" },
      { href: "/odontologo/messages", labelKey: "nav.messages", roles: ["PROFESSIONAL"], iconKey: "MessageSquare" },
    ],
  },
  {
    labelKey: "nav.group.clinical",
    items: [
      { href: "/odontologo/anamnese", labelKey: "dental.mod.anamnesis.title", roles: ["PROFESSIONAL"], iconKey: "ClipboardList" },
      { href: "/odontologo/odontograma", labelKey: "dental.mod.odontogram.title", roles: ["PROFESSIONAL"], iconKey: "FileText" },
      { href: "/odontologo/periodontograma", labelKey: "dental.mod.periodontogram.title", roles: ["PROFESSIONAL"], iconKey: "BarChart3" },
      { href: "/odontologo/plano-tratamento", labelKey: "dental.mod.treatmentPlan.title", roles: ["PROFESSIONAL"], iconKey: "FileSpreadsheet" },
      { href: "/odontologo/protese", labelKey: "dental.mod.prosthetic.title", roles: ["PROFESSIONAL"], iconKey: "Package" },
      { href: "/odontologo/ortodontia", labelKey: "dental.mod.orthodontics.title", roles: ["PROFESSIONAL"], iconKey: "Layers" },
      { href: "/odontologo/fotos", labelKey: "dental.mod.photos.title", roles: ["PROFESSIONAL"], iconKey: "Sparkles" },
      { href: "/odontologo/prescriptions", labelKey: "nav.prescriptions", roles: ["PROFESSIONAL"], iconKey: "Stethoscope" },
      { href: "/odontologo/meeting-rooms", labelKey: "nav.meetingRooms", roles: ["PROFESSIONAL"], iconKey: "Video" },
    ],
  },
  {
    labelKey: "nav.group.accountMore",
    items: [
      { href: "/odontologo/financeiro", labelKey: "nav.financeiro", roles: ["PROFESSIONAL"], iconKey: "TrendingUp" },
      { href: "/odontologo/settings", labelKey: "nav.myProfile", roles: ["PROFESSIONAL"], iconKey: "UserCog" },
      { href: "/odontologo/doctor-connection", labelKey: "nav.doctorConnection", roles: ["PROFESSIONAL"], iconKey: "Sparkles" },
      { href: "/odontologo/account", labelKey: "nav.account", roles: ["PROFESSIONAL"], iconKey: "Settings" },
      { href: "/humanitarian/volunteer", labelKey: "nav.humanitarianVolunteer", roles: ["PROFESSIONAL"], iconKey: "Heart" },
    ],
  },
];

export const DENTIST_NAV: PlatformNavEntry[] = flattenNavGroups(DENTIST_NAV_GROUPS);

/** Psychoanalyst portal sidebar groups. */
export const PSYCHOANALYST_NAV_GROUPS: PlatformNavGroup[] = [
  {
    labelKey: "nav.group.attendNow",
    items: [
      { href: "/psychoanalyst", labelKey: "nav.dashboard", roles: ["PSYCHOANALYST"], iconKey: "LayoutDashboard" },
      { href: "/psychoanalyst/appointments", labelKey: "nav.appointments", roles: ["PSYCHOANALYST"], iconKey: "Calendar" },
      { href: "/psychoanalyst/settings/availability", labelKey: "nav.availability", roles: ["PSYCHOANALYST"], iconKey: "Calendar" },
    ],
  },
  {
    labelKey: "nav.group.patients",
    items: [
      { href: "/psychoanalyst/analysands", labelKey: "pa.nav.analysands", roles: ["PSYCHOANALYST"], iconKey: "Users" },
      { href: "/psychoanalyst/messages", labelKey: "nav.messages", roles: ["PSYCHOANALYST"], iconKey: "MessageSquare" },
    ],
  },
  {
    labelKey: "nav.group.clinical",
    items: [
      { href: "/psychoanalyst/freud", labelKey: "pa.freud.nav", roles: ["PSYCHOANALYST"], iconKey: "Brain" },
      { href: "/psychoanalyst/resources", labelKey: "nav.library", roles: ["PSYCHOANALYST"], iconKey: "BookOpen" },
      { href: "/psychoanalyst/meeting-rooms", labelKey: "nav.meetingRooms", roles: ["PSYCHOANALYST"], iconKey: "Video" },
    ],
  },
  {
    labelKey: "nav.group.accountMore",
    items: [
      { href: "/psychoanalyst/financeiro", labelKey: "nav.financeiro", roles: ["PSYCHOANALYST"], iconKey: "TrendingUp" },
      { href: "/psychoanalyst/settings", labelKey: "nav.myProfile", roles: ["PSYCHOANALYST"], iconKey: "UserCog" },
      { href: "/psychoanalyst/doctor-connection", labelKey: "nav.doctorConnection", roles: ["PSYCHOANALYST"], iconKey: "Sparkles" },
      { href: "/psychoanalyst/account", labelKey: "nav.account", roles: ["PSYCHOANALYST"], iconKey: "Settings" },
      { href: "/humanitarian/volunteer", labelKey: "nav.humanitarianVolunteer", roles: ["PSYCHOANALYST"], iconKey: "Heart" },
    ],
  },
];

export const PSYCHOANALYST_NAV: PlatformNavEntry[] = flattenNavGroups(PSYCHOANALYST_NAV_GROUPS);

/** Integrative therapist portal sidebar groups. */
export const INTEGRATIVE_THERAPIST_NAV_GROUPS: PlatformNavGroup[] = [
  {
    labelKey: "nav.group.attendNow",
    items: [
      { href: "/integrative-therapist", labelKey: "nav.dashboard", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "LayoutDashboard" },
      { href: "/integrative-therapist/appointments", labelKey: "nav.appointments", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "Calendar" },
      { href: "/integrative-therapist/settings/availability", labelKey: "nav.availability", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "Calendar" },
    ],
  },
  {
    labelKey: "nav.group.patients",
    items: [
      { href: "/integrative-therapist/clients", labelKey: "it.nav.clients", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "Users" },
      { href: "/integrative-therapist/messages", labelKey: "nav.messages", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "MessageSquare" },
    ],
  },
  {
    labelKey: "nav.group.clinical",
    items: [
      { href: "/integrative-therapist/prescriptions", labelKey: "nav.prescriptions", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "Stethoscope" },
      { href: "/integrative-therapist/medicina-natural", labelKey: "nav.naturalMedicine", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "Leaf" },
      { href: "/integrative-therapist/chas-medicinais", labelKey: "nav.medicinalTeas", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "FlaskConical" },
      { href: "/integrative-therapist/florais", labelKey: "nav.florais", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "Flower2" },
      { href: "/integrative-therapist/meeting-rooms", labelKey: "nav.meetingRooms", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "Video" },
    ],
  },
  {
    labelKey: "nav.group.accountMore",
    items: [
      { href: "/integrative-therapist/financeiro", labelKey: "nav.financeiro", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "TrendingUp" },
      { href: "/integrative-therapist/settings", labelKey: "nav.myProfile", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "UserCog" },
      { href: "/humanitarian/volunteer", labelKey: "nav.humanitarianVolunteer", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "Heart" },
    ],
  },
];

export const INTEGRATIVE_THERAPIST_NAV: PlatformNavEntry[] = flattenNavGroups(INTEGRATIVE_THERAPIST_NAV_GROUPS);

/** Grouped nav for provider portals (patient uses PATIENT_NAV_GROUPS). */
export const PLATFORM_NAV_GROUPS_BY_PORTAL: Partial<Record<PlatformPortalId, PlatformNavGroup[]>> = {
  PROFESSIONAL: PROFESSIONAL_NAV_GROUPS,
  PSYCHOLOGIST: PSYCHOLOGIST_NAV_GROUPS,
  NUTRITIONIST: NUTRITIONIST_NAV_GROUPS,
  NURSE: NURSE_NAV_GROUPS,
  PHARMACIST: PHARMACIST_NAV_GROUPS,
  DENTIST: DENTIST_NAV_GROUPS,
  PSYCHOANALYST: PSYCHOANALYST_NAV_GROUPS,
  INTEGRATIVE_THERAPIST: INTEGRATIVE_THERAPIST_NAV_GROUPS,
};

export const ORGANIZATION_NAV: PlatformNavEntry[] = [
  { href: "/organization", labelKey: "nav.dashboard", roles: ["ORGANIZATION"], iconKey: "LayoutDashboard" },
  { href: "/organization/appointments", labelKey: "nav.appointments", roles: ["ORGANIZATION"], iconKey: "Calendar" },
  { href: "/organization/patients", labelKey: "nav.patients", roles: ["ORGANIZATION"], iconKey: "Users" },
  { href: "/organization/financeiro", labelKey: "nav.financeiro", roles: ["ORGANIZATION"], iconKey: "TrendingUp" },
  { href: "/organization/ledger", labelKey: "org.nav.ledger", roles: ["ORGANIZATION"], iconKey: "ClipboardList" },
  { href: "/organization/reports", labelKey: "org.nav.reports", roles: ["ORGANIZATION"], iconKey: "BarChart3" },
  { href: "/organization/convenios", labelKey: "org.nav.convenios", roles: ["ORGANIZATION"], iconKey: "Shield" },
  { href: "/organization/hr", labelKey: "org.nav.hr", roles: ["ORGANIZATION"], iconKey: "Briefcase" },
  { href: "/organization/accounting", labelKey: "org.nav.accounting", roles: ["ORGANIZATION"], iconKey: "FileSpreadsheet" },
  { href: "/organization/invoices", labelKey: "org.nav.invoices", roles: ["ORGANIZATION"], iconKey: "Receipt" },
  { href: "/organization/purchases", labelKey: "org.nav.purchases", roles: ["ORGANIZATION"], iconKey: "Package" },
  { href: "/organization/marketing", labelKey: "org.nav.marketing", roles: ["ORGANIZATION"], iconKey: "Megaphone" },
  { href: "/organization/team", labelKey: "org.nav.team", roles: ["ORGANIZATION"], iconKey: "Building2" },
  { href: "/organization/settings", labelKey: "nav.account", roles: ["ORGANIZATION"], iconKey: "Settings" },
];

/** Employer B2B portal — NR-1 compliance + EAP */
export const EMPLOYER_NAV: PlatformNavEntry[] = [
  { href: "/empresas/painel", labelKey: "nav.dashboard", roles: ["EMPLOYER"], iconKey: "LayoutDashboard" },
  { href: "/empresas/nr1", labelKey: "emp.nav.nr1", roles: ["EMPLOYER"], iconKey: "Shield" },
  { href: "/empresas/aep", labelKey: "emp.nav.aep", roles: ["EMPLOYER"], iconKey: "ClipboardList" },
  { href: "/empresas/plano-acao", labelKey: "emp.nav.actionPlan", roles: ["EMPLOYER"], iconKey: "FileSpreadsheet" },
  { href: "/empresas/pesquisas", labelKey: "emp.nav.surveys", roles: ["EMPLOYER"], iconKey: "BarChart3" },
  { href: "/empresas/colaboradores", labelKey: "emp.nav.workforce", roles: ["EMPLOYER"], iconKey: "Users" },
  { href: "/empresas/eap", labelKey: "emp.nav.eap", roles: ["EMPLOYER"], iconKey: "Brain" },
  { href: "/empresas/conteudo", labelKey: "emp.nav.content", roles: ["EMPLOYER"], iconKey: "BookOpen" },
  { href: "/empresas/rede-psicologos", labelKey: "emp.nav.psychNetwork", roles: ["EMPLOYER"], iconKey: "Brain" },
  { href: "/empresas/pcmso", labelKey: "emp.nav.pcmso", roles: ["EMPLOYER"], iconKey: "Stethoscope" },
  { href: "/empresas/exames", labelKey: "emp.nav.exams", roles: ["EMPLOYER"], iconKey: "Heart" },
  { href: "/empresas/documentacao", labelKey: "emp.nav.docs", roles: ["EMPLOYER"], iconKey: "ScrollText" },
  { href: "/empresas/denuncias", labelKey: "emp.nav.whistleblower", roles: ["EMPLOYER"], iconKey: "MessageSquare" },
  { href: "/empresas/equipe", labelKey: "emp.nav.team", roles: ["EMPLOYER"], iconKey: "Building2" },
  { href: "/empresas/configuracoes", labelKey: "nav.account", roles: ["EMPLOYER"], iconKey: "Settings" },
  { href: "/empresas/integracoes", labelKey: "emp.nav.integrations", roles: ["EMPLOYER"], iconKey: "Plug" },
];

/** Occupational physician — PCMSO coordinator read-only slice */
export const OCCUPATIONAL_PHYSICIAN_NAV: PlatformNavEntry[] = [
  { href: "/empresas/medico/painel", labelKey: "nav.dashboard", roles: ["OCCUPATIONAL_PHYSICIAN"], iconKey: "LayoutDashboard" },
];

export const ADMIN_NAV: PlatformNavEntry[] = [
  { href: "/admin", labelKey: "admin.home.title", roles: ["ADMIN"], iconKey: "Shield" },
  { href: "/admin/categories", labelKey: "nav.adminCategories", roles: ["ADMIN"], iconKey: "Layers" },
  { href: "/admin/doctors", labelKey: "nav.adminDoctors", roles: ["ADMIN"], iconKey: "Stethoscope" },
  { href: "/admin/patients", labelKey: "nav.adminPatients", roles: ["ADMIN"], iconKey: "Users" },
  { href: "/admin/empresas", labelKey: "nav.adminEmployers", roles: ["ADMIN"], iconKey: "Building2" },
  { href: "/admin/farmacias", labelKey: "nav.adminPharmacies", roles: ["ADMIN"], iconKey: "Pill" },
  { href: "/admin/payments", labelKey: "nav.adminPayments", roles: ["ADMIN"], iconKey: "CreditCard" },
  { href: "/admin/courses", labelKey: "nav.adminCourses", roles: ["ADMIN"], iconKey: "BookOpen" },
  { href: "/admin/jit-events", labelKey: "nav.adminJitEvents", roles: ["ADMIN"], iconKey: "Radio" },
  { href: "/admin/humanitarian", labelKey: "nav.adminHumanitarian", roles: ["ADMIN"], iconKey: "Heart" },
  { href: "/admin/buying-clubs", labelKey: "nav.adminBuyingClubs", roles: ["ADMIN"], iconKey: "ShoppingBag" },
  { href: "/admin/integrations", labelKey: "nav.adminIntegrations", roles: ["ADMIN"], iconKey: "Plug" },
  { href: "/admin/audit", labelKey: "nav.adminAudit", roles: ["ADMIN"], iconKey: "ScrollText" },
  { href: "/admin/rateio", labelKey: "nav.adminRateio", roles: ["ADMIN"], iconKey: "PieChart" },
];

/** Angel volunteers — patient monitoring + follow-up (subset of admin). */
export const ANGEL_NAV: PlatformNavEntry[] = [
  { href: "/admin/patients", labelKey: "nav.adminPatients", roles: ["ANGEL"], iconKey: "Users" },
  { href: "/admin/angel", labelKey: "angel.nav.followUp", roles: ["ANGEL"], iconKey: "Heart" },
];

/** All dashboard portals ? keys match role resolution in layout. */
export const PLATFORM_NAV_BY_PORTAL: Record<PlatformPortalId, PlatformNavEntry[]> = {
  PATIENT: PATIENT_NAV,
  PROFESSIONAL: PROFESSIONAL_NAV,
  PSYCHOLOGIST: PSYCHOLOGIST_NAV,
  NUTRITIONIST: NUTRITIONIST_NAV,
  NURSE: NURSE_NAV,
  PHARMACIST: PHARMACIST_NAV,
  DENTIST: DENTIST_NAV,
  PSYCHOANALYST: PSYCHOANALYST_NAV,
  INTEGRATIVE_THERAPIST: INTEGRATIVE_THERAPIST_NAV,
  ORGANIZATION: ORGANIZATION_NAV,
  EMPLOYER: EMPLOYER_NAV,
  OCCUPATIONAL_PHYSICIAN: OCCUPATIONAL_PHYSICIAN_NAV,
  ADMIN: ADMIN_NAV,
  ANGEL: ANGEL_NAV,
};

/** Public / auth routes not in dashboard sidebar ? included in support knowledge. */
export const PLATFORM_PUBLIC_ROUTES: PublicRouteEntry[] = [
  { href: "/login", description: "Sign in (email/password or Google)" },
  { href: "/register", description: "Create account (patient, professional, or other roles)" },
  { href: "/register/angel", description: "Register as humanitarian Angel volunteer (lay accompaniment)" },
  { href: "/verify-email", description: "Email verification after registration" },
  { href: "/forgot-password", description: "Password reset request" },
  { href: "/reset-password", description: "Set new password from email link" },
  { href: "/urgent", description: "Paid urgent care queue (patient)" },
  { href: "/cursos", description: "Course marketplace for healthcare professionals" },
  { href: "/humanitarian/volunteer", description: "Humanitarian volunteer dashboard (professionals)" },
  { href: "/anfiteatro/nise-yamaguchi", description: "Virtual amphitheater invite — register as professional to join meeting rooms" },
  { href: "/admin/angel", description: "Angel volunteer follow-up dashboard" },
  { href: "/empresas", description: "Employer NR-1 B2B landing" },
  { href: "/empresas/login", description: "Employer portal sign in" },
  { href: "/empresas/cadastro", description: "Register employer company (NR-1)" },
  { href: "/empresas/medico/login", description: "Occupational physician (PCMSO) sign in" },
  { href: "/empresas/psicologo/login", description: "Psychologist EAP / corporate network sign in" },
];

export function allPlatformNavEntries(): PlatformNavEntry[] {
  return Object.values(PLATFORM_NAV_BY_PORTAL).flat();
}

export function countPlatformRoutes(): number {
  return allPlatformNavEntries().length + PLATFORM_PUBLIC_ROUTES.length;
}
