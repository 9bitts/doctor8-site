// src/app/api/professional/shared/route.ts
// GET (no params) — list documents patients shared with this professional.
// GET (?documentId=...) — return a signed URL to download that shared file.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { getSignedReadUrl } from "@/lib/s3";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");

  // --- Single document: return a signed URL for download ---
  if (documentId) {
    // Verify this document was shared with THIS professional.
    const share = await db.sharedRecord.findFirst({
      where: { documentId, sharedWithProfessionalId: professional.id },
      select: { id: true },
    });
    if (!share) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const doc = await db.medicalDocument.findUnique({
      where: { id: documentId },
      select: { fileUrl: true },
    });
    if (!doc?.fileUrl) return NextResponse.json({ error: "No file" }, { status: 404 });

    const url = await getSignedReadUrl(safeDecrypt(doc.fileUrl));
    return NextResponse.json({ url });
  }

  // --- List: all documents shared with this professional by patients ---
  const shares = await db.sharedRecord.findMany({
    where: { sharedWithProfessionalId: professional.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      document: {
        include: { category: { select: { name: true, groupName: true } } },
      },
      patient: { select: { id: true, firstName: true, lastName: true, userId: true } },
    },
  });

  const items = shares
    .filter((s) => s.document)
    .map((s) => ({
      shareId: s.id,
      documentId: s.document!.id,
      title: safeDecrypt(s.document!.title),
      content: s.document!.content ? safeDecrypt(s.document!.content) : null,
      categoryName: s.document!.category?.name ?? null,
      categoryGroup: s.document!.category?.groupName ?? null,
      type: s.document!.type as string,
      hasFile: !!s.document!.fileUrl,
      patientName: `${safeDecrypt(s.patient.firstName)} ${safeDecrypt(s.patient.lastName)}`.trim(),
      patientUserId: s.patient.userId,
      patientProfileId: s.patient.id,
      sharedAt: s.createdAt.toISOString(),
    }));

  return NextResponse.json({ items });
}
