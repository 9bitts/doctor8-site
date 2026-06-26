// PATCH  ? update a resource
// DELETE ? soft-delete a resource

import { NextRequest, NextResponse } from "next/server";
import { encrypt } from "@/lib/encryption";
import { requirePsychoanalyst } from "@/lib/psychoanalyst-api";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  title:   z.string().min(1).max(200),
  content: z.string().max(5000).optional().or(z.literal("")),
  url:     z.string().url().optional().or(z.literal("")),
  fileKey: z.string().optional().or(z.literal("")),
});

async function getOwnedResource(userId: string, id: string) {
  const psychoanalyst = await db.psychoanalystProfile.findUnique({ where: { userId } });
  if (!psychoanalyst) return null;

  const resource = await db.resource.findUnique({ where: { id } });
  if (!resource || resource.psychoanalystId !== psychoanalyst.id) return null;

  return { psychoanalyst, resource };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;

  const owned = await getOwnedResource(ctx.session.user.id, params.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const resource = await db.resource.update({
    where: { id: params.id },
    data: {
      title:   encrypt(d.title),
      content: d.content ? encrypt(d.content) : null,
      url:     d.url || null,
      ...(d.fileKey ? { fileUrl: encrypt(d.fileKey) } : {}),
    },
    include: { _count: { select: { analysandShares: true } } },
  });

  return NextResponse.json({
    id:         resource.id,
    title:      d.title,
    content:    d.content || null,
    url:        resource.url,
    hasFile:    !!resource.fileUrl,
    shareCount: resource._count.analysandShares,
    createdAt:  resource.createdAt.toISOString(),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;

  const owned = await getOwnedResource(ctx.session.user.id, params.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.resource.update({
    where: { id: params.id },
    data: { active: false },
  });

  return NextResponse.json({ ok: true });
}
