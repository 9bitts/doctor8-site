// GET / POST — integrative therapist resources (mirrors professional API)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { auth } from "@/lib/auth";
import { mapResourceRow, safeDecryptResource } from "@/lib/professional-library";
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

async function requireIntegrative() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "INTEGRATIVE_THERAPIST") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const profile = await db.integrativeTherapistProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return { error: NextResponse.json({ error: "No profile" }, { status: 404 }) };
  }
  return { profile };
}

export async function GET() {
  const ctx = await requireIntegrative();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { profile } = ctx as { profile: { id: string } };

  const resources = await db.resource.findMany({
    where: { integrativeTherapistId: profile.id, active: true },
    orderBy: { updatedAt: "desc" },
    include: {
      collection: { select: { title: true } },
      _count: { select: { shares: true } },
      shares: { select: { viewCount: true } },
    },
  });

  return NextResponse.json({ resources: resources.map(mapResourceRow) });
}

export async function POST(req: NextRequest) {
  const ctx = await requireIntegrative();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { profile } = ctx as { profile: { id: string } };

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const resource = await db.resource.create({
    data: {
      integrativeTherapistId: profile.id,
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
      _count: { select: { shares: true } },
      shares: { select: { viewCount: true } },
    },
  });

  return NextResponse.json(mapResourceRow(resource), { status: 201 });
}
