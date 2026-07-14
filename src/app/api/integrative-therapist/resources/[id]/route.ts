import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { auth } from "@/lib/auth";
import { mapResourceRow } from "@/lib/professional-library";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(5000).optional().or(z.literal("")),
  url: z.string().url().optional().or(z.literal("")),
  fileKey: z.string().optional().or(z.literal("")),
  category: z.string().optional(),
  contentType: z.enum(["link", "file", "text"]).optional(),
});

async function getOwned(userId: string, id: string) {
  const profile = await db.integrativeTherapistProfile.findUnique({ where: { userId } });
  if (!profile) return null;
  const resource = await db.resource.findUnique({ where: { id } });
  if (!resource || resource.integrativeTherapistId !== profile.id) return null;
  return { profile, resource };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const owned = await getOwned(session.user.id, params.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const resource = await db.resource.update({
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
      _count: { select: { shares: true } },
      shares: { select: { viewCount: true } },
    },
  });

  return NextResponse.json(mapResourceRow(resource));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const owned = await getOwned(session.user.id, params.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.resource.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
