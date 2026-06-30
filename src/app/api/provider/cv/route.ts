import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { isPsychologistSpecialty } from "@/lib/psychologist-portal";
import { buildKey, deleteFromS3, getSignedReadUrl, uploadToS3 } from "@/lib/s3";
import { CV_MIME, MAX_CV_BYTES, cvFolder } from "@/lib/provider-cv";

async function requirePsychologistProfile(userId: string) {
  const profile = await db.professionalProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      specialty: true,
      cvFileKey: true,
      cvFileName: true,
      cvFileSize: true,
    },
  });
  if (!profile || !isPsychologistSpecialty(profile.specialty)) {
    return null;
  }
  return profile;
}

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const profile = await requirePsychologistProfile(ctx.userId);
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!profile.cvFileKey) {
    return NextResponse.json({ cv: null });
  }

  const viewUrl = await getSignedReadUrl(profile.cvFileKey);
  return NextResponse.json({
    cv: {
      fileName: profile.cvFileName,
      fileSize: profile.cvFileSize,
      viewUrl,
    },
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const profile = await requirePsychologistProfile(ctx.userId);
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.type !== CV_MIME) {
    return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
  }

  if (file.size > MAX_CV_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum is 50 MB." }, { status: 400 });
  }

  if (profile.cvFileKey) {
    try {
      await deleteFromS3(profile.cvFileKey);
    } catch {
      // S3 delete failure should not block replacement
    }
  }

  const folder = cvFolder(ctx.userId);
  const key = buildKey(folder, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  await uploadToS3({ key, body: buffer, contentType: CV_MIME });

  const updated = await db.professionalProfile.update({
    where: { id: profile.id },
    data: {
      cvFileKey: key,
      cvFileName: file.name.slice(0, 255),
      cvFileSize: file.size,
    },
    select: { cvFileKey: true, cvFileName: true, cvFileSize: true },
  });

  const viewUrl = await getSignedReadUrl(updated.cvFileKey!);

  return NextResponse.json(
    {
      cv: {
        fileName: updated.cvFileName,
        fileSize: updated.cvFileSize,
        viewUrl,
      },
    },
    { status: 201 },
  );
}

export async function DELETE() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const profile = await requirePsychologistProfile(ctx.userId);
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!profile.cvFileKey) {
    return NextResponse.json({ error: "No CV uploaded" }, { status: 404 });
  }

  try {
    await deleteFromS3(profile.cvFileKey);
  } catch {
    // S3 delete failure should not block DB cleanup
  }

  await db.professionalProfile.update({
    where: { id: profile.id },
    data: { cvFileKey: null, cvFileName: null, cvFileSize: null },
  });

  return NextResponse.json({ ok: true });
}
