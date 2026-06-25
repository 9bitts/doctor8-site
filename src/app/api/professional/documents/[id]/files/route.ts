// GET ? signed URLs for all attachments on a clinical record owned by this professional.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { getSignedReadUrl } from "@/lib/s3";
import { parseRecordContent } from "@/lib/record-content";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

function fileNameFromKey(key: string): string {
  const base = key.split("/").pop() || key;
  return base.replace(/^[a-f0-9-]{20,}-/i, "");
}

function fileKind(key: string): "image" | "pdf" | "video" | "other" {
  const ext = (key.split(".").pop() || "").toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "heif"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["mp4", "mov", "webm", "avi", "mkv"].includes(ext)) return "video";
  return "other";
}

function collectFileKeys(fileUrl: string | null, content: string | null): string[] {
  const keys: string[] = [];
  const primary = fileUrl ? safeDecrypt(fileUrl) : "";
  if (primary) keys.push(primary);

  const parsed = parseRecordContent(content ? safeDecrypt(content) : null);
  for (const k of parsed.attachments || []) {
    if (k && !keys.includes(k)) keys.push(k);
  }
  return keys;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const document = await db.medicalDocument.findUnique({
    where: { id: params.id },
    select: {
      fileUrl: true,
      content: true,
      professionalId: true,
      patientRecord: { select: { professionalId: true } },
    },
  });

  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ownerId = document.professionalId || document.patientRecord?.professionalId;
  if (ownerId !== professional.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const keys = collectFileKeys(document.fileUrl, document.content);
  if (keys.length === 0) {
    return NextResponse.json({ files: [] });
  }

  const files = await Promise.all(
    keys.map(async (key, index) => {
      const url = await getSignedReadUrl(key);
      const name = fileNameFromKey(key);
      const kind = fileKind(key);
      return { index, url, name, kind };
    }),
  );

  return NextResponse.json({ files });
}
