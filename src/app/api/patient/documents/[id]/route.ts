// DELETE — patient removes one of their own uploaded documents (+ S3 file + shares).
import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/encryption";
import { deleteFromS3 } from "@/lib/s3";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId } = ctx;

  const doc = await db.medicalDocument.findUnique({
    where: { id: params.id },
    select: { id: true, patientId: true, professionalId: true, fileUrl: true, signedFileUrl: true },
  });
  if (!doc || doc.patientId !== patientProfileId || doc.professionalId !== null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fileKeys = [doc.fileUrl, doc.signedFileUrl]
    .map((v) => safeDecrypt(v))
    .filter(Boolean);

  await db.sharedRecord.deleteMany({ where: { documentId: doc.id } });
  await db.medicalDocument.delete({ where: { id: doc.id } });

  for (const key of fileKeys) {
    try {
      await deleteFromS3(key);
    } catch {
      // S3 delete failure should not block DB cleanup
    }
  }

  await audit.deleteRecord(userId, "MedicalDocument", doc.id);

  return NextResponse.json({ deleted: true });
}
