import type { Prisma } from "@prisma/client";
import { encrypt } from "@/lib/encryption";
import type { SignupRole } from "@/lib/oauth-signup-intent";

type Tx = Prisma.TransactionClient;

export async function createSignupProfile(
  tx: Tx,
  opts: {
    userId: string;
    role: SignupRole;
    professionalKind?: "psychologist" | null;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  },
): Promise<void> {
  const { userId, role, professionalKind, firstName, lastName, avatarUrl } = opts;

  if (role === "PROFESSIONAL") {
    await tx.professionalProfile.create({
      data: {
        userId,
        firstName,
        lastName,
        avatarUrl: avatarUrl ?? null,
        licenseNumber: "",
        specialty: professionalKind === "psychologist" ? "Psychologist" : "",
        consultPrice: 0,
      },
    });
  } else if (role === "PSYCHOANALYST") {
    await tx.psychoanalystProfile.create({
      data: {
        userId,
        firstName,
        lastName,
        avatarUrl: avatarUrl ?? null,
        trainingInstitution: "",
        consultPrice: 0,
      },
    });
  } else if (role === "INTEGRATIVE_THERAPIST") {
    await tx.integrativeTherapistProfile.create({
      data: {
        userId,
        firstName,
        lastName,
        avatarUrl: avatarUrl ?? null,
        trainingInstitution: "",
        consultPrice: 0,
      },
    });
  } else {
    await tx.patientProfile.create({
      data: {
        userId,
        firstName: encrypt(firstName),
        lastName: encrypt(lastName),
        avatarUrl: avatarUrl ?? null,
      },
    });
  }
}
