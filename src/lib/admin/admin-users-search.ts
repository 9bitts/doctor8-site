import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

export type AdminUserSearchRow = {
  id: string;
  email: string;
  role: string;
  region: string | null;
  name: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  locked: boolean;
  lockedUntil: string | null;
  failedLoginAttempts: number;
  createdAt: string;
  profileHint: string | null;
};

function resolveDisplayName(user: {
  patientProfile: { firstName: string; lastName: string } | null;
  professionalProfile: { firstName: string; lastName: string; specialty: string } | null;
  psychoanalystProfile: { firstName: string; lastName: string } | null;
  integrativeTherapistProfile: { firstName: string; lastName: string } | null;
  angelProfile: { firstName: string; lastName: string; profession: string | null } | null;
  organizationMemberships: { organization: { nomeFantasia: string } }[];
  employerMemberships: { employerCompany: { nomeFantasia: string } }[];
}): { name: string | null; hint: string | null } {
  const tryDecrypt = (value: string) => {
    try {
      return decrypt(value);
    } catch {
      return value;
    }
  };

  if (user.patientProfile) {
    const name = `${tryDecrypt(user.patientProfile.firstName)} ${tryDecrypt(user.patientProfile.lastName)}`.trim();
    return { name, hint: "Paciente" };
  }
  if (user.professionalProfile) {
    const name = `${tryDecrypt(user.professionalProfile.firstName)} ${tryDecrypt(user.professionalProfile.lastName)}`.trim();
    return { name, hint: user.professionalProfile.specialty };
  }
  if (user.psychoanalystProfile) {
    const name = `${tryDecrypt(user.psychoanalystProfile.firstName)} ${tryDecrypt(user.psychoanalystProfile.lastName)}`.trim();
    return { name, hint: "Psicanalista" };
  }
  if (user.integrativeTherapistProfile) {
    const name = `${tryDecrypt(user.integrativeTherapistProfile.firstName)} ${tryDecrypt(user.integrativeTherapistProfile.lastName)}`.trim();
    return { name, hint: "Terapeuta integrativo" };
  }
  if (user.angelProfile) {
    const name = `${user.angelProfile.firstName} ${user.angelProfile.lastName}`.trim();
    return { name, hint: user.angelProfile.profession ?? "Anjo" };
  }
  if (user.organizationMemberships[0]) {
    return { name: user.organizationMemberships[0].organization.nomeFantasia, hint: "Organização" };
  }
  if (user.employerMemberships[0]) {
    return { name: user.employerMemberships[0].employerCompany.nomeFantasia, hint: "Empresa B2B" };
  }
  return { name: null, hint: null };
}

export async function searchAdminUsers(query: string, limit = 40): Promise<AdminUserSearchRow[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const roleMatch = Object.values(UserRole).find(
    (role) => role.toLowerCase().includes(q) || q.includes(role.toLowerCase()),
  );

  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        ...(roleMatch ? [{ role: roleMatch }] : []),
      ],
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      region: true,
      emailVerified: true,
      phoneVerified: true,
      lockedUntil: true,
      failedLoginAttempts: true,
      createdAt: true,
      patientProfile: { select: { firstName: true, lastName: true } },
      professionalProfile: { select: { firstName: true, lastName: true, specialty: true } },
      psychoanalystProfile: { select: { firstName: true, lastName: true } },
      integrativeTherapistProfile: { select: { firstName: true, lastName: true } },
      angelProfile: { select: { firstName: true, lastName: true, profession: true } },
      organizationMemberships: {
        take: 1,
        select: { organization: { select: { nomeFantasia: true } } },
      },
      employerMemberships: {
        take: 1,
        select: { employerCompany: { select: { nomeFantasia: true } } },
      },
    },
  });

  const now = Date.now();

  return users.map((user) => {
    const { name, hint } = resolveDisplayName(user);
    return {
      id: user.id,
      email: user.email ?? "",
      role: user.role,
      region: user.region,
      name,
      emailVerified: !!user.emailVerified,
      phoneVerified: !!user.phoneVerified,
      locked: !!user.lockedUntil && user.lockedUntil.getTime() > now,
      lockedUntil: user.lockedUntil?.toISOString() ?? null,
      failedLoginAttempts: user.failedLoginAttempts,
      createdAt: user.createdAt.toISOString(),
      profileHint: hint,
    };
  });
}

export type AdminOccupationalPhysicianRow = {
  userId: string;
  email: string;
  fullName: string | null;
  crm: string | null;
  emailVerified: boolean;
  locked: boolean;
  employerName: string | null;
  employerId: string | null;
  linkStatus: string;
  joinedAt: string | null;
  createdAt: string;
};

export async function listAdminOccupationalPhysicians(): Promise<AdminOccupationalPhysicianRow[]> {
  const now = Date.now();
  const links = await db.employerOccupationalPhysician.findMany({
    where: { userId: { not: null } },
    orderBy: { invitedAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          emailVerified: true,
          lockedUntil: true,
          createdAt: true,
        },
      },
      employerCompany: { select: { id: true, nomeFantasia: true } },
    },
  });

  return links
    .filter((link) => link.user)
    .map((link) => ({
      userId: link.user!.id,
      email: link.user!.email ?? link.email,
      fullName: link.fullName,
      crm: link.crm,
      emailVerified: !!link.user!.emailVerified,
      locked: !!link.user!.lockedUntil && link.user!.lockedUntil.getTime() > now,
      employerName: link.employerCompany.nomeFantasia,
      employerId: link.employerCompany.id,
      linkStatus: link.status,
      joinedAt: link.joinedAt?.toISOString() ?? null,
      createdAt: link.user!.createdAt.toISOString(),
    }));
}
