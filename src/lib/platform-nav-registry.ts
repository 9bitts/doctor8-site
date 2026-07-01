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
  | "Video";

export type PlatformNavEntry = {
  href: string;
  labelKey: string;
  roles: string[];
  iconKey: NavIconKey;
};

export type PlatformPortalId =
  | "PATIENT"
  | "PROFESSIONAL"
  | "PSYCHOLOGIST"
  | "PSYCHOANALYST"
  | "INTEGRATIVE_THERAPIST"
  | "ORGANIZATION"
  | "ADMIN";

export type PublicRouteEntry = {
  href: string;
  description: string;
};

export const PATIENT_NAV: PlatformNavEntry[] = [
  { href: "/patient", labelKey: "nav.dashboard", roles: ["PATIENT"], iconKey: "LayoutDashboard" },
  { href: "/patient/history", labelKey: "nav.medicalHistory", roles: ["PATIENT"], iconKey: "FileText" },
  { href: "/patient/medications", labelKey: "nav.medications", roles: ["PATIENT"], iconKey: "Pill" },
  { href: "/patient/buying-club", labelKey: "nav.buyingClub", roles: ["PATIENT"], iconKey: "ShoppingBag" },
  { href: "/patient/club-doctor", labelKey: "nav.clubDoctor", roles: ["PATIENT"], iconKey: "Sparkles" },
  { href: "/patient/prescriptions", labelKey: "nav.myPrescriptions", roles: ["PATIENT"], iconKey: "Stethoscope" },
  { href: "/patient/exam-requests", labelKey: "nav.myExamRequests", roles: ["PATIENT"], iconKey: "FlaskConical" },
  { href: "/patient/appointments", labelKey: "nav.appointments", roles: ["PATIENT"], iconKey: "Calendar" },
  { href: "/patient/providers", labelKey: "nav.myProviders", roles: ["PATIENT"], iconKey: "Users" },
  { href: "/patient/integrative-care", labelKey: "nav.integrativeCare", roles: ["PATIENT"], iconKey: "Leaf" },
  { href: "/patient/documents", labelKey: "nav.documents", roles: ["PATIENT"], iconKey: "ClipboardList" },
  { href: "/patient/resources", labelKey: "nav.doctorResources", roles: ["PATIENT"], iconKey: "BookOpen" },
  { href: "/patient/messages", labelKey: "nav.messages", roles: ["PATIENT"], iconKey: "MessageSquare" },
  { href: "/urgent", labelKey: "nav.urgent", roles: ["PATIENT"], iconKey: "Radio" },
  { href: "/humanitarian/venezuela-terremoto-2026", labelKey: "nav.humanitarian", roles: ["PATIENT"], iconKey: "Heart" },
  { href: "/patient/find", labelKey: "nav.find", roles: ["PATIENT"], iconKey: "MapPin" },
  { href: "/patient/account", labelKey: "nav.account", roles: ["PATIENT"], iconKey: "Settings" },
];

export const PROFESSIONAL_NAV: PlatformNavEntry[] = [
  { href: "/professional", labelKey: "nav.dashboard", roles: ["PROFESSIONAL"], iconKey: "LayoutDashboard" },
  { href: "/professional/doctor-connection", labelKey: "nav.doctorConnection", roles: ["PROFESSIONAL"], iconKey: "Sparkles" },
  { href: "/professional/settings", labelKey: "nav.myProfile", roles: ["PROFESSIONAL"], iconKey: "UserCog" },
  { href: "/professional/patients", labelKey: "nav.patients", roles: ["PROFESSIONAL"], iconKey: "Users" },
  { href: "/professional/psychology", labelKey: "nav.psychologyArea", roles: ["PROFESSIONAL"], iconKey: "Brain" },
  { href: "/professional/shared", labelKey: "nav.sharedWithMe", roles: ["PROFESSIONAL"], iconKey: "Inbox" },
  { href: "/professional/categories", labelKey: "nav.categories", roles: ["PROFESSIONAL"], iconKey: "Layers" },
  { href: "/professional/appointments", labelKey: "nav.appointments", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
  { href: "/professional/prescriptions", labelKey: "nav.prescriptions", roles: ["PROFESSIONAL"], iconKey: "Stethoscope" },
  { href: "/professional/buying-club", labelKey: "nav.buyingClub", roles: ["PROFESSIONAL"], iconKey: "ShoppingBag" },
  { href: "/professional/resources", labelKey: "nav.library", roles: ["PROFESSIONAL"], iconKey: "BookOpen" },
  { href: "/professional/jit", labelKey: "nav.jit", roles: ["PROFESSIONAL"], iconKey: "Radio" },
  { href: "/humanitarian/volunteer", labelKey: "nav.humanitarianVolunteer", roles: ["PROFESSIONAL"], iconKey: "Heart" },
  { href: "/professional/meeting-rooms", labelKey: "nav.meetingRooms", roles: ["PROFESSIONAL"], iconKey: "Video" },
  { href: "/professional/financeiro", labelKey: "nav.financeiro", roles: ["PROFESSIONAL"], iconKey: "TrendingUp" },
  { href: "/professional/messages", labelKey: "nav.messages", roles: ["PROFESSIONAL"], iconKey: "MessageSquare" },
  { href: "/professional/settings/availability", labelKey: "nav.availability", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
  { href: "/professional/account", labelKey: "nav.account", roles: ["PROFESSIONAL"], iconKey: "Settings" },
];

export const PSYCHOLOGIST_NAV: PlatformNavEntry[] = [
  { href: "/psychologist", labelKey: "nav.dashboard", roles: ["PROFESSIONAL"], iconKey: "LayoutDashboard" },
  { href: "/psychologist/doctor-connection", labelKey: "nav.doctorConnection", roles: ["PROFESSIONAL"], iconKey: "Sparkles" },
  { href: "/psychologist/settings", labelKey: "nav.myProfile", roles: ["PROFESSIONAL"], iconKey: "UserCog" },
  { href: "/psychologist/patients", labelKey: "nav.patients", roles: ["PROFESSIONAL"], iconKey: "Users" },
  { href: "/psychologist/sessions", labelKey: "psy.mod.sessions.title", roles: ["PROFESSIONAL"], iconKey: "ClipboardList" },
  { href: "/psychologist/scales", labelKey: "psy.mod.scales.title", roles: ["PROFESSIONAL"], iconKey: "BarChart3" },
  { href: "/psychologist/documents", labelKey: "psy.mod.documents.title", roles: ["PROFESSIONAL"], iconKey: "FileText" },
  { href: "/psychologist/compliance", labelKey: "psy.mod.compliance.title", roles: ["PROFESSIONAL"], iconKey: "Shield" },
  { href: "/psychologist/shared", labelKey: "nav.sharedWithMe", roles: ["PROFESSIONAL"], iconKey: "Inbox" },
  { href: "/psychologist/categories", labelKey: "nav.categories", roles: ["PROFESSIONAL"], iconKey: "Layers" },
  { href: "/psychologist/appointments", labelKey: "nav.appointments", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
  { href: "/psychologist/jit", labelKey: "nav.jit", roles: ["PROFESSIONAL"], iconKey: "Radio" },
  { href: "/psychologist/resources", labelKey: "nav.library", roles: ["PROFESSIONAL"], iconKey: "BookOpen" },
  { href: "/humanitarian/volunteer", labelKey: "nav.humanitarianVolunteer", roles: ["PROFESSIONAL"], iconKey: "Heart" },
  { href: "/psychologist/meeting-rooms", labelKey: "nav.meetingRooms", roles: ["PROFESSIONAL"], iconKey: "Video" },
  { href: "/psychologist/financeiro", labelKey: "nav.financeiro", roles: ["PROFESSIONAL"], iconKey: "TrendingUp" },
  { href: "/psychologist/messages", labelKey: "nav.messages", roles: ["PROFESSIONAL"], iconKey: "MessageSquare" },
  { href: "/psychologist/settings/availability", labelKey: "nav.availability", roles: ["PROFESSIONAL"], iconKey: "Calendar" },
  { href: "/psychologist/account", labelKey: "nav.account", roles: ["PROFESSIONAL"], iconKey: "Settings" },
];

export const PSYCHOANALYST_NAV: PlatformNavEntry[] = [
  { href: "/psychoanalyst", labelKey: "nav.dashboard", roles: ["PSYCHOANALYST"], iconKey: "LayoutDashboard" },
  { href: "/psychoanalyst/doctor-connection", labelKey: "nav.doctorConnection", roles: ["PSYCHOANALYST"], iconKey: "Sparkles" },
  { href: "/psychoanalyst/freud", labelKey: "pa.freud.nav", roles: ["PSYCHOANALYST"], iconKey: "Brain" },
  { href: "/psychoanalyst/settings", labelKey: "nav.myProfile", roles: ["PSYCHOANALYST"], iconKey: "UserCog" },
  { href: "/psychoanalyst/analysands", labelKey: "pa.nav.analysands", roles: ["PSYCHOANALYST"], iconKey: "Users" },
  { href: "/psychoanalyst/appointments", labelKey: "nav.appointments", roles: ["PSYCHOANALYST"], iconKey: "Calendar" },
  { href: "/psychoanalyst/resources", labelKey: "nav.library", roles: ["PSYCHOANALYST"], iconKey: "BookOpen" },
  { href: "/psychoanalyst/financeiro", labelKey: "nav.financeiro", roles: ["PSYCHOANALYST"], iconKey: "TrendingUp" },
  { href: "/humanitarian/volunteer", labelKey: "nav.humanitarianVolunteer", roles: ["PSYCHOANALYST"], iconKey: "Heart" },
  { href: "/psychoanalyst/settings/availability", labelKey: "nav.availability", roles: ["PSYCHOANALYST"], iconKey: "Calendar" },
  { href: "/psychoanalyst/account", labelKey: "nav.account", roles: ["PSYCHOANALYST"], iconKey: "Settings" },
];

export const INTEGRATIVE_THERAPIST_NAV: PlatformNavEntry[] = [
  { href: "/integrative-therapist", labelKey: "nav.dashboard", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "LayoutDashboard" },
  { href: "/integrative-therapist/settings", labelKey: "nav.myProfile", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "UserCog" },
  { href: "/integrative-therapist/clients", labelKey: "it.nav.clients", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "Users" },
  { href: "/integrative-therapist/appointments", labelKey: "nav.appointments", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "Calendar" },
  { href: "/integrative-therapist/financeiro", labelKey: "nav.financeiro", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "TrendingUp" },
  { href: "/humanitarian/volunteer", labelKey: "nav.humanitarianVolunteer", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "Heart" },
  { href: "/integrative-therapist/settings/availability", labelKey: "nav.availability", roles: ["INTEGRATIVE_THERAPIST"], iconKey: "Calendar" },
];

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

export const ADMIN_NAV: PlatformNavEntry[] = [
  { href: "/admin", labelKey: "admin.home.title", roles: ["ADMIN"], iconKey: "Shield" },
  { href: "/admin/categories", labelKey: "nav.adminCategories", roles: ["ADMIN"], iconKey: "Layers" },
  { href: "/admin/doctors", labelKey: "nav.adminDoctors", roles: ["ADMIN"], iconKey: "Stethoscope" },
  { href: "/admin/patients", labelKey: "nav.adminPatients", roles: ["ADMIN"], iconKey: "Users" },
  { href: "/admin/payments", labelKey: "nav.adminPayments", roles: ["ADMIN"], iconKey: "CreditCard" },
  { href: "/admin/jit-events", labelKey: "nav.adminJitEvents", roles: ["ADMIN"], iconKey: "Radio" },
  { href: "/admin/humanitarian", labelKey: "nav.adminHumanitarian", roles: ["ADMIN"], iconKey: "Heart" },
  { href: "/admin/buying-clubs", labelKey: "nav.adminBuyingClubs", roles: ["ADMIN"], iconKey: "ShoppingBag" },
  { href: "/admin/integrations", labelKey: "nav.adminIntegrations", roles: ["ADMIN"], iconKey: "Plug" },
  { href: "/admin/audit", labelKey: "nav.adminAudit", roles: ["ADMIN"], iconKey: "ScrollText" },
  { href: "/admin/rateio", labelKey: "nav.adminRateio", roles: ["ADMIN"], iconKey: "PieChart" },
];

/** All dashboard portals ? keys match role resolution in layout. */
export const PLATFORM_NAV_BY_PORTAL: Record<PlatformPortalId, PlatformNavEntry[]> = {
  PATIENT: PATIENT_NAV,
  PROFESSIONAL: PROFESSIONAL_NAV,
  PSYCHOLOGIST: PSYCHOLOGIST_NAV,
  PSYCHOANALYST: PSYCHOANALYST_NAV,
  INTEGRATIVE_THERAPIST: INTEGRATIVE_THERAPIST_NAV,
  ORGANIZATION: ORGANIZATION_NAV,
  ADMIN: ADMIN_NAV,
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
  { href: "/humanitarian/volunteer", description: "Humanitarian volunteer dashboard (professionals)" },
  { href: "/humanitarian/angel", description: "Angel volunteer area" },
];

export function allPlatformNavEntries(): PlatformNavEntry[] {
  return Object.values(PLATFORM_NAV_BY_PORTAL).flat();
}

export function countPlatformRoutes(): number {
  return allPlatformNavEntries().length + PLATFORM_PUBLIC_ROUTES.length;
}
