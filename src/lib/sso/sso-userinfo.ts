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

  const name = fullName(profile, user.email.split("@")[0] ?? "Profissional");

  return {
    sub: user.id,
    email: user.email,
    email_verified: user.emailVerified != null,
    name,
    picture: profile?.avatarUrl ?? null,
    role: user.role,
    verified: resolveProviderVerified(user.role, user),
  };
}
