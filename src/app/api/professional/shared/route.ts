// src/app/api/professional/shared/route.ts
// GET (no params) — list documents patients shared with this professional,
//                   incl. whether the patient already has a chart and whether
//                   the document was already attached to that chart.
// GET (?documentId=...) — return a signed URL to download that shared file.
import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { getSignedReadUrl } from "@/lib/s3";
import { documentHasStoredFile, resolveDocumentFileKey } from "@/lib/document-file";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");

  // --- Single document: signed URL for download ---
  if (documentId) {
    const share = await db.sharedRecord.findFirst({
      where: { documentId, sharedWithProfessionalId: ctx.professional.id },
      select: { id: true },
    });
    if (!share) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const doc = await db.medicalDocument.findUnique({
      where: { id: documentId },
      select: { fileUrl: true, signedFileUrl: true, signatureStatus: true },
    });
    const key = doc ? resolveDocumentFileKey(doc) : null;
    if (!key) return NextResponse.json({ error: "No file" }, { status: 404 });

    const url = await getSignedReadUrl(key);
    return NextResponse.json({ url });
  }

  // --- List of documents shared with this professional ---
  const shares = await db.sharedRecord.findMany({
    where: { sharedWithProfessionalId: ctx.professional.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      document: {
        include: { category: { select: { name: true, groupName: true } } },
      },
      patient: { select: { id: true, firstName: true, lastName: true, userId: true } },
    },
  });

  const charts = await db.patientRecord.findMany({
    where: { professionalId: ctx.professional.id },
    select: { id: true, linkedUserId: true, email: true },
  });

  const patientUserIds = Array.from(new Set(shares.map((s) => s.patient.userId)));
  const users = await db.user.findMany({
    where: { id: { in: patientUserIds } },
    select: { id: true, email: true },
  });
  const emailByUser = new Map<string, string | null>(users.map((u) => [u.id, u.email]));

  function findChart(patientUserId: string, patientEmail: string | null | undefined): string | null {
    const byUser = charts.find((c) => c.linkedUserId === patientUserId);
    if (byUser) return byUser.id;
    if (patientEmail) {
      const byEmail = charts.find((c) => (c.email || "").toLowerCase() === patientEmail.toLowerCase());
      if (byEmail) return byEmail.id;
    }
    return null;
  }

  // Which shared documents were already attached to a chart of this professional?
  const sharedDocIds = shares.map((s) => s.documentId);
  const attachedCopies = await db.medicalDocument.findMany({
    where: {
      professionalId: ctx.professional.id,
      sourceDocumentId: { in: sharedDocIds },
    },
    select: { sourceDocumentId: true },
  });
  const attachedSet = new Set(attachedCopies.map((a) => a.sourceDocumentId));

  const items = shares
    .filter((s) => s.document)
    .map((s) => {
      const pEmail = emailByUser.get(s.patient.userId) ?? null;
      const firstName = safeDecrypt(s.patient.firstName);
      const lastName = safeDecrypt(s.patient.lastName);
      return {
        shareId: s.id,
        documentId: s.document!.id,
        title: safeDecrypt(s.document!.title),
        content: s.document!.content ? safeDecrypt(s.document!.content) : null,
        categoryName: s.document!.category?.name ?? null,
        categoryGroup: s.document!.category?.groupName ?? null,
        type: s.document!.type as string,
        hasFile: documentHasStoredFile(s.document!),
        patientName: `${firstName} ${lastName}`.trim(),
        patientFirstName: firstName,
        patientLastName: lastName,
        patientEmail: pEmail,
        existingChartId: findChart(s.patient.userId, pEmail),
        alreadyAttached: attachedSet.has(s.document!.id),
        sharedAt: s.createdAt.toISOString(),
      };
    });

  return NextResponse.json({ items });
}
