import type { Prisma, UserRole } from "@prisma/client";
import { encrypt } from "@/lib/encryption";
import { encryptUserPhone } from "@/lib/user-phone";

type Tx = Prisma.TransactionClient;

/** Saves E.164 digits on User and role profile when applicable. Skips if e164 empty. */
export async function saveRegistrationPhone(
  tx: Tx,
  userId: string,
  role: UserRole,
  e164: string,
): Promise<void> {
  if (!e164) return;

  await tx.user.update({
    where: { id: userId },
    data: { phone: encryptUserPhone(e164) },
  });

  const displayPhone = encrypt(`+${e164}`);

  if (role === "PATIENT") {
    await tx.patientProfile.updateMany({
      where: { userId },
      data: { phone: displayPhone },
    });
  } else if (role === "PROFESSIONAL") {
    await tx.professionalProfile.updateMany({
      where: { userId },
      data: { phone: displayPhone },
    });
  } else if (role === "PSYCHOANALYST") {
    await tx.psychoanalystProfile.updateMany({
      where: { userId },
      data: { phone: displayPhone },
    });
  } else if (role === "INTEGRATIVE_THERAPIST") {
    await tx.integrativeTherapistProfile.updateMany({
      where: { userId },
      data: { phone: displayPhone },
    });
  } else if (role === "ANGEL") {
    await tx.angelProfile.updateMany({
      where: { userId },
      data: { phone: displayPhone },
    });
  }
}
