import type { UserRole } from "@prisma/client";

const ROLE_LABELS_PT: Record<UserRole, string> = {
  PATIENT: "paciente",
  PROFESSIONAL: "profissional de saúde",
  PSYCHOANALYST: "psicanalista",
  INTEGRATIVE_THERAPIST: "terapeuta integrativo",
  ORGANIZATION: "organização",
  EMPLOYER: "empresa",
  PHARMACY_STORE: "farmácia",
  LABORATORY: "laboratório",
  DISTRIBUTOR: "distribuidor",
  OCCUPATIONAL_PHYSICIAN: "médico do trabalho",
  ANGEL: "voluntário",
  ADMIN: "administrador",
};

export function portalRoleLabel(role: UserRole | string): string {
  return ROLE_LABELS_PT[role as UserRole] ?? role.toLowerCase();
}

export function canAcceptEmployerInvite(role: UserRole | string): boolean {
  return role === "EMPLOYER" || role === "ADMIN";
}

export function canAcceptOccupationalPhysicianInvite(role: UserRole | string): boolean {
  return role === "OCCUPATIONAL_PHYSICIAN" || role === "ADMIN";
}

export function buildRoleConflictMessage(
  currentRole: UserRole | string,
  targetPortal: "empresa" | "médico do trabalho",
): string {
  const label = portalRoleLabel(currentRole);
  return `Este e-mail já tem uma conta ${label} no Doctor8. Use outro e-mail para o portal ${targetPortal}.`;
}

export const ROLE_CONFLICT_CODE = "ROLE_CONFLICT";
