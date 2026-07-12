import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { EIGHT_SSO_ROLES, VITAL8_SSO_ROLES } from "@/lib/sso/sso-config";
import { resolveProviderVerified } from "@/lib/sso/sso-userinfo";

export type EightSsoStatus = "ready" | "unverified" | "unapproved" | "locked";
export type Vital8SsoStatus = "ready" | "unverified" | "inactive_entity" | "no_membership" | "locked";

export type AdminEightUserRow = {
  userId: string;
  email: string;
  role: string;
  name: string | null;
  specialty: string | null;
  emailVerified: boolean;
  profileVerified: boolean;
  locked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  ssoStatus: EightSsoStatus;
};

export type AdminVital8UserRow = {
  userId: string;
  email: string;
  role: string;
  name: string | null;
  orgType: string | null;
  orgCnpj: string | null;
  orgName: string | null;
  orgRazaoSocial: string | null;
  memberRole: string | null;
  entityStatus: string | null;
  emailVerified: boolean;
  ssoVerified: boolean;
  locked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  ssoStatus: Vital8SsoStatus;
  adminHref: string | null;
};

export type AdminSsoClientStats = {
  total: number;
  unverified: number;
  blocked: number;
  ready: number;
  ssoLogins24h: number;
  ssoLogins7d: number;
};

export type AdminSsoRecentLogin = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  createdAt: string;
};

function tryDecrypt(value: string): string {
  try {
    return decrypt(value);
  } catch {
    return value;
  }
}

function isLocked(lockedUntil: Date | null): boolean {
  return !!lockedUntil && lockedUntil > new Date();
}

function isEmailVerified(emailVerified: Date | null, phoneVerified: Date | null): boolean {
  return emailVerified != null || phoneVerified != null;
}

export function isSsoClientConfigured(clientId: "eight" | "vital8"): boolean {
  if (clientId === "eight") {
    return !!process.env.SSO_EIGHT_CLIENT_SECRET?.trim();
  }
  return !!process.env.SSO_VITAL8_CLIENT_SECRET?.trim();
}

function resolveEightSsoStatus(input: {
  role: string;
  emailVerified: Date | null;
  phoneVerified: Date | null;
  lockedUntil: Date | null;
  profileVerified: boolean;
}): EightSsoStatus {
  if (isLocked(input.lockedUntil)) return "locked";
  if (!isEmailVerified(input.emailVerified, input.phoneVerified)) return "unverified";
  if (input.role !== "ADMIN" && !input.profileVerified) return "unapproved";
  return "ready";
}

function resolveVital8SsoStatus(input: {
  emailVerified: Date | null;
  phoneVerified: Date | null;
  lockedUntil: Date | null;
  hasMembership: boolean;
  entityStatus: string | null;
  ssoVerified: boolean;
}): Vital8SsoStatus {
  if (isLocked(input.lockedUntil)) return "locked";
  if (!isEmailVerified(input.emailVerified, input.phoneVerified)) return "unverified";
  if (!input.hasMembership) return "no_membership";
  if (!input.ssoVerified) return "inactive_entity";
  return "ready";
}

function vital8AdminHref(role: string): string | null {
  switch (role) {
    case "ORGANIZATION":
      return "/admin/clinicas";
    case "EMPLOYER":
      return "/admin/empresas";
    case "PHARMACY_STORE":
      return "/admin/farmacias";
    case "LABORATORY":
      return "/admin/laboratorios";
    default:
      return null;
  }
}

function statusRankEight(status: EightSsoStatus): number {
  const order: Record<EightSsoStatus, number> = {
    locked: 0,
    unverified: 1,
    unapproved: 2,
    ready: 3,
  };
  return order[status];
}

function statusRankVital8(status: Vital8SsoStatus): number {
  const order: Record<Vital8SsoStatus, number> = {
    locked: 0,
    unverified: 1,
    no_membership: 2,
    inactive_entity: 3,
    ready: 4,
  };
  return order[status];
}

async function getRecentSsoLogins(clientId: "eight" | "vital8", limit = 20): Promise<AdminSsoRecentLogin[]> {
  const rows = await db.auditLog.findMany({
    where: {
      action: "LOGIN",
      resource: `SSO:${clientId}`,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { email: true, role: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userEmail: r.user?.email ?? null,
    userRole: r.user?.role ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

async function countSsoLoginsSince(clientId: "eight" | "vital8", since: Date): Promise<number> {
  return db.auditLog.count({
    where: {
      action: "LOGIN",
      resource: `SSO:${clientId}`,
      createdAt: { gte: since },
    },
  });
}

export async function getAdminEightUsers(filters?: {
  q?: string;
  role?: string;
  ssoStatus?: EightSsoStatus;
  page?: number;
  take?: number;
}): Promise<{ users: AdminEightUserRow[]; total: number }> {
  const page = Math.max(1, filters?.page ?? 1);
  const take = Math.min(100, Math.max(1, filters?.take ?? 50));
  const q = filters?.q?.trim().toLowerCase() ?? "";
  const roleFilter = filters?.role?.trim() ?? "";
  const ssoStatusFilter = filters?.ssoStatus;

  const roles = roleFilter && EIGHT_SSO_ROLES.has(roleFilter)
    ? [roleFilter as UserRole]
    : ([...EIGHT_SSO_ROLES] as UserRole[]);

  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      role: { in: roles },
      ...(q ? { email: { contains: q, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      email: true,
      role: true,
      emailVerified: true,
      phoneVerified: true,
      lockedUntil: true,
      lastLoginAt: true,
      createdAt: true,
      professionalProfile: {
        select: { firstName: true, lastName: true, specialty: true, verified: true },
      },
      psychoanalystProfile: {
        select: { firstName: true, lastName: true, verified: true },
      },
      integrativeTherapistProfile: {
        select: { firstName: true, lastName: true, verified: true },
      },
    },
  });

  const rows: AdminEightUserRow[] = users.map((user) => {
    const profile =
      user.professionalProfile ??
      user.psychoanalystProfile ??
      user.integrativeTherapistProfile;

    const name = profile
      ? `${tryDecrypt(profile.firstName)} ${tryDecrypt(profile.lastName)}`.trim()
      : null;

    const specialty =
      user.professionalProfile?.specialty
        ? tryDecrypt(user.professionalProfile.specialty)
        : null;

    const profileVerified = resolveProviderVerified(user.role, {
      professionalProfile: user.professionalProfile,
      psychoanalystProfile: user.psychoanalystProfile,
      integrativeTherapistProfile: user.integrativeTherapistProfile,
    });

    const ssoStatus = resolveEightSsoStatus({
      role: user.role,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      lockedUntil: user.lockedUntil,
      profileVerified: user.role === "ADMIN" ? true : profileVerified,
    });

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: name || null,
      specialty,
      emailVerified: isEmailVerified(user.emailVerified, user.phoneVerified),
      profileVerified: user.role === "ADMIN" ? true : profileVerified,
      locked: isLocked(user.lockedUntil),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      ssoStatus,
    };
  });

  const filtered = ssoStatusFilter
    ? rows.filter((r) => r.ssoStatus === ssoStatusFilter)
    : rows;

  filtered.sort((a, b) => {
    const statusDiff = statusRankEight(a.ssoStatus) - statusRankEight(b.ssoStatus);
    if (statusDiff !== 0) return statusDiff;
    const aLogin = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
    const bLogin = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
    return bLogin - aLogin;
  });

  const total = filtered.length;
  const start = (page - 1) * take;
  return { users: filtered.slice(start, start + take), total };
}

async function resolveVital8Row(user: {
  id: string;
  email: string;
  role: string;
  emailVerified: Date | null;
  phoneVerified: Date | null;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}): Promise<AdminVital8UserRow> {
  let orgType: string | null = null;
  let orgCnpj: string | null = null;
  let orgName: string | null = null;
  let orgRazaoSocial: string | null = null;
  let memberRole: string | null = null;
  let entityStatus: string | null = null;
  let name: string | null = null;
  let hasMembership = false;
  let ssoVerified = false;

  switch (user.role) {
    case "ORGANIZATION": {
      const member = await db.organizationMember.findFirst({
        where: { userId: user.id, status: "ACTIVE" },
        orderBy: { joinedAt: "asc" },
        include: { organization: true },
      });
      if (member) {
        hasMembership = true;
        orgType = "CLINIC";
        orgCnpj = member.organization.cnpj.replace(/\D/g, "");
        orgName = member.organization.nomeFantasia;
        orgRazaoSocial = member.organization.razaoSocial;
        memberRole = member.role;
        entityStatus = "ACTIVE";
        ssoVerified = true;
        name = `${member.organization.responsibleFirstName} ${member.organization.responsibleLastName}`.trim()
          || member.organization.nomeFantasia;
      }
      break;
    }
    case "EMPLOYER": {
      const member = await db.employerMember.findFirst({
        where: { userId: user.id, status: "ACTIVE" },
        orderBy: { joinedAt: "asc" },
        include: { employerCompany: true },
      });
      if (member) {
        hasMembership = true;
        orgType = "EMPLOYER";
        orgCnpj = member.employerCompany.cnpj.replace(/\D/g, "");
        orgName = member.employerCompany.nomeFantasia;
        orgRazaoSocial = member.employerCompany.razaoSocial;
        memberRole = member.role;
        entityStatus = "ACTIVE";
        ssoVerified = true;
        name = `${member.employerCompany.responsibleFirstName} ${member.employerCompany.responsibleLastName}`.trim()
          || member.employerCompany.nomeFantasia;
      }
      break;
    }
    case "PHARMACY_STORE": {
      const member = await db.pharmacyStoreMember.findFirst({
        where: { userId: user.id, status: "ACTIVE" },
        orderBy: { joinedAt: "asc" },
        include: { pharmacyStore: true },
      });
      if (member) {
        hasMembership = true;
        orgType = "PHARMACY";
        orgCnpj = member.pharmacyStore.cnpj.replace(/\D/g, "");
        orgName = member.pharmacyStore.nomeFantasia;
        orgRazaoSocial = member.pharmacyStore.razaoSocial;
        memberRole = member.role;
        entityStatus = member.pharmacyStore.status;
        ssoVerified = member.pharmacyStore.status === "ACTIVE";
        name = `${member.pharmacyStore.responsibleFirstName} ${member.pharmacyStore.responsibleLastName}`.trim()
          || member.pharmacyStore.nomeFantasia;
      }
      break;
    }
    case "LABORATORY": {
      const member = await db.laboratoryMember.findFirst({
        where: { userId: user.id, status: "ACTIVE" },
        orderBy: { joinedAt: "asc" },
        include: { laboratory: true },
      });
      if (member) {
        hasMembership = true;
        orgType = "LABORATORY";
        orgCnpj = member.laboratory.cnpj.replace(/\D/g, "");
        orgName = member.laboratory.nomeFantasia;
        orgRazaoSocial = member.laboratory.razaoSocial;
        memberRole = member.role;
        entityStatus = member.laboratory.status;
        ssoVerified = member.laboratory.status === "ACTIVE";
        name = `${member.laboratory.responsibleFirstName} ${member.laboratory.responsibleLastName}`.trim()
          || member.laboratory.nomeFantasia;
      }
      break;
    }
  }

  const ssoStatus = resolveVital8SsoStatus({
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    lockedUntil: user.lockedUntil,
    hasMembership,
    entityStatus,
    ssoVerified,
  });

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    name,
    orgType,
    orgCnpj,
    orgName,
    orgRazaoSocial,
    memberRole,
    entityStatus,
    emailVerified: isEmailVerified(user.emailVerified, user.phoneVerified),
    ssoVerified,
    locked: isLocked(user.lockedUntil),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    ssoStatus,
    adminHref: vital8AdminHref(user.role),
  };
}

export async function getAdminVital8Users(filters?: {
  q?: string;
  role?: string;
  orgType?: string;
  ssoStatus?: Vital8SsoStatus;
  page?: number;
  take?: number;
}): Promise<{ users: AdminVital8UserRow[]; total: number }> {
  const page = Math.max(1, filters?.page ?? 1);
  const take = Math.min(100, Math.max(1, filters?.take ?? 50));
  const q = filters?.q?.trim().toLowerCase() ?? "";
  const roleFilter = filters?.role?.trim() ?? "";
  const orgTypeFilter = filters?.orgType?.trim().toUpperCase() ?? "";
  const ssoStatusFilter = filters?.ssoStatus;

  const roles = roleFilter && VITAL8_SSO_ROLES.has(roleFilter)
    ? [roleFilter as UserRole]
    : ([...VITAL8_SSO_ROLES] as UserRole[]);

  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      role: { in: roles },
      ...(q ? { email: { contains: q, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      email: true,
      role: true,
      emailVerified: true,
      phoneVerified: true,
      lockedUntil: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  const rows = await Promise.all(users.map((user) => resolveVital8Row(user)));

  let filtered = rows;
  if (orgTypeFilter) {
    filtered = filtered.filter((r) => r.orgType === orgTypeFilter);
  }
  if (ssoStatusFilter) {
    filtered = filtered.filter((r) => r.ssoStatus === ssoStatusFilter);
  }

  filtered.sort((a, b) => {
    const statusDiff = statusRankVital8(a.ssoStatus) - statusRankVital8(b.ssoStatus);
    if (statusDiff !== 0) return statusDiff;
    const aLogin = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
    const bLogin = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
    return bLogin - aLogin;
  });

  const total = filtered.length;
  const start = (page - 1) * take;
  return { users: filtered.slice(start, start + take), total };
}

function buildEightStats(rows: AdminEightUserRow[]): Omit<AdminSsoClientStats, "ssoLogins24h" | "ssoLogins7d"> {
  return {
    total: rows.length,
    unverified: rows.filter((r) => r.ssoStatus === "unverified").length,
    blocked: rows.filter((r) => r.ssoStatus === "locked" || r.ssoStatus === "unapproved").length,
    ready: rows.filter((r) => r.ssoStatus === "ready").length,
  };
}

function buildVital8Stats(rows: AdminVital8UserRow[]): Omit<AdminSsoClientStats, "ssoLogins24h" | "ssoLogins7d"> {
  return {
    total: rows.length,
    unverified: rows.filter((r) => r.ssoStatus === "unverified").length,
    blocked: rows.filter((r) =>
      r.ssoStatus === "locked"
      || r.ssoStatus === "inactive_entity"
      || r.ssoStatus === "no_membership"
    ).length,
    ready: rows.filter((r) => r.ssoStatus === "ready").length,
  };
}

export async function getAdminEightSsoPayload(filters?: {
  q?: string;
  role?: string;
  ssoStatus?: EightSsoStatus;
  page?: number;
  take?: number;
}) {
  const { users, total } = await getAdminEightUsers({ ...filters, page: 1, take: 10000 });
  const statsBase = buildEightStats(users);
  const now = Date.now();
  const [ssoLogins24h, ssoLogins7d, recentSsoLogins] = await Promise.all([
    countSsoLoginsSince("eight", new Date(now - 24 * 60 * 60 * 1000)),
    countSsoLoginsSince("eight", new Date(now - 7 * 24 * 60 * 60 * 1000)),
    getRecentSsoLogins("eight"),
  ]);

  const paged = await getAdminEightUsers(filters);

  return {
    users: paged.users,
    total: paged.total,
    stats: { ...statsBase, ssoLogins24h, ssoLogins7d },
    configured: isSsoClientConfigured("eight"),
    recentSsoLogins,
    page: filters?.page ?? 1,
    totalAll: total,
  };
}

export async function getAdminVital8SsoPayload(filters?: {
  q?: string;
  role?: string;
  orgType?: string;
  ssoStatus?: Vital8SsoStatus;
  page?: number;
  take?: number;
}) {
  const { users, total } = await getAdminVital8Users({ ...filters, page: 1, take: 10000 });
  const statsBase = buildVital8Stats(users);
  const now = Date.now();
  const [ssoLogins24h, ssoLogins7d, recentSsoLogins] = await Promise.all([
    countSsoLoginsSince("vital8", new Date(now - 24 * 60 * 60 * 1000)),
    countSsoLoginsSince("vital8", new Date(now - 7 * 24 * 60 * 60 * 1000)),
    getRecentSsoLogins("vital8"),
  ]);

  const paged = await getAdminVital8Users(filters);

  return {
    users: paged.users,
    total: paged.total,
    stats: { ...statsBase, ssoLogins24h, ssoLogins7d },
    configured: isSsoClientConfigured("vital8"),
    recentSsoLogins,
    page: filters?.page ?? 1,
    totalAll: total,
  };
}

export async function getAdminSsoOverviewCounts(): Promise<{
  eightSsoBlocked: number;
  vital8SsoBlocked: number;
}> {
  const [eightUsers, vital8Users] = await Promise.all([
    getAdminEightUsers({ take: 10000 }),
    getAdminVital8Users({ take: 10000 }),
  ]);

  return {
    eightSsoBlocked: eightUsers.users.filter((u) => u.ssoStatus !== "ready").length,
    vital8SsoBlocked: vital8Users.users.filter((u) => u.ssoStatus !== "ready").length,
  };
}
