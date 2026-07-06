import type { Prisma } from "@prisma/client";
import { encrypt } from "@/lib/encryption";
import type { OAuthProfessionSlug, SignupRole } from "@/lib/oauth-signup-intent";
import { isProfessionSignupSlug, PROFESSION_SIGNUP } from "@/lib/profession-signup";

type Tx = Prisma.TransactionClient;

function resolveProfessionalSpecialty(opts: {
  professionalKind?: "psychologist" | null;
  profession?: OAuthProfessionSlug | null;
}): string {
  if (opts.professionalKind === "psychologist") return "Psychologist";
  const slug = opts.profession;
  if (slug && isProfessionSignupSlug(slug)) {
    const cfg = PROFESSION_SIGNUP[slug];
    if (cfg.role === "PROFESSIONAL") return cfg.specialty ?? "";
  }
  return "";
}

export async function createSignupProfile(
  tx: Tx,
  opts: {
    userId: string;
    role: SignupRole;
    professionalKind?: "psychologist" | null;
    profession?: OAuthProfessionSlug | null;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  },
): Promise<void> {
  const { userId, role, professionalKind, profession, firstName, lastName, avatarUrl } = opts;

  if (role === "PROFESSIONAL") {
    await tx.professionalProfile.create({
      data: {
        userId,
        firstName,
        lastName,
        avatarUrl: avatarUrl ?? null,
        licenseNumber: "",
        specialty: resolveProfessionalSpecialty({ professionalKind, profession }),
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
