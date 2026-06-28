// GET ? signed URLs for all attachments on a clinical record owned by this professional.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSignedReadUrl } from "@/lib/s3";
import { collectFileKeys, fileKind, fileNameFromKey } from "@/lib/record-files";
import { resolveChartAccess } from "@/lib/chart-access";

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
      patientRecord: { select: { id: true, professionalId: true } },
    },
  });

  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const recordId = document.patientRecord?.id;
  if (recordId) {
    const access = await resolveChartAccess(professional.id, recordId);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else {
    const ownerId = document.professionalId || document.patientRecord?.professionalId;
    if (ownerId !== professional.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const keys = collectFileKeys(document.fileUrl, document.content);
  if (keys.length === 0) {
    return NextResponse.json({ files: [] });
  }

  const files = await Promise.all(
    keys.map(async (key, index) => {
      const url = await getSignedReadUrl(key);
      const name = fileNameFromKey(key);
      const kind = fileKind(key, name);
      return { index, url, name, kind };
    }),
  );

  return NextResponse.json({ files });
}
