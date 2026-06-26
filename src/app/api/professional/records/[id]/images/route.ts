// GET ? signed URLs for all image attachments across a patient chart.

import { NextRequest, NextResponse } from "next/server";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import { getSignedReadUrl } from "@/lib/s3";
import { collectFileKeys, fileKind, fileNameFromKey } from "@/lib/record-files";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const record = await db.patientRecord.findFirst({
    where: { id: params.id, professionalId: professional.id },
    select: { id: true },
  });
  if (!record) return NextResponse.json({ error: "Chart not found" }, { status: 404 });

  const documents = await db.medicalDocument.findMany({
    where: { patientRecordId: record.id },
    select: {
      id: true,
      title: true,
      createdAt: true,
      fileUrl: true,
      content: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const images: {
    id: string;
    docId: string;
    docTitle: string;
    docDate: string;
    index: number;
    url: string;
    name: string;
  }[] = [];

  for (const doc of documents) {
    const keys = collectFileKeys(doc.fileUrl, doc.content);
    let imageIndex = 0;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (fileKind(key) !== "image") continue;
      const url = await getSignedReadUrl(key);
      images.push({
        id: `${doc.id}-${i}`,
        docId: doc.id,
        docTitle: doc.title,
        docDate: doc.createdAt.toISOString(),
        index: imageIndex,
        url,
        name: fileNameFromKey(key),
      });
      imageIndex++;
    }
  }

  return NextResponse.json({ images });
}
