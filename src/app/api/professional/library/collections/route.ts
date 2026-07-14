import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import {
  collectionOwnerWhere,
  mapResourceRow,
  requireLibraryAuth,
  resourceShareInclude,
  safeDecryptResource,
  shareCountFromRow,
} from "@/lib/professional-library";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  category: z.string().default("general"),
});

export async function GET() {
  const ctx = await requireLibraryAuth();
  if (!ctx.ok) return ctx.error;

  const kind = ctx.owner.kind;
  const shareInc = resourceShareInclude(kind);

  const collections = await db.resourceCollection.findMany({
    where: { ...collectionOwnerWhere(ctx.owner), active: true },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { resources: true } },
      resources: {
        where: { active: true },
        include: shareInc,
      },
    },
  });

  return NextResponse.json({
    collections: collections.map((c) => ({
      id: c.id,
      title: safeDecryptResource(c.title),
      description: safeDecryptResource(c.description) || null,
      category: c.category,
      resourceCount: c._count.resources,
      shareCount: c.resources.reduce((sum, r) => sum + shareCountFromRow(r, kind), 0),
      resources: c.resources.map((r) => mapResourceRow(r, kind)),
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireLibraryAuth();
  if (!ctx.ok) return ctx.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const collection = await db.resourceCollection.create({
    data: {
      ...collectionOwnerWhere(ctx.owner),
      title: encrypt(d.title),
      description: d.description ? encrypt(d.description) : null,
      category: d.category,
    },
  });

  return NextResponse.json(
    {
      id: collection.id,
      title: d.title,
      description: d.description || null,
      category: collection.category,
      resourceCount: 0,
      shareCount: 0,
      createdAt: collection.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
