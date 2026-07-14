// Signed download URL for a resource file shared with this patient.

import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { getSignedReadUrl } from "@/lib/s3";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v ?? "";
  }
}

async function fileKeyForShare(userId: string, shareId: string): Promise<string | null> {
  const health = await db.resourceShare.findFirst({
    where: { id: shareId, patientRecord: { linkedUserId: userId } },
    include: { resource: { select: { fileUrl: true, active: true } } },
  });
  if (health?.resource.active && health.resource.fileUrl) {
    return safeDecrypt(health.resource.fileUrl);
  }

  const analysand = await db.analysandResourceShare.findFirst({
    where: { id: shareId, analysandRecord: { linkedUserId: userId } },
    include: { resource: { select: { fileUrl: true, active: true } } },
  });
  if (analysand?.resource.active && analysand.resource.fileUrl) {
    return safeDecrypt(analysand.resource.fileUrl);
  }

  const integrative = await db.integrativeResourceShare.findFirst({
    where: { id: shareId, integrativeClientRecord: { linkedUserId: userId } },
    include: { resource: { select: { fileUrl: true, active: true } } },
  });
  if (integrative?.resource.active && integrative.resource.fileUrl) {
    return safeDecrypt(integrative.resource.fileUrl);
  }

  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const key = await fileKeyForShare(ctx.userId, params.id);
  if (!key) {
    return NextResponse.json({ error: "No file" }, { status: 404 });
  }

  const url = await getSignedReadUrl(key);
  return NextResponse.json({ url });
}
