import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { translate, type Lang } from "@/lib/i18n/translations";
import { findPackById, packsForProfession } from "./platform-packs";
import { referencesForProfession } from "./reference-links";
import {
  mapResourceRow,
  resourceOwnerWhere,
  safeDecryptResource,
  type LibraryAuthContext,
} from "./auth";
import type { LibraryCollectionDto, LibraryShareStats } from "./types";

export async function getLibraryHub(ctx: LibraryAuthContext & { ok: true }, lang: Lang) {
  const owner = ctx.owner;
  const where = { ...resourceOwnerWhere(owner), active: true };

  const [resources, collections, shareAgg] = await Promise.all([
    db.resource.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        collection: { select: { title: true } },
        _count: { select: { shares: true, analysandShares: true, integrativeShares: true } },
        shares: { select: { viewCount: true } },
        analysandShares: { select: { viewCount: true } },
        integrativeShares: { select: { viewCount: true } },
      },
    }),
    db.resourceCollection.findMany({
      where: { ...resourceOwnerWhere(owner), active: true },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { resources: true } },
        resources: {
          where: { active: true },
          include: {
            _count: { select: { shares: true, analysandShares: true } },
            shares: { select: { viewCount: true } },
            analysandShares: { select: { viewCount: true } },
          },
        },
      },
    }),
    owner.kind === "psychoanalyst"
      ? db.analysandResourceShare.aggregate({
          where: { resource: where },
          _sum: { viewCount: true },
          _count: true,
        })
      : owner.kind === "integrative"
        ? db.integrativeResourceShare.aggregate({
            where: { resource: where },
            _sum: { viewCount: true },
            _count: true,
          })
        : db.resourceShare.aggregate({
            where: { resource: where },
            _sum: { viewCount: true },
            _count: true,
          }),
  ]);

  const importedPackIds = new Set(
    resources.filter((r) => r.sourcePackId).map((r) => r.sourcePackId as string),
  );

  const packs = packsForProfession(owner.professionKey).map((pack) => ({
    id: pack.id,
    title: translate(lang, pack.titleKey),
    description: translate(lang, pack.descKey),
    category: pack.category,
    itemCount: pack.items.length,
    imported: importedPackIds.has(pack.id),
    cidPrefixes: pack.cidPrefixes ?? [],
  }));

  const references = referencesForProfession(owner.professionKey).map((ref) => ({
    id: ref.id,
    title: translate(lang, ref.titleKey),
    description: translate(lang, ref.descKey),
    href: ref.href,
    external: !!ref.external,
    icon: ref.icon,
  }));

  const collectionDtos: LibraryCollectionDto[] = collections.map((c) => ({
    id: c.id,
    title: safeDecryptResource(c.title),
    description: safeDecryptResource(c.description) || null,
    category: c.category as LibraryCollectionDto["category"],
    resourceCount: c._count.resources,
    shareCount: c.resources.reduce(
      (sum, r) =>
        sum + (r._count.shares ?? r._count.analysandShares ?? r._count.integrativeShares ?? 0),
      0,
    ),
    createdAt: c.createdAt.toISOString(),
  }));

  const totalShares = resources.reduce(
    (sum, r) =>
      sum + (r._count.shares ?? r._count.analysandShares ?? r._count.integrativeShares ?? 0),
    0,
  );
  const totalViews = shareAgg._sum.viewCount ?? 0;
  const stats: LibraryShareStats = {
    totalShares,
    totalViews,
    openRate: totalShares > 0 ? Math.round((totalViews / totalShares) * 100) : 0,
  };

  return {
    professionKey: owner.professionKey,
    resources: resources.map(mapResourceRow),
    collections: collectionDtos,
    packs,
    references,
    stats,
    importedPackIds: [...importedPackIds],
  };
}

export async function importPlatformPack(
  ctx: LibraryAuthContext & { ok: true },
  packId: string,
  lang: Lang,
) {
  const pack = findPackById(packId);
  if (!pack || !pack.professionKeys.includes(ctx.owner.professionKey)) {
    return { error: "PACK_NOT_FOUND" as const };
  }

  const existing = await db.resource.findFirst({
    where: {
      ...resourceOwnerWhere(ctx.owner),
      sourcePackId: packId,
      active: true,
    },
  });
  if (existing) {
    return { error: "ALREADY_IMPORTED" as const };
  }

  const collection = await db.resourceCollection.create({
    data: {
      ...resourceOwnerWhere(ctx.owner),
      title: encrypt(translate(lang, pack.titleKey)),
      description: encrypt(translate(lang, pack.descKey)),
      category: pack.category,
    },
  });

  const created = [];
  for (const item of pack.items) {
    const title = translate(lang, item.titleKey);
    const content = item.descKey
      ? translate(lang, item.descKey)
      : item.contentKey
        ? translate(lang, item.contentKey)
        : null;

    const resource = await db.resource.create({
      data: {
        ...resourceOwnerWhere(ctx.owner),
        collectionId: collection.id,
        title: encrypt(title),
        content: content ? encrypt(content) : null,
        url: item.url || null,
        category: item.category || pack.category,
        contentType: item.contentType,
        sourcePackId: packId,
      },
      include: {
        collection: { select: { title: true } },
        _count: { select: { shares: true } },
        shares: { select: { viewCount: true } },
      },
    });
    created.push(mapResourceRow(resource));
  }

  return {
    collection: {
      id: collection.id,
      title: translate(lang, pack.titleKey),
      resourceCount: created.length,
    },
    resources: created,
  };
}

export async function suggestResourcesForChart(
  ctx: LibraryAuthContext & { ok: true },
  chartId: string,
  lang: Lang,
) {
  const owner = ctx.owner;
  let recordId = chartId;
  let isAnalysand = false;

  if (owner.kind === "psychoanalyst") {
    const chart = await db.analysandRecord.findUnique({ where: { id: chartId } });
    if (!chart || chart.psychoanalystId !== owner.psychoanalystId) {
      return { suggestions: [], packs: [] };
    }
    isAnalysand = true;
  } else if (owner.kind === "integrative") {
    const chart = await db.integrativeClientRecord.findUnique({ where: { id: chartId } });
    if (!chart || chart.integrativeTherapistId !== owner.integrativeTherapistId) {
      return { suggestions: [], packs: [] };
    }
    // integrative uses client records — share via professional API pattern may differ
    // For now return pack suggestions only
    recordId = chartId;
  } else {
    const chart = await db.patientRecord.findUnique({ where: { id: chartId } });
    if (!chart || chart.professionalId !== owner.professionalId) {
      return { suggestions: [], packs: [] };
    }
  }

  const cidCodes: string[] = [];
  if (!isAnalysand && owner.professionalId) {
    const diagnoses = await db.patientDiagnosis.findMany({
      where: { patientRecordId: recordId, status: "ACTIVE" },
      select: { cidCode: true },
      take: 20,
    });
    cidCodes.push(...diagnoses.map((d) => d.cidCode));
  }

  const matchedPacks = packsForProfession(owner.professionKey).filter((pack) => {
    if (!pack.cidPrefixes?.length) return false;
    return cidCodes.some((code) =>
      pack.cidPrefixes!.some((prefix) => code.toUpperCase().startsWith(prefix.toUpperCase())),
    );
  });

  const packIds = matchedPacks.map((p) => p.id);
  const resources = await db.resource.findMany({
    where: {
      ...resourceOwnerWhere(owner),
      active: true,
      OR: [
        ...(packIds.length ? [{ sourcePackId: { in: packIds } }] : []),
        { category: { in: ["condition", "mental_health", "nutrition"] } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 12,
    include: {
      collection: { select: { title: true } },
      _count: { select: { shares: true } },
      shares: { select: { viewCount: true } },
    },
  });

  const packs = matchedPacks.map((pack) => ({
    id: pack.id,
    title: translate(lang, pack.titleKey),
    description: translate(lang, pack.descKey),
    itemCount: pack.items.length,
  }));

  return {
    cidCodes,
    packs,
    suggestions: resources.map(mapResourceRow),
  };
}
