import { db } from "@/lib/db";

type ProfileNames = {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
};

type ProviderVerificationProfiles = {
  professionalProfile?: { verified: boolean } | null;
  psychoanalystProfile?: { verified: boolean } | null;
  integrativeTherapistProfile?: { verified: boolean } | null;
};

type OrgType = "CLINIC" | "EMPLOYER" | "PHARMACY" | "LABORATORY";

type B2BOrgClaims = {
  org_type: OrgType | null;
  org_cnpj: string | null;
  org_name: string | null;
  org_razao_social: string | null;
  org_member_role: string | null;
};

const B2B_ROLES = new Set([
  "ORGANIZATION",
  "EMPLOYER",
  "PHARMACY_STORE",
  "LABORATORY",
]);

const NULL_ORG_CLAIMS: B2BOrgClaims = {
  org_type: null,
  org_cnpj: null,
  org_name: null,
  org_razao_social: null,
  org_member_role: null,
};

function normalizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

function entityResponsibleName(entity: {
  responsibleFirstName: string;
  responsibleLastName: string;
  nomeFantasia: string;
}): string {
  const responsible = [entity.responsibleFirstName, entity.responsibleLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return responsible || entity.nomeFantasia;
}

/** Admin document approval on the provider profile (not email_verified). */
export function resolveProviderVerified(
  role: string,
  profiles: ProviderVerificationProfiles,
): boolean {
  switch (role) {
    case "PROFESSIONAL":
      return profiles.professionalProfile?.verified ?? false;
    case "PSYCHOANALYST":
      return profiles.psychoanalystProfile?.verified ?? false;
    case "INTEGRATIVE_THERAPIST":
      return profiles.integrativeTherapistProfile?.verified ?? false;
    default:
      return false;
  }
}

function fullName(profile: ProfileNames | null | undefined, fallback: string): string {
  if (!profile) return fallback;
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  return name || fallback;
}

async function resolveB2BClaims(
  userId: string,
  role: string,
): Promise<{ claims: B2BOrgClaims; verified: boolean; nameFallback?: string }> {
  if (!B2B_ROLES.has(role)) {
    return { claims: NULL_ORG_CLAIMS, verified: false };
  }

  switch (role) {
    case "ORGANIZATION": {
      const member = await db.organizationMember.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: { joinedAt: "asc" },
        include: { organization: true },
      });
      if (!member) return { claims: NULL_ORG_CLAIMS, verified: false };
      return {
        claims: {
          org_type: "CLINIC",
          org_cnpj: normalizeCnpj(member.organization.cnpj),
          org_name: member.organization.nomeFantasia,
          org_razao_social: member.organization.razaoSocial,
          org_member_role: member.role,
        },
        verified: true,
        nameFallback: entityResponsibleName(member.organization),
      };
    }
    case "EMPLOYER": {
      const member = await db.employerMember.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: { joinedAt: "asc" },
        include: { employerCompany: true },
      });
      if (!member) return { claims: NULL_ORG_CLAIMS, verified: false };
      return {
        claims: {
          org_type: "EMPLOYER",
          org_cnpj: normalizeCnpj(member.employerCompany.cnpj),
          org_name: member.employerCompany.nomeFantasia,
          org_razao_social: member.employerCompany.razaoSocial,
          org_member_role: member.role,
        },
        verified: true,
        nameFallback: entityResponsibleName(member.employerCompany),
      };
    }
    case "PHARMACY_STORE": {
      const member = await db.pharmacyStoreMember.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: { joinedAt: "asc" },
        include: { pharmacyStore: true },
      });
      if (!member) return { claims: NULL_ORG_CLAIMS, verified: false };
      return {
        claims: {
          org_type: "PHARMACY",
          org_cnpj: normalizeCnpj(member.pharmacyStore.cnpj),
          org_name: member.pharmacyStore.nomeFantasia,
          org_razao_social: member.pharmacyStore.razaoSocial,
          org_member_role: member.role,
        },
        verified: member.pharmacyStore.status === "ACTIVE",
        nameFallback: entityResponsibleName(member.pharmacyStore),
      };
    }
    case "LABORATORY": {
      const member = await db.laboratoryMember.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: { joinedAt: "asc" },
        include: { laboratory: true },
      });
      if (!member) return { claims: NULL_ORG_CLAIMS, verified: false };
      return {
        claims: {
          org_type: "LABORATORY",
          org_cnpj: normalizeCnpj(member.laboratory.cnpj),
          org_name: member.laboratory.nomeFantasia,
          org_razao_social: member.laboratory.razaoSocial,
          org_member_role: member.role,
        },
        verified: member.laboratory.status === "ACTIVE",
        nameFallback: entityResponsibleName(member.laboratory),
      };
    }
    default:
      return { claims: NULL_ORG_CLAIMS, verified: false };
  }
}

export async function getSsoUserClaims(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      role: true,
      deletedAt: true,
      patientProfile: { select: { firstName: true, lastName: true, avatarUrl: true } },
      professionalProfile: {
        select: { firstName: true, lastName: true, avatarUrl: true, verified: true },
      },
      psychoanalystProfile: {
        select: { firstName: true, lastName: true, avatarUrl: true, verified: true },
      },
      integrativeTherapistProfile: {
        select: { firstName: true, lastName: true, avatarUrl: true, verified: true },
      },
    },
  });

  if (!user || user.deletedAt) return null;

  const profile =
    user.professionalProfile ??
    user.psychoanalystProfile ??
    user.integrativeTherapistProfile ??
    user.patientProfile;

  const emailFallback = user.email.split("@")[0] ?? "Profissional";
  const b2b = await resolveB2BClaims(userId, user.role);

  const hasPersonalProfile =
    !!user.professionalProfile ||
    !!user.psychoanalystProfile ||
    !!user.integrativeTherapistProfile ||
    !!user.patientProfile;

  const name = B2B_ROLES.has(user.role) && !hasPersonalProfile
    ? (b2b.nameFallback ?? emailFallback)
    : fullName(profile, emailFallback);

  const verified = B2B_ROLES.has(user.role)
    ? b2b.verified
    : resolveProviderVerified(user.role, user);

  return {
    sub: user.id,
    email: user.email,
    email_verified: user.emailVerified != null,
    name,
    picture: profile?.avatarUrl ?? null,
    role: user.role,
    verified,
    ...b2b.claims,
  };
}
