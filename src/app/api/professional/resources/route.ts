// src/app/api/professional/resources/route.ts
// GET  — list this professional's resources
// POST — create a new resource (link or file)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

const createSchema = z.object({
  title:   z.string().min(1).max(200),
  content: z.string().max(5000).optional().or(z.literal("")),
  url:     z.string().url().optional().or(z.literal("")),
  fileKey: z.string().optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const resources = await db.resource.findMany({
    where: { professionalId: professional.id, active: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { shares: true } } },
  });

  return NextResponse.json({
    resources: resources.map((r) => ({
      id: r.id,
      title:      safeDecrypt(r.title),
      content:    safeDecrypt(r.content ?? null),
      url:        r.url ?? null,
      hasFile:    !!r.fileUrl,
      shareCount: r._count.shares,
      createdAt:  r.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  const resource = await db.resource.create({
    data: {
      professionalId: professional.id,
      title:   encrypt(d.title),
      content: d.content ? encrypt(d.content) : null,
      url:     d.url     || null,
      fileUrl: d.fileKey ? encrypt(d.fileKey) : null,
    },
  });

  return NextResponse.json({
    id:        resource.id,
    title:     d.title,
    content:   d.content || null,
    url:       resource.url,
    hasFile:   !!resource.fileUrl,
    shareCount: 0,
    createdAt: resource.createdAt.toISOString(),
  }, { status: 201 });
}
