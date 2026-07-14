// src/app/api/professional/resources/route.ts
// GET  — list this professional's resources
// POST — create a new resource (link or file)

import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";

import { mapResourceRow, safeDecryptResource as libSafeDecrypt } from "@/lib/professional-library";

function safeDecrypt(v: string | null): string {
  return libSafeDecrypt(v);
}

const createSchema = z.object({
  title:   z.string().min(1).max(200),
  content: z.string().max(5000).optional().or(z.literal("")),
  url:     z.string().url().optional().or(z.literal("")),
  fileKey: z.string().optional().or(z.literal("")),
  category: z.string().optional(),
  contentType: z.enum(["link", "file", "text"]).optional(),
  collectionId: z.string().optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  
  const resources = await db.resource.findMany({
    where: { professionalId: ctx.professional.id, active: true },
    orderBy: { updatedAt: "desc" },
    include: {
      collection: { select: { title: true } },
      _count: { select: { shares: true } },
      shares: { select: { viewCount: true } },
    },
  });

  return NextResponse.json({
    resources: resources.map((r) => mapResourceRow(r, "health")),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  if (d.collectionId) {
    const col = await db.resourceCollection.findFirst({
      where: { id: d.collectionId, professionalId: ctx.professional.id, active: true },
    });
    if (!col) {
      return NextResponse.json({ error: "Collection not found" }, { status: 400 });
    }
  }

  const resource = await db.resource.create({
    data: {
      professionalId: ctx.professional.id,
      title:   encrypt(d.title),
      content: d.content ? encrypt(d.content) : null,
      url:     d.url     || null,
      fileUrl: d.fileKey ? encrypt(d.fileKey) : null,
      category: d.category || "general",
      contentType: d.contentType || (d.fileKey ? "file" : d.url ? "link" : "text"),
      collectionId: d.collectionId || null,
    },
    include: {
      collection: { select: { title: true } },
      _count: { select: { shares: true } },
      shares: { select: { viewCount: true } },
    },
  });

  return NextResponse.json(mapResourceRow(resource, "health"), { status: 201 });
}
