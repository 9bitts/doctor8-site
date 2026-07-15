import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getSignedReadUrl } from "@/lib/s3";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const { id } = await params;
  const order = await db.importOrder.findFirst({
    where: { id, patientUserId: ctx.userId },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const docs = await db.importOrderDocument.findMany({
    where: { orderId: id },
    orderBy: { createdAt: "asc" },
  });

  const documents = await Promise.all(
    docs.map(async (doc) => ({
      id: doc.id,
      kind: doc.kind,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      createdAt: doc.createdAt.toISOString(),
      viewUrl: await getSignedReadUrl(doc.fileKey),
    })),
  );

  return NextResponse.json({ documents });
}
