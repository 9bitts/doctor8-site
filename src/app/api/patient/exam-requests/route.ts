// src/app/api/patient/exam-requests/route.ts
// Exam requests issued to the logged-in patient (profile, linked chart, or shared).

import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { parseExamContent } from "@/lib/sign-helpers";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId } = ctx;

  const linkedRecords = await db.patientRecord.findMany({
    where: { linkedUserId: userId },
    select: { id: true },
  });
  const recordIds = linkedRecords.map((r) => r.id);

  const [direct, chart, shares] = await Promise.all([
    db.medicalDocument.findMany({
      where: { patientId: patientProfileId, type: "EXAM_REQUEST" },
      include: { professional: { select: { firstName: true, lastName: true, specialty: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    recordIds.length
      ? db.medicalDocument.findMany({
          where: { patientRecordId: { in: recordIds }, type: "EXAM_REQUEST" },
          include: { professional: { select: { firstName: true, lastName: true, specialty: true } } },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    db.sharedRecord.findMany({
      where: { sharedWithUserId: userId },
      include: {
        document: {
          include: { professional: { select: { firstName: true, lastName: true, specialty: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const sharedExams = shares
    .map((s) => s.document)
    .filter((d): d is NonNullable<typeof d> => !!d && d.type === "EXAM_REQUEST");

  const seen = new Set<string>();
  const merged = [...direct, ...chart, ...sharedExams]
    .filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const examRequests = merged.map((d) => {
    const contentRaw = d.content ? safeDecrypt(d.content) : "";
    const exam = parseExamContent(contentRaw);
    const pro = d.professional;

    return {
      id: d.id,
      title: safeDecrypt(d.title),
      createdAt: d.createdAt,
      signedAt: d.signedAt,
      signatureStatus: d.signatureStatus,
      hasSignedPdf: d.signatureStatus === "SIGNED" && !!d.signedFileUrl,
      whatsappNotifyStatus: d.whatsappNotifyStatus,
      examItems: exam.items,
      examNotes: exam.notes || "",
      cid: exam.cid || "",
      doctor: pro
        ? {
            name: `${pro.firstName} ${pro.lastName}`.trim(),
            specialty: pro.specialty || "",
          }
        : { name: "", specialty: "" },
    };
  });

  return NextResponse.json({ examRequests });
}
