// Organization provider scope ? doctors, psychoanalysts, integrative therapists.

import { db } from "@/lib/db";
import type { ProviderType } from "@prisma/client";

export type OrgProviderScopeIds = {
  professionalIds: string[];
  psychoanalystIds: string[];
  integrativeTherapistIds: string[];
};

export type OrgProviderListItem = {
  scopeKey: string;
  providerType: ProviderType;
  providerProfileId: string;
  name: string;
  specialty: string;
  status: string;
  repassePercent: number;
  joinedAt: string;
};

const SCOPE_SEP = ":";

export function buildProviderScopeKey(
  providerType: ProviderType,
  providerProfileId: string,
): string {
  return `${providerType}${SCOPE_SEP}${providerProfileId}`;
}

export function parseProviderScopeKey(
  scopeKey: string | undefined | null,
): { providerType: ProviderType; providerProfileId: string } | null {
  if (!scopeKey?.trim()) return null;
  const idx = scopeKey.indexOf(SCOPE_SEP);
  if (idx <= 0) return null;
  const providerType = scopeKey.slice(0, idx) as ProviderType;
  const providerProfileId = scopeKey.slice(idx + 1);
  if (!providerProfileId) return null;
  return { providerType, providerProfileId };
}

export function resolveProviderScopeFilter(
  all: OrgProviderScopeIds,
  scopeKey: string | undefined,
): OrgProviderScopeIds {
  const parsed = parseProviderScopeKey(scopeKey);
  if (!parsed) return all;

  if (parsed.providerType === "HEALTH") {
    return all.professionalIds.includes(parsed.providerProfileId)
      ? {
          professionalIds: [parsed.providerProfileId],
          psychoanalystIds: [],
          integrativeTherapistIds: [],
        }
      : all;
  }
  if (parsed.providerType === "PSYCHOANALYST") {
    return all.psychoanalystIds.includes(parsed.providerProfileId)
      ? {
          professionalIds: [],
          psychoanalystIds: [parsed.providerProfileId],
          integrativeTherapistIds: [],
        }
      : all;
  }
  if (parsed.providerType === "INTEGRATIVE_THERAPIST") {
    return all.integrativeTherapistIds.includes(parsed.providerProfileId)
      ? {
          professionalIds: [],
          psychoanalystIds: [],
          integrativeTherapistIds: [parsed.providerProfileId],
        }
      : all;
  }
  return all;
}

export function scopeHasProviders(scope: OrgProviderScopeIds): boolean {
  return (
    scope.professionalIds.length > 0 ||
    scope.psychoanalystIds.length > 0 ||
    scope.integrativeTherapistIds.length > 0
  );
}

export async function getOrganizationProviderScopeIds(
  organizationId: string,
): Promise<OrgProviderScopeIds> {
  const [healthLinks, linkedProviders] = await Promise.all([
    db.organizationProfessional.findMany({
      where: { organizationId, status: "ACTIVE" },
      select: { professionalId: true },
    }),
    db.organizationLinkedProvider.findMany({
      where: { organizationId, status: "ACTIVE" },
      select: { providerType: true, providerProfileId: true },
    }),
  ]);

  return {
    professionalIds: healthLinks.map((l) => l.professionalId),
    psychoanalystIds: linkedProviders
      .filter((l) => l.providerType === "PSYCHOANALYST")
      .map((l) => l.providerProfileId),
    integrativeTherapistIds: linkedProviders
      .filter((l) => l.providerType === "INTEGRATIVE_THERAPIST")
      .map((l) => l.providerProfileId),
  };
}

export async function listOrganizationProviders(
  organizationId: string,
): Promise<OrgProviderListItem[]> {
  const [healthLinks, linkedProviders] = await Promise.all([
    db.organizationProfessional.findMany({
      where: { organizationId },
      include: {
        professional: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    }),
    db.organizationLinkedProvider.findMany({
      where: { organizationId },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  const items: OrgProviderListItem[] = healthLinks.map((l) => ({
    scopeKey: buildProviderScopeKey("HEALTH", l.professionalId),
    providerType: "HEALTH" as const,
    providerProfileId: l.professionalId,
    name: `Dr. ${l.professional.firstName} ${l.professional.lastName}`.trim(),
    specialty: l.professional.specialty ?? "",
    status: l.status,
    repassePercent: l.repassePercent,
    joinedAt: l.joinedAt.toISOString(),
  }));

  const psychoIds = linkedProviders
    .filter((l) => l.providerType === "PSYCHOANALYST")
    .map((l) => l.providerProfileId);
  const integrativeIds = linkedProviders
    .filter((l) => l.providerType === "INTEGRATIVE_THERAPIST")
    .map((l) => l.providerProfileId);

  const [psychoProfiles, integrativeProfiles] = await Promise.all([
    psychoIds.length
      ? db.psychoanalystProfile.findMany({
          where: { id: { in: psychoIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : Promise.resolve([]),
    integrativeIds.length
      ? db.integrativeTherapistProfile.findMany({
          where: { id: { in: integrativeIds } },
          select: { id: true, firstName: true, lastName: true, picsPractices: true },
        })
      : Promise.resolve([]),
  ]);

  const psychoById = new Map(psychoProfiles.map((p) => [p.id, p]));
  const integrativeById = new Map(integrativeProfiles.map((p) => [p.id, p]));

  for (const l of linkedProviders) {
    if (l.providerType === "PSYCHOANALYST") {
      const p = psychoById.get(l.providerProfileId);
      if (!p) continue;
      items.push({
        scopeKey: buildProviderScopeKey("PSYCHOANALYST", l.providerProfileId),
        providerType: "PSYCHOANALYST",
        providerProfileId: l.providerProfileId,
        name: `${p.firstName} ${p.lastName}`.trim(),
        specialty: "Psican?lise",
        status: l.status,
        repassePercent: l.repassePercent,
        joinedAt: l.joinedAt.toISOString(),
      });
    } else if (l.providerType === "INTEGRATIVE_THERAPIST") {
      const p = integrativeById.get(l.providerProfileId);
      if (!p) continue;
      items.push({
        scopeKey: buildProviderScopeKey("INTEGRATIVE_THERAPIST", l.providerProfileId),
        providerType: "INTEGRATIVE_THERAPIST",
        providerProfileId: l.providerProfileId,
        name: `${p.firstName} ${p.lastName}`.trim(),
        specialty: p.picsPractices[0] ?? "Terapia integrativa",
        status: l.status,
        repassePercent: l.repassePercent,
        joinedAt: l.joinedAt.toISOString(),
      });
    }
  }

  return items;
}

export async function linkProviderToOrganization(opts: {
  organizationId: string;
  providerType: "PSYCHOANALYST" | "INTEGRATIVE_THERAPIST";
  providerProfileId: string;
}): Promise<{ id: string } | "ALREADY_LINKED"> {
  const existing = await db.organizationLinkedProvider.findUnique({
    where: {
      organizationId_providerType_providerProfileId: {
        organizationId: opts.organizationId,
        providerType: opts.providerType,
        providerProfileId: opts.providerProfileId,
      },
    },
  });
  if (existing) return "ALREADY_LINKED";

  const link = await db.organizationLinkedProvider.create({
    data: {
      organizationId: opts.organizationId,
      providerType: opts.providerType,
      providerProfileId: opts.providerProfileId,
      status: "ACTIVE",
    },
  });
  return { id: link.id };
}

export async function findOrganizationByInviteCode(inviteCode: string) {
  return db.organization.findUnique({
    where: { inviteCode: inviteCode.trim() },
    select: { id: true, nomeFantasia: true },
  });
}
