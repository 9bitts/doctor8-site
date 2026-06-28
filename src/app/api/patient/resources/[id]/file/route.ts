// src/app/api/patient/resources/[id]/file/route.ts
// Signed download URL for a resource file shared with this patient.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { getSignedReadUrl } from "@/lib/s3";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const share = await db.resourceShare.findFirst({
    where: {
      id: params.id,
      patientRecord: { linkedUserId: session.user.id },
    },
    include: { resource: { select: { fileUrl: true } } },
  });

  if (!share?.resource.fileUrl) {
    return NextResponse.json({ error: "No file" }, { status: 404 });
  }

  const key = safeDecrypt(share.resource.fileUrl);
  const url = await getSignedReadUrl(key);
  return NextResponse.json({ url });
}
