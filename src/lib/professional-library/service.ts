import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { translate, type Lang } from "@/lib/i18n/translations";
import { findPackById, packsForProfession } from "./platform-packs";
import { referencesForProfession, resolveReferenceHref } from "./reference-links";
import {
  mapResourceRow,
  resourceOwnerWhere,
  resourceShareInclude,
  safeDecryptResource,
  shareCountFromRow,
  type LibraryAuthContext,
} from "./auth";
import type { LibraryCollectionDto, LibraryShareStats } from "./types";

export async function getLibraryHub(ctx: LibraryAuthContext & { ok: true }, lang: Lang) {
  const owner = ctx.owner;
  const kind = owner.kind;
  const shareInc = resourceShareInclude(kind);
  const where = { ...resourceOwnerWhere(owner), active: true };

  const [resources, collections, shareAgg] = await Promise.all([
    db.resource.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        collection: { select: { title: true } },
        ...shareInc,
      },
    }),
    db.resourceCollection.findMany({
      where: { ...resourceOwnerWhere(owner), active: true },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { resources: true } },
        resources: {
          where: { active: true },
          include: shareInc,
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
    href: resolveReferenceHref(ref, owner.professionKey),
    external: !!ref.external,
    icon: ref.icon,
  }));

  const collectionDtos: LibraryCollectionDto[] = collections.map((c) => ({
    id: c.id,
    title: safeDecryptResource(c.title),
    description: safeDecryptResource(c.description) || null,
    category: c.category as LibraryCollectionDto["category"],
    resourceCount: c._count.resources,
    shareCount: c.resources.reduce((sum, r) => sum + shareCountFromRow(r, kind), 0),
    createdAt: c.createdAt.toISOString(),
  }));

  const totalShares = resources.reduce((sum, r) => sum + shareCountFromRow(r, kind), 0);
  const totalViews = shareAgg._sum.viewCount ?? 0;
  const stats: LibraryShareStats = {
    totalShares,
    totalViews,
    openRate: totalShares > 0 ? Math.min(100, Math.round((totalViews / totalShares) * 100)) : 0,
  };

  return {
    professionKey: owner.professionKey,
    resources: resources.map((r) => mapResourceRow(r, kind)),
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

  const kind = ctx.owner.kind;
  const shareInc = resourceShareInclude(kind);

  const result = await db.$transaction(async (tx) => {
    const collection = await tx.resourceCollection.create({
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

      const resource = await tx.resource.create({
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
          ...shareInc,
        },
      });
      created.push(mapResourceRow(resource, kind));
    }

    return { collection, created };
  });

  return {
    collection: {
      id: result.collection.id,
      title: translate(lang, pack.titleKey),
      resourceCount: result.created.length,
    },
    resources: result.created,
  };
}

export async function suggestResourcesForChart(
  ctx: LibraryAuthContext & { ok: true },
  chartId: string,
  lang: Lang,
) {
  const owner = ctx.owner;
  const kind = owner.kind;
  const shareInc = resourceShareInclude(kind);
  let recordId = chartId;
  let isAnalysand = false;
  let unauthorized = false;

  if (owner.kind === "psychoanalyst") {
    const chart = await db.analysandRecord.findUnique({ where: { id: chartId } });
    if (!chart || chart.psychoanalystId !== owner.psychoanalystId) {
      unauthorized = true;
    } else {
      isAnalysand = true;
    }
  } else if (owner.kind === "integrative") {
    const chart = await db.integrativeClientRecord.findUnique({ where: { id: chartId } });
    if (!chart || chart.integrativeTherapistId !== owner.integrativeTherapistId) {
      unauthorized = true;
    }
  } else {
    const chart = await db.patientRecord.findUnique({ where: { id: chartId } });
    if (!chart || chart.professionalId !== owner.professionalId) {
      unauthorized = true;
    }
  }

  if (unauthorized) {
    return { error: "FORBIDDEN" as const };
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

  const professionPacks = packsForProfession(owner.professionKey);
  const matchedPackIds = new Set(
    professionPacks
      .filter((pack) => {
        if (!pack.cidPrefixes?.length || !cidCodes.length) return false;
        return cidCodes.some((code) =>
          pack.cidPrefixes!.some((prefix) => code.toUpperCase().startsWith(prefix.toUpperCase())),
        );
      })
      .map((p) => p.id),
  );

  // All saved library materials can be sent — CID only prioritizes matching packs.
  const resources = await db.resource.findMany({
    where: {
      ...resourceOwnerWhere(owner),
      active: true,
    },
    orderBy: { updatedAt: "desc" },
    include: {
      collection: { select: { title: true } },
      ...shareInc,
    },
  });

  const packs = [...professionPacks]
    .sort((a, b) => Number(matchedPackIds.has(b.id)) - Number(matchedPackIds.has(a.id)))
    .map((pack) => ({
      id: pack.id,
      title: translate(lang, pack.titleKey),
      description: translate(lang, pack.descKey),
      itemCount: pack.items.length,
    }));

  return {
    cidCodes,
    packs,
    suggestions: resources.map((r) => mapResourceRow(r, kind)),
  };
}
