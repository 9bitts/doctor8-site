// src/app/api/professional/shared/route.ts
// GET (no params) — list documents patients shared with this professional,
//                   including whether that patient already has a chart.
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

  // --- Single document: signed URL for download ---
  if (documentId) {
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

  // --- List of documents shared with this professional ---
  const shares = await db.sharedRecord.findMany({
    where: { sharedWithProfessionalId: professional.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      document: {
        include: { category: { select: { name: true, groupName: true } } },
      },
      patient: { select: { id: true, firstName: true, lastName: true, email: true, userId: true } },
    },
  });

  // For each sharing patient, does this professional already have a chart?
  // We match by linkedUserId (chart linked to that account) OR by email.
  const patientUserIds = Array.from(new Set(shares.map((s) => s.patient.userId)));
  const charts = await db.patientRecord.findMany({
    where: { professionalId: professional.id },
    select: { id: true, linkedUserId: true, email: true },
  });

  function findChart(patientUserId: string, patientEmail: string | null | undefined): string | null {
    const byUser = charts.find((c) => c.linkedUserId === patientUserId);
    if (byUser) return byUser.id;
    if (patientEmail) {
      const byEmail = charts.find((c) => (c.email || "").toLowerCase() === patientEmail.toLowerCase());
      if (byEmail) return byEmail.id;
    }
    return null;
  }

  // Patient account emails (PatientProfile has no email; it's on the User).
  const users = await db.user.findMany({
    where: { id: { in: patientUserIds } },
    select: { id: true, email: true },
  });
  const emailByUser = new Map<string, string | null>(users.map((u) => [u.id, u.email]));

  const items = shares
    .filter((s) => s.document)
    .map((s) => {
      const pEmail = emailByUser.get(s.patient.userId) ?? null;
      const existingChartId = findChart(s.patient.userId, pEmail);
      return {
        shareId: s.id,
        documentId: s.document!.id,
        title: safeDecrypt(s.document!.title),
        content: s.document!.content ? safeDecrypt(s.document!.content) : null,
        categoryName: s.document!.category?.name ?? null,
        categoryGroup: s.document!.category?.groupName ?? null,
        type: s.document!.type as string,
        hasFile: !!s.document!.fileUrl,
        patientName: `${safeDecrypt(s.patient.firstName)} ${safeDecrypt(s.patient.lastName)}`.trim(),
        patientFirstName: safeDecrypt(s.patient.firstName),
        patientLastName: safeDecrypt(s.patient.lastName),
        patientEmail: pEmail,
        existingChartId,
        sharedAt: s.createdAt.toISOString(),
      };
    });

  return NextResponse.json({ items });
}
