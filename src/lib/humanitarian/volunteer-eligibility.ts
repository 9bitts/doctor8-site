import { db } from "@/lib/db";

export type VolunteerVerificationResult =
  | { ok: true; verified: true }
  | { ok: false; error: "NOT_VERIFIED" | "NO_PROFILE" };

export async function getVolunteerVerificationStatus(
  userId: string,
  role: string,
): Promise<{ verified: boolean; profileExists: boolean }> {
  if (role === "PROFESSIONAL") {
    const profile = await db.professionalProfile.findUnique({
      where: { userId },
      select: { verified: true },
    });
    return { verified: profile?.verified ?? false, profileExists: !!profile };
  }

  if (role === "PSYCHOANALYST") {
    const profile = await db.psychoanalystProfile.findUnique({
      where: { userId },
      select: { verified: true },
    });
    return { verified: profile?.verified ?? false, profileExists: !!profile };
  }

  if (role === "INTEGRATIVE_THERAPIST") {
    const profile = await db.integrativeTherapistProfile.findUnique({
      where: { userId },
      select: { verified: true },
    });
    return { verified: profile?.verified ?? false, profileExists: !!profile };
  }

  return { verified: false, profileExists: false };
}

export async function requireVerifiedVolunteer(
  userId: string,
  role: string,
): Promise<VolunteerVerificationResult> {
  const status = await getVolunteerVerificationStatus(userId, role);
  if (!status.profileExists) return { ok: false, error: "NO_PROFILE" };
  if (!status.verified) return { ok: false, error: "NOT_VERIFIED" };
  return { ok: true, verified: true };
}

export function isVolunteerRole(role: string | undefined): boolean {
  return role === "PROFESSIONAL" || role === "PSYCHOANALYST" || role === "INTEGRATIVE_THERAPIST";
}

export function isVolunteerOnEntry(
  volunteer:
    | {
        professional?: { userId: string } | null;
        psychoanalyst?: { userId: string } | null;
        integrativeTherapist?: { userId: string } | null;
      }
    | null
    | undefined,
  userId: string,
): boolean {
  if (!volunteer) return false;
  return (
    volunteer.professional?.userId === userId ||
    volunteer.psychoanalyst?.userId === userId ||
    volunteer.integrativeTherapist?.userId === userId
  );
}
