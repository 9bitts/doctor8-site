import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { getSignedReadUrl } from "@/lib/s3";

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const docs = await db.providerLicenseDocument.findMany({
    where: { userId: params.userId },
    orderBy: { createdAt: "desc" },
  });

  const documents = await Promise.all(
    docs.map(async (doc) => ({
      id: doc.id,
      label: doc.label,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      createdAt: doc.createdAt.toISOString(),
      viewUrl: await getSignedReadUrl(doc.fileKey),
    })),
  );

  return NextResponse.json({ documents });
}
