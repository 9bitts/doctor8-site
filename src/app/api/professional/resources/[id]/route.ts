// src/app/api/professional/resources/[id]/route.ts
// PATCH  — update a resource
// DELETE — soft-delete a resource (sets active=false)

import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { z } from "zod";

const updateSchema = z.object({
  title:   z.string().min(1).max(200),
  content: z.string().max(5000).optional().or(z.literal("")),
  url:     z.string().url().optional().or(z.literal("")),
  fileKey: z.string().optional().or(z.literal("")),
});

async function getOwnedResource(userId: string, id: string) {
  const professional = await db.professionalProfile.findUnique({
    where: { userId },
  });
  if (!professional) return null;

  const resource = await db.resource.findUnique({ where: { id } });
  if (!resource || resource.professionalId !== professional.id) return null;

  return { professional, resource };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCtx = await requireProfessionalApi();
  if (isApiError(authCtx)) return authCtx.error;

  const owned = await getOwnedResource(authCtx.userId, params.id);
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
    include: { _count: { select: { shares: true } } },
  });

  return NextResponse.json({
    id:         resource.id,
    title:      d.title,
    content:    d.content || null,
    url:        resource.url,
    hasFile:    !!resource.fileUrl,
    shareCount: resource._count.shares,
    createdAt:  resource.createdAt.toISOString(),
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCtx = await requireProfessionalApi();
  if (isApiError(authCtx)) return authCtx.error;

  const owned = await getOwnedResource(authCtx.userId, params.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.resource.update({
    where: { id: params.id },
    data: { active: false },
  });

  return NextResponse.json({ ok: true });
}
