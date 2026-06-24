// GET — list clinical documents issued by the professional (exams, atestados, etc.)

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { isExamType, parseExamContent, safeDecrypt } from "@/lib/sign-helpers";

const CLINICAL_TYPES = [
  "EXAM_REQUEST", "EXAM_RESULT", "CERTIFICATE", "REFERRAL", "CLINICAL_NOTE", "OTHER",
] as const;

function safeDec(v: string | null | undefined): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) return NextResponse.json({ documents: [] });

  const docs = await db.medicalDocument.findMany({
    where: {
      professionalId: professional.id,
      type: { in: [...CLINICAL_TYPES] },
    },
    include: {
      category: { select: { name: true } },
      patientRecord: { select: { id: true, firstName: true, lastName: true } },
      patient: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const documents = docs.map((d) => {
    const contentRaw = d.content ? safeDec(d.content) : "";
    const exam = isExamType(d.type) ? parseExamContent(contentRaw) : null;

    let firstName = "";
    let lastName = "";
    if (d.patientRecord) {
      firstName = safeDecrypt(d.patientRecord.firstName);
      lastName = safeDecrypt(d.patientRecord.lastName);
    } else if (d.patient) {
      firstName = safeDecrypt(d.patient.firstName);
      lastName = safeDecrypt(d.patient.lastName);
    }

    return {
      id: d.id,
      type: d.type,
      categoryName: d.category?.name || null,
      title: safeDec(d.title),
      content: isExamType(d.type) ? null : contentRaw,
      examItems: exam?.items || [],
      examNotes: exam?.notes || "",
      cid: exam?.cid || "",
      patientRecordId: d.patientRecordId,
      signatureStatus: d.signatureStatus,
      digitalSignature: d.digitalSignature,
      signed: d.signatureStatus === "SIGNED",
      createdAt: d.createdAt,
      document: {
        patient: firstName || lastName ? { firstName, lastName } : null,
      },
    };
  });

  return NextResponse.json({ documents });
}
