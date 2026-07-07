import { db } from "@/lib/db";

export async function getInstructorDisplay(userId: string): Promise<{
  name: string;
  specialty: string | null;
  licenseNumber: string | null;
}> {
  const [pro, psycho, integrative] = await Promise.all([
    db.professionalProfile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true, specialty: true, licenseNumber: true },
    }),
    db.psychoanalystProfile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true, otherRegulatedProfession: true },
    }),
    db.integrativeTherapistProfile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true, picsPractices: true, certifications: true },
    }),
  ]);

  if (pro) {
    return {
      name: `${pro.firstName} ${pro.lastName}`.trim(),
      specialty: pro.specialty,
      licenseNumber: pro.licenseNumber,
    };
  }
  if (psycho) {
    return {
      name: `${psycho.firstName} ${psycho.lastName}`.trim(),
      specialty: "Psicanálise",
      licenseNumber: psycho.otherRegulatedProfession ?? null,
    };
  }
  if (integrative) {
    return {
      name: `${integrative.firstName} ${integrative.lastName}`.trim(),
      specialty: integrative.picsPractices[0] ?? "Medicina integrativa",
      licenseNumber: integrative.certifications ?? null,
    };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return { name: user?.email?.split("@")[0] ?? "Instrutor", specialty: null, licenseNumber: null };
}

export async function getStudentDisplayName(userId: string): Promise<string> {
  const [pro, psycho, integrative, patient] = await Promise.all([
    db.professionalProfile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true },
    }),
    db.psychoanalystProfile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true },
    }),
    db.integrativeTherapistProfile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true },
    }),
    db.patientProfile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true },
    }),
  ]);

  const profile = pro ?? psycho ?? integrative ?? patient;
  if (profile) {
    const name = `${profile.firstName} ${profile.lastName}`.trim();
    if (name) return name;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email?.split("@")[0] ?? "Aluno";
}

export function formatPriceBrl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const PROFESSION_LABELS: Record<string, string> = {
  MEDICINE: "Medicina",
  NURSING: "Enfermagem",
  PHARMACY: "Farmácia",
  PSYCHOLOGY: "Psicologia",
  NUTRITION: "Nutrição",
  DENTISTRY: "Odontologia",
  INTEGRATIVE: "Medicina Integrativa",
  PSYCHOANALYSIS: "Psicanálise",
  GENERAL: "Saúde",
};
