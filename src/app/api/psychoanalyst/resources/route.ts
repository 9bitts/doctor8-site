// GET  ? list this psychoanalyst's resources
// POST ? create a new resource (link or file)

import { NextRequest, NextResponse } from "next/server";
import { encrypt, decrypt } from "@/lib/encryption";
import { requirePsychoanalyst } from "@/lib/psychoanalyst-api";
import { db } from "@/lib/db";
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

export async function GET() {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const resources = await db.resource.findMany({
    where: { psychoanalystId: psychoanalyst.id, active: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { analysandShares: true } } },
  });

  return NextResponse.json({
    resources: resources.map((r) => ({
      id: r.id,
      title:      safeDecrypt(r.title),
      content:    safeDecrypt(r.content ?? null),
      url:        r.url ?? null,
      hasFile:    !!r.fileUrl,
      shareCount: r._count.analysandShares,
      createdAt:  r.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const resource = await db.resource.create({
    data: {
      psychoanalystId: psychoanalyst.id,
      title:   encrypt(d.title),
      content: d.content ? encrypt(d.content) : null,
      url:     d.url     || null,
      fileUrl: d.fileKey ? encrypt(d.fileKey) : null,
    },
  });

  return NextResponse.json({
    id:         resource.id,
    title:      d.title,
    content:    d.content || null,
    url:        resource.url,
    hasFile:    !!resource.fileUrl,
    shareCount: 0,
    createdAt:  resource.createdAt.toISOString(),
  }, { status: 201 });
}
