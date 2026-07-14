// GET / POST — integrative therapist resources (mirrors professional API)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";
import {
  collectionOwnerWhere,
  mapResourceRow,
  resourceShareInclude,
} from "@/lib/professional-library";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(5000).optional().or(z.literal("")),
  url: z.string().url().optional().or(z.literal("")),
  fileKey: z.string().optional().or(z.literal("")),
  category: z.string().optional(),
  contentType: z.enum(["link", "file", "text"]).optional(),
  collectionId: z.string().optional().or(z.literal("")),
});

export async function GET() {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const shareInc = resourceShareInclude("integrative");
  const resources = await db.resource.findMany({
    where: { integrativeTherapistId: therapist.id, active: true },
    orderBy: { updatedAt: "desc" },
    include: {
      collection: { select: { title: true } },
      ...shareInc,
    },
  });

  return NextResponse.json({ resources: resources.map((r) => mapResourceRow(r, "integrative")) });
}

export async function POST(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  if (d.collectionId) {
    const col = await db.resourceCollection.findFirst({
      where: {
        id: d.collectionId,
        integrativeTherapistId: therapist.id,
        active: true,
      },
    });
    if (!col) {
      return NextResponse.json({ error: "Collection not found" }, { status: 400 });
    }
  }

  const shareInc = resourceShareInclude("integrative");
  const resource = await db.resource.create({
    data: {
      integrativeTherapistId: therapist.id,
      title: encrypt(d.title),
      content: d.content ? encrypt(d.content) : null,
      url: d.url || null,
      fileUrl: d.fileKey ? encrypt(d.fileKey) : null,
      category: d.category || "integrative",
      contentType: d.contentType || (d.fileKey ? "file" : d.url ? "link" : "text"),
      collectionId: d.collectionId || null,
    },
    include: {
      collection: { select: { title: true } },
      ...shareInc,
    },
  });

  return NextResponse.json(mapResourceRow(resource, "integrative"), { status: 201 });
}
