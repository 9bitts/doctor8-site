import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";
import { mapResourceRow, resourceShareInclude } from "@/lib/professional-library";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(5000).optional().or(z.literal("")),
  url: z.string().url().optional().or(z.literal("")),
  fileKey: z.string().optional().or(z.literal("")),
  category: z.string().optional(),
  contentType: z.enum(["link", "file", "text"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const resource = await db.resource.findUnique({ where: { id: params.id } });
  if (!resource || resource.integrativeTherapistId !== therapist.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const shareInc = resourceShareInclude("integrative");
  const updated = await db.resource.update({
    where: { id: params.id },
    data: {
      title: encrypt(d.title),
      content: d.content ? encrypt(d.content) : null,
      url: d.url || null,
      ...(d.fileKey ? { fileUrl: encrypt(d.fileKey) } : {}),
      ...(d.category ? { category: d.category } : {}),
      ...(d.contentType ? { contentType: d.contentType } : {}),
    },
    include: {
      collection: { select: { title: true } },
      ...shareInc,
    },
  });

  return NextResponse.json(mapResourceRow(updated, "integrative"));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const resource = await db.resource.findUnique({ where: { id: params.id } });
  if (!resource || resource.integrativeTherapistId !== therapist.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.resource.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
