import type { AcuraVolunteerStatus, AngelApprovalStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import { decryptIntegrativeNameFields } from "@/lib/integrative-therapist-api";
import {
  acuraVolunteerWriteData,
  type AcuraVolunteerKind,
} from "@/lib/acura-volunteer";
import { resolveAdminTabForProfessional } from "@/lib/admin-provider-categories";
import { PSYCHOANALYSIS_SPECIALTY } from "@/lib/professions";
import { INTEGRATIVE_THERAPY_SPECIALTY } from "@/lib/integrative-therapy-specialty";
import {
  approveAngelVolunteer,
  rejectAngelVolunteer,
} from "@/lib/humanitarian/angel-admin-approval";
import type {
  AcuraCategoryCounts,
  AcuraVolunteerAdminList,
  AcuraVolunteerAdminRow,
} from "@/lib/acura-volunteer-admin-types";

export type {
  AcuraCategoryCounts,
  AcuraVolunteerAdminList,
  AcuraVolunteerAdminRow,
} from "@/lib/acura-volunteer-admin-types";
export { ACURA_CATEGORY_ORDER } from "@/lib/acura-volunteer-admin-types";

function emptyCategoryCounts(): AcuraCategoryCounts {
  return {
    medicos: 0,
    odontologistas: 0,
    psicologos: 0,
    nutricionistas: 0,
    fisioterapeutas: 0,
    enfermeiros: 0,
    farmaceuticos: 0,
    psicanalistas: 0,
    terapeutas: 0,
    anjos: 0,
  };
}

const PANEL_STATUSES: AcuraVolunteerStatus[] = ["PENDING", "ACTIVE", "REVOKED"];

/** Map AngelApprovalStatus → AcuraVolunteerStatus for the shared admin panel. */
export function angelApprovalToAcuraStatus(status: AngelApprovalStatus): AcuraVolunteerStatus {
  if (status === "APPROVED") return "ACTIVE";
  if (status === "REJECTED") return "REVOKED";
  return "PENDING";
}

function acuraStatusToAngelApproval(status: AcuraVolunteerStatus | { in: AcuraVolunteerStatus[] }): AngelApprovalStatus | { in: AngelApprovalStatus[] } {
  if (typeof status === "object" && "in" in status) {
    const mapped = status.in.map((s) => {
      if (s === "ACTIVE") return "APPROVED" as const;
      if (s === "REVOKED") return "REJECTED" as const;
      return "PENDING" as const;
    });
    return { in: mapped };
  }
  if (status === "ACTIVE") return "APPROVED";
  if (status === "REVOKED") return "REJECTED";
  if (status === "PENDING") return "PENDING";
  // NONE has no angel equivalent — empty match
  return "PENDING";
}

type UserSelect = {
  email: string;
  emailVerified: Date | null;
  _count: { providerLicenseDocuments: number };
};

function mapUserFields(user: UserSelect): Pick<AcuraVolunteerAdminRow, "email" | "emailVerified" | "licenseDocCount"> {
  return {
    email: user.email,
    emailVerified: !!user.emailVerified,
    licenseDocCount: user._count.providerLicenseDocuments,
  };
}

function mapProfessional(p: {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  specialty: string;
  licenseNumber?: string | null;
  verified: boolean;
  acuraVolunteer: boolean;
  acuraVolunteerStatus: AcuraVolunteerStatus;
  acuraVolunteerApprovedAt: Date | null;
  createdAt: Date;
  user: UserSelect;
}): AcuraVolunteerAdminRow {
  return {
    id: p.id,
    userId: p.userId,
    kind: "professional",
    category: resolveAdminTabForProfessional(p.specialty, p.licenseNumber ?? undefined),
    name: `${p.firstName} ${p.lastName}`.trim(),
    specialty: p.specialty || null,
    verified: p.verified,
    ...mapUserFields(p.user),
    status: p.acuraVolunteerStatus,
    acuraVolunteer: p.acuraVolunteer,
    approvedAt: p.acuraVolunteerApprovedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

function mapPsychoanalyst(p: {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  verified: boolean;
  acuraVolunteer: boolean;
  acuraVolunteerStatus: AcuraVolunteerStatus;
  acuraVolunteerApprovedAt: Date | null;
  createdAt: Date;
  user: UserSelect;
}): AcuraVolunteerAdminRow {
  const first = safeDecrypt(p.firstName);
  const last = safeDecrypt(p.lastName);
  return {
    id: p.id,
    userId: p.userId,
    kind: "psychoanalyst",
    category: "psicanalistas",
    name: `${first} ${last}`.trim(),
    specialty: PSYCHOANALYSIS_SPECIALTY,
    verified: p.verified,
    ...mapUserFields(p.user),
    status: p.acuraVolunteerStatus,
    acuraVolunteer: p.acuraVolunteer,
    approvedAt: p.acuraVolunteerApprovedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

function mapIntegrative(p: {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  verified: boolean;
  acuraVolunteer: boolean;
  acuraVolunteerStatus: AcuraVolunteerStatus;
  acuraVolunteerApprovedAt: Date | null;
  createdAt: Date;
  user: UserSelect;
}): AcuraVolunteerAdminRow {
  const d = decryptIntegrativeNameFields(p);
  return {
    id: p.id,
    userId: p.userId,
    kind: "integrative",
    category: "terapeutas",
    name: `${d.firstName} ${d.lastName}`.trim(),
    specialty: INTEGRATIVE_THERAPY_SPECIALTY,
    verified: p.verified,
    ...mapUserFields(p.user),
    status: p.acuraVolunteerStatus,
    acuraVolunteer: p.acuraVolunteer,
    approvedAt: p.acuraVolunteerApprovedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

function mapAngel(p: {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  profession: string | null;
  approvalStatus: AngelApprovalStatus;
  approvedAt: Date | null;
  createdAt: Date;
  user: UserSelect;
}): AcuraVolunteerAdminRow {
  const status = angelApprovalToAcuraStatus(p.approvalStatus);
  const active = status === "ACTIVE";
  return {
    id: p.id,
    userId: p.userId,
    kind: "angel",
    category: "anjos",
    name: `${p.firstName} ${p.lastName}`.trim(),
    specialty: p.profession || null,
    verified: active,
    ...mapUserFields(p.user),
    status,
    acuraVolunteer: active,
    approvedAt: p.approvedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

async function countActiveByCategory(): Promise<AcuraCategoryCounts> {
  const counts = emptyCategoryCounts();
  const [professionals, psychoanalysts, integrative, angels] = await Promise.all([
    db.professionalProfile.findMany({
      where: { acuraVolunteerStatus: "ACTIVE" },
      select: { specialty: true, licenseNumber: true },
    }),
    db.psychoanalystProfile.count({ where: { acuraVolunteerStatus: "ACTIVE" } }),
    db.integrativeTherapistProfile.count({ where: { acuraVolunteerStatus: "ACTIVE" } }),
    db.angelProfile.count({ where: { approvalStatus: "APPROVED" } }),
  ]);
  for (const p of professionals) {
    const tab = resolveAdminTabForProfessional(p.specialty, p.licenseNumber);
    counts[tab] += 1;
  }
  counts.psicanalistas += psychoanalysts;
  counts.terapeutas += integrative;
  counts.anjos += angels;
  return counts;
}

const selectFields = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  verified: true,
  acuraVolunteer: true,
  acuraVolunteerStatus: true,
  acuraVolunteerApprovedAt: true,
  createdAt: true,
  user: {
    select: {
      email: true,
      emailVerified: true,
      _count: { select: { providerLicenseDocuments: true } },
    },
  },
} as const;

const angelSelectFields = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  profession: true,
  approvalStatus: true,
  approvedAt: true,
  createdAt: true,
  user: {
    select: {
      email: true,
      emailVerified: true,
      _count: { select: { providerLicenseDocuments: true } },
    },
  },
} as const;

export async function listAcuraVolunteersAdmin(opts?: {
  status?: AcuraVolunteerStatus | "all";
  q?: string;
  limit?: number;
}): Promise<AcuraVolunteerAdminList> {
  const limit = opts?.limit ?? 200;
  const statusFilter =
    opts?.status && opts.status !== "all"
      ? opts.status
      : { in: PANEL_STATUSES };

  const whereBase = { acuraVolunteerStatus: statusFilter };
  // Angels have no NONE status; skip them when filtering for NONE only.
  const includeAngels = opts?.status !== "NONE";
  const angelWhere = includeAngels
    ? { approvalStatus: acuraStatusToAngelApproval(statusFilter) }
    : null;

  const [
    pendingProf,
    pendingPa,
    pendingIt,
    pendingAngel,
    activeProf,
    activePa,
    activeIt,
    activeAngel,
    activeVerifiedProf,
    activeVerifiedPa,
    activeVerifiedIt,
    revokedProf,
    revokedPa,
    revokedIt,
    revokedAngel,
    professionals,
    psychoanalysts,
    integrative,
    angels,
    byCategory,
  ] = await Promise.all([
    db.professionalProfile.count({ where: { acuraVolunteerStatus: "PENDING" } }),
    db.psychoanalystProfile.count({ where: { acuraVolunteerStatus: "PENDING" } }),
    db.integrativeTherapistProfile.count({ where: { acuraVolunteerStatus: "PENDING" } }),
    db.angelProfile.count({ where: { approvalStatus: "PENDING" } }),
    db.professionalProfile.count({ where: { acuraVolunteerStatus: "ACTIVE" } }),
    db.psychoanalystProfile.count({ where: { acuraVolunteerStatus: "ACTIVE" } }),
    db.integrativeTherapistProfile.count({ where: { acuraVolunteerStatus: "ACTIVE" } }),
    db.angelProfile.count({ where: { approvalStatus: "APPROVED" } }),
    db.professionalProfile.count({ where: { acuraVolunteerStatus: "ACTIVE", verified: true } }),
    db.psychoanalystProfile.count({ where: { acuraVolunteerStatus: "ACTIVE", verified: true } }),
    db.integrativeTherapistProfile.count({ where: { acuraVolunteerStatus: "ACTIVE", verified: true } }),
    db.professionalProfile.count({ where: { acuraVolunteerStatus: "REVOKED" } }),
    db.psychoanalystProfile.count({ where: { acuraVolunteerStatus: "REVOKED" } }),
    db.integrativeTherapistProfile.count({ where: { acuraVolunteerStatus: "REVOKED" } }),
    db.angelProfile.count({ where: { approvalStatus: "REJECTED" } }),
    db.professionalProfile.findMany({
      where: whereBase,
      select: { ...selectFields, specialty: true, licenseNumber: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    db.psychoanalystProfile.findMany({
      where: whereBase,
      select: selectFields,
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    db.integrativeTherapistProfile.findMany({
      where: whereBase,
      select: selectFields,
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    angelWhere
      ? db.angelProfile.findMany({
          where: angelWhere,
          select: angelSelectFields,
          orderBy: { updatedAt: "desc" },
          take: limit,
        })
      : Promise.resolve([]),
    countActiveByCategory(),
  ]);

  let rows: AcuraVolunteerAdminRow[] = [
    ...professionals.map(mapProfessional),
    ...psychoanalysts.map(mapPsychoanalyst),
    ...integrative.map(mapIntegrative),
    ...angels.map(mapAngel),
  ];

  const q = opts?.q?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.email?.toLowerCase().includes(q) ?? false) ||
        (r.specialty?.toLowerCase().includes(q) ?? false),
    );
  }

  rows.sort((a, b) => {
    const order: Record<string, number> = { PENDING: 0, ACTIVE: 1, REVOKED: 2, NONE: 3 };
    const d = (order[a.status] ?? 9) - (order[b.status] ?? 9);
    if (d !== 0) return d;
    return a.name.localeCompare(b.name);
  });

  return {
    totals: {
      pending: pendingProf + pendingPa + pendingIt + pendingAngel,
      active: activeProf + activePa + activeIt + activeAngel,
      // Angels count as "active verified" once approved (no separate listing seal).
      activeVerified: activeVerifiedProf + activeVerifiedPa + activeVerifiedIt + activeAngel,
      revoked: revokedProf + revokedPa + revokedIt + revokedAngel,
      byCategory,
    },
    rows: rows.slice(0, limit),
  };
}

/** Search providers not yet ACTIVE (for admin "include" flow). */
export async function searchProvidersForAcuraInclude(q: string, limit = 20): Promise<AcuraVolunteerAdminRow[]> {
  const term = q.trim();
  if (term.length < 2) return [];

  const [professionals, psychoanalysts, integrative] = await Promise.all([
    db.professionalProfile.findMany({
      where: {
        acuraVolunteerStatus: { not: "ACTIVE" },
        OR: [
          { firstName: { contains: term, mode: "insensitive" } },
          { lastName: { contains: term, mode: "insensitive" } },
          { user: { email: { contains: term, mode: "insensitive" } } },
        ],
      },
      select: { ...selectFields, specialty: true, licenseNumber: true },
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),
    db.psychoanalystProfile.findMany({
      where: {
        acuraVolunteerStatus: { not: "ACTIVE" },
        user: { email: { contains: term, mode: "insensitive" } },
      },
      select: selectFields,
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),
    db.integrativeTherapistProfile.findMany({
      where: {
        acuraVolunteerStatus: { not: "ACTIVE" },
        user: { email: { contains: term, mode: "insensitive" } },
      },
      select: selectFields,
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return [
    ...professionals.map(mapProfessional),
    ...psychoanalysts.map(mapPsychoanalyst),
    ...integrative.map(mapIntegrative),
  ].slice(0, limit);
}

export type AcuraVolunteerAction = "approve" | "reject" | "include" | "revoke";

export class AcuraVolunteerActionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AcuraVolunteerActionError";
    this.status = status;
  }
}

export async function setAcuraVolunteerStatus(opts: {
  kind: AcuraVolunteerKind;
  id: string;
  action: AcuraVolunteerAction;
  adminUserId: string;
}): Promise<AcuraVolunteerAdminRow | null> {
  if (opts.kind === "angel") {
    if (opts.action === "approve" || opts.action === "include") {
      const result = await approveAngelVolunteer({
        profileId: opts.id,
        adminUserId: opts.adminUserId,
      });
      if (!result.ok) {
        throw new AcuraVolunteerActionError(result.error, result.status);
      }
    } else {
      const result = await rejectAngelVolunteer({ profileId: opts.id });
      if (!result.ok) {
        throw new AcuraVolunteerActionError(result.error, result.status);
      }
    }
    const updated = await db.angelProfile.findUnique({
      where: { id: opts.id },
      select: angelSelectFields,
    });
    return updated ? mapAngel(updated) : null;
  }

  const nextStatus: AcuraVolunteerStatus =
    opts.action === "approve" || opts.action === "include"
      ? "ACTIVE"
      : opts.action === "reject"
        ? "NONE"
        : "REVOKED";

  const data = acuraVolunteerWriteData(nextStatus, { adminUserId: opts.adminUserId });

  if (opts.kind === "professional") {
    const updated = await db.professionalProfile.update({
      where: { id: opts.id },
      data,
      select: { ...selectFields, specialty: true, licenseNumber: true },
    });
    return mapProfessional(updated);
  }
  if (opts.kind === "psychoanalyst") {
    const updated = await db.psychoanalystProfile.update({
      where: { id: opts.id },
      data,
      select: selectFields,
    });
    return mapPsychoanalyst(updated);
  }
  const updated = await db.integrativeTherapistProfile.update({
    where: { id: opts.id },
    data,
    select: selectFields,
  });
  return mapIntegrative(updated);
}
