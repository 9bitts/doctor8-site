import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { getSignedReadUrl } from "@/lib/s3";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const order = await db.importOrder.findUnique({
    where: { id },
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
