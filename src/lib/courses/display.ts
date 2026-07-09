import { db } from "@/lib/db";

export type InstructorDisplay = {
  name: string;
  specialty: string | null;
  licenseNumber: string | null;
};

export async function getInstructorDisplay(userId: string): Promise<InstructorDisplay> {
  const batch = await getInstructorDisplayBatch([userId]);
  return batch.get(userId) ?? { name: "Instrutor", specialty: null, licenseNumber: null };
}

export async function getInstructorDisplayBatch(
  userIds: string[],
): Promise<Map<string, InstructorDisplay>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const out = new Map<string, InstructorDisplay>();
  if (!unique.length) return out;

  const [pros, psychos, integratives, users] = await Promise.all([
    db.professionalProfile.findMany({
      where: { userId: { in: unique } },
      select: { userId: true, firstName: true, lastName: true, specialty: true, licenseNumber: true },
    }),
    db.psychoanalystProfile.findMany({
      where: { userId: { in: unique } },
      select: { userId: true, firstName: true, lastName: true, otherRegulatedProfession: true },
    }),
    db.integrativeTherapistProfile.findMany({
      where: { userId: { in: unique } },
      select: { userId: true, firstName: true, lastName: true, picsPractices: true, certifications: true },
    }),
    db.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, email: true },
    }),
  ]);

  const proByUser = new Map(pros.map((p) => [p.userId, p]));
  const psychoByUser = new Map(psychos.map((p) => [p.userId, p]));
  const integrativeByUser = new Map(integratives.map((p) => [p.userId, p]));
  const userById = new Map(users.map((u) => [u.id, u]));

  for (const userId of unique) {
    const pro = proByUser.get(userId);
    if (pro) {
      out.set(userId, {
        name: `${pro.firstName} ${pro.lastName}`.trim(),
        specialty: pro.specialty,
        licenseNumber: pro.licenseNumber,
      });
      continue;
    }
    const psycho = psychoByUser.get(userId);
    if (psycho) {
      out.set(userId, {
        name: `${psycho.firstName} ${psycho.lastName}`.trim(),
        specialty: "Psicanálise",
        licenseNumber: psycho.otherRegulatedProfession ?? null,
      });
      continue;
    }
    const integrative = integrativeByUser.get(userId);
    if (integrative) {
      out.set(userId, {
        name: `${integrative.firstName} ${integrative.lastName}`.trim(),
        specialty: integrative.picsPractices[0] ?? "Medicina integrativa",
        licenseNumber: integrative.certifications ?? null,
      });
      continue;
    }
    const user = userById.get(userId);
    out.set(userId, {
      name: user?.email?.split("@")[0] ?? "Instrutor",
      specialty: null,
      licenseNumber: null,
    });
  }

  return out;
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
