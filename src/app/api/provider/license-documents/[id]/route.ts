import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFromS3 } from "@/lib/s3";
import { isProviderRole } from "@/lib/provider-license-docs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isProviderRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const doc = await db.providerLicenseDocument.findUnique({
    where: { id: params.id },
  });
  if (!doc || doc.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await deleteFromS3(doc.fileKey);
  } catch {
    // S3 delete failure should not block DB cleanup
  }

  await db.providerLicenseDocument.delete({ where: { id: doc.id } });

  return NextResponse.json({ ok: true });
}
