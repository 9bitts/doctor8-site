import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  buildKey,
  deleteFromS3,
  getSignedReadUrl,
  inferUploadContentType,
  isAllowedUpload,
  MAX_UPLOAD_BYTES,
  uploadToS3,
} from "@/lib/s3";
import { parsePhotoKeys, type FieldVisitPhoto } from "@/lib/nr1-field-visit";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const record = await db.employerAepRecord.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
    select: { photoKeys: true },
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = parsePhotoKeys(record.photoKeys);
  const withUrls = await Promise.all(
    photos.map(async (p) => {
      try {
        const url = await getSignedReadUrl(p.key, 1800);
        return { ...p, url };
      } catch {
        return { ...p, url: null as string | null };
      }
    }),
  );

  return NextResponse.json({ photos: withUrls });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const record = await db.employerAepRecord.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (record.aetStatus === "COMPLETED") {
    return NextResponse.json({ error: "Relatório de visita já assinado." }, { status: 409 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const caption = String(form.get("caption") ?? "").slice(0, 200);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  const nameOk = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  const isImage = file.type.startsWith("image/") || nameOk;
  if (!isImage || !isAllowedUpload(file)) {
    return NextResponse.json({ error: "Somente imagens" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Arquivo muito grande" }, { status: 400 });
  }

  const existing = parsePhotoKeys(record.photoKeys);
  if (existing.length >= 12) {
    return NextResponse.json({ error: "Máximo de 12 fotos por visita" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = inferUploadContentType(file);
    const key = buildKey(`employer/${ctx.employerCompanyId}/aep-field`, file.name);
    await uploadToS3({ key, body: buffer, contentType });

    const photo: FieldVisitPhoto = {
      key,
      caption: caption || undefined,
      uploadedAt: new Date().toISOString(),
    };
    const next = [...existing, photo];

    const updated = await db.employerAepRecord.update({
      where: { id },
      data: {
        photoKeys: next as unknown as Prisma.InputJsonValue,
        aetStatus: record.aetStatus === "NONE" ? "IN_FIELD" : record.aetStatus,
      },
    });

    let url: string | null = null;
    try {
      url = await getSignedReadUrl(key, 1800);
    } catch {
      url = null;
    }

    return NextResponse.json({
      photo: { ...photo, url },
      photoCount: next.length,
      aetStatus: updated.aetStatus,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json(
      { error: msg.includes("AWS") || msg.includes("credentials") ? "Upload indisponível (S3)" : msg },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const record = await db.employerAepRecord.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (record.aetStatus === "COMPLETED") {
    return NextResponse.json({ error: "Relatório de visita já assinado." }, { status: 409 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const existing = parsePhotoKeys(record.photoKeys);
  if (!existing.some((p) => p.key === key)) {
    return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
  }

  // Prevent deleting keys outside this company folder.
  const prefix = `employer/${ctx.employerCompanyId}/aep-field/`;
  if (!key.startsWith(prefix)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  try {
    await deleteFromS3(key);
  } catch {
    // Continue removing DB reference even if object already gone.
  }

  const next = existing.filter((p) => p.key !== key);
  await db.employerAepRecord.update({
    where: { id },
    data: { photoKeys: next as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json({ ok: true, photoCount: next.length });
}
