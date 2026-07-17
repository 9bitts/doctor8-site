/** AcuraBrasil volunteer badge — admin-approved; not self-service. */

import type { AcuraVolunteerStatus } from "@prisma/client";

export const ACURA_VOLUNTEER_LOGO = "/branding/acurabrasil-logo.png";
export const ACURA_BRASIL_LOGO_WHITE = "/branding/acurabrasil-logo-white.png";
export const ACURA_VOLUNTEER_TERMS_URL = "/acura-voluntariado";

export type ProviderRole = "PROFESSIONAL" | "PSYCHOANALYST" | "INTEGRATIVE_THERAPIST";

export type AcuraVolunteerKind = "professional" | "psychoanalyst" | "integrative";

export type AcuraVolunteerInterest = "yes" | "no";

export type AcuraVolunteerWriteFields = {
  acuraVolunteerStatus: AcuraVolunteerStatus;
  acuraVolunteer: boolean;
  acuraVolunteerApprovedAt: Date | null;
  acuraVolunteerApprovedBy: string | null;
};

/** Public seal: verified + admin-approved (ACTIVE). */
export function isAcuraVolunteerProvider(verified: boolean, acuraVolunteer: boolean): boolean {
  return verified && acuraVolunteer;
}

export function isAcuraVolunteerActiveStatus(status: AcuraVolunteerStatus | string | null | undefined): boolean {
  return status === "ACTIVE";
}

/** Signup "yes" → PENDING; "no"/absent → NONE. Never ACTIVE from signup. */
export function acuraStatusFromSignupInterest(
  interest: AcuraVolunteerInterest | null | undefined,
): AcuraVolunteerStatus {
  return interest === "yes" ? "PENDING" : "NONE";
}

/** Prisma write payload keeping `acuraVolunteer` in sync with ACTIVE. */
export function acuraVolunteerWriteData(
  status: AcuraVolunteerStatus,
  opts?: { adminUserId?: string | null; now?: Date },
): AcuraVolunteerWriteFields {
  const now = opts?.now ?? new Date();
  if (status === "ACTIVE") {
    return {
      acuraVolunteerStatus: "ACTIVE",
      acuraVolunteer: true,
      acuraVolunteerApprovedAt: now,
      acuraVolunteerApprovedBy: opts?.adminUserId ?? null,
    };
  }
  return {
    acuraVolunteerStatus: status,
    acuraVolunteer: false,
    acuraVolunteerApprovedAt: null,
    acuraVolunteerApprovedBy: null,
  };
}

/** Create-time fields for new provider profiles. */
export function acuraVolunteerCreateData(
  status: AcuraVolunteerStatus = "NONE",
): {
  acuraVolunteer: boolean;
  acuraVolunteerStatus: AcuraVolunteerStatus;
} {
  return {
    acuraVolunteer: status === "ACTIVE",
    acuraVolunteerStatus: status,
  };
}

/** Sort volunteers first, then alphabetically by name. */
export function compareVolunteerFirst<
  T extends { verified?: boolean; acuraVolunteer?: boolean; firstName: string; lastName?: string | null },
>(a: T, b: T): number {
  const rank = (p: T) =>
    isAcuraVolunteerProvider(!!p.verified, !!p.acuraVolunteer) ? 0 : 1;
  const diff = rank(a) - rank(b);
  if (diff !== 0) return diff;
  const nameA = `${a.firstName} ${a.lastName ?? ""}`.trim();
  const nameB = `${b.firstName} ${b.lastName ?? ""}`.trim();
  return nameA.localeCompare(nameB);
}
