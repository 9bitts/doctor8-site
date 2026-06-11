// src/app/api/uploads/route.ts
// POST — upload a file to S3, returns the stored key.
// GET  — get a temporary signed URL to view a stored file (?key=...).
//
// Only authenticated users can upload/read. The key is returned to the caller,
// which stores it on the related record (e.g. MedicalDocument.fileUrl).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  uploadToS3,
  buildKey,
  getSignedReadUrl,
  ALLOWED_MIME,
  MAX_UPLOAD_BYTES,
} from "@/lib/s3";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const folder = (form.get("folder") as string) || "uploads";

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed. Use PDF, image, or video." },
      { status: 400 }
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum is 50 MB." },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const key = buildKey(folder, file.name);
  await uploadToS3({ key, body: buffer, contentType: file.type });

  return NextResponse.json({
    key,
    name: file.name,
    type: file.type,
    size: file.size,
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const url = await getSignedReadUrl(key);
  return NextResponse.json({ url });
}
