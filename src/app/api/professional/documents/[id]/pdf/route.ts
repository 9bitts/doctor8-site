// GET — serve clinical document PDF (signed from S3 or generate unsigned)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { buildClinicalDocumentPdf } from "@/lib/clinical-document-pdf";
import {
  computeAge, isExamType, joinAddress, LOCALE, resolveRequestLang,
  parseExamContent, resolvePatient, safeDecrypt,
} from "@/lib/sign-helpers";
import { parseRecordContent } from "@/lib/record-content";

export const runtime = "nodejs";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET || "doctor8-files-prod";

async function streamToBuffer(stream: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function safeDec(v: string | null | undefined): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const document = await db.medicalDocument.findUnique({
    where: { id: params.id },
    include: {
      professional: true,
      sharedRecords: { select: { sharedWithUserId: true } },
      patientRecord: {
        select: {
          professionalId: true, linkedUserId: true,
          firstName: true, lastName: true, dateOfBirth: true, cpf: true,
          addressLine1: true, city: true, state: true, country: true, zipCode: true,
        },
      },
      patient: {
        select: {
          firstName: true, lastName: true, dateOfBirth: true, cpf: true,
          addressLine1: true, city: true, state: true, country: true, zipCode: true,
        },
      },
    },
  });

  if (!document) return new NextResponse("Not found", { status: 404 });

  const viewerProfessional = session.user.role === "PROFESSIONAL"
    ? await db.professionalProfile.findUnique({ where: { userId: session.user.id } })
    : null;

  const viewerPatient = session.user.role === "PATIENT"
    ? await db.patientProfile.findUnique({ where: { userId: session.user.id } })
    : null;

  const isDocOwner = document.professional?.userId === session.user.id;
  const isChartOwner = !!(
    viewerProfessional &&
    document.patientRecord?.professionalId === viewerProfessional.id
  );
  const isPatientOwner = !!(
    viewerPatient &&
    document.patientId &&
    document.patientId === viewerPatient.id
  );
  // The professional workflow creates documents against a PatientRecord
  // (chart) without filling patientId — the patient linked to that chart
  // is still the owner of their own document.
  const isLinkedChartPatient = !!(
    viewerPatient &&
    document.patientRecord?.linkedUserId &&
    document.patientRecord.linkedUserId === session.user.id
  );
  const isPatientShared = document.sharedRecords.some(
    (s) => s.sharedWithUserId === session.user.id,
  );
  const canAccess =
    isDocOwner ||
    isChartOwner ||
    isPatientOwner ||
    isLinkedChartPatient ||
    isPatientShared;

  if (!canAccess) return new NextResponse("Forbidden", { status: 403 });

  if (document.signatureStatus === "SIGNED" && document.signedFileUrl) {
    try {
      const obj = await s3.send(new GetObjectCommand({
        Bucket: BUCKET,
        Key: document.signedFileUrl,
      }));
      const buf = await streamToBuffer(obj.Body as AsyncIterable<Uint8Array>);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="documento-${params.id.slice(0, 8)}.pdf"`,
        },
      });
    } catch {
      return NextResponse.json(
        { error: "SIGNED_PDF_UNAVAILABLE", message: "Signed PDF is temporarily unavailable." },
        { status: 503 },
      );
    }
  }

  const viewer = await db.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const lang = resolveRequestLang(req, viewer?.language);
  const locale = LOCALE[lang];
  // Use the professional who is printing (when applicable), not necessarily the record creator.
  const pro = viewerProfessional || document.professional;
  if (!pro) return new NextResponse("Not found", { status: 404 });
  const patient = resolvePatient(document.patientRecord, document.patient);
  const contentRaw = document.content ? safeDec(document.content) : "";
  const title = safeDec(document.title);
  const exam = isExamType(document.type) ? parseExamContent(contentRaw) : null;
  const record = exam ? null : parseRecordContent(contentRaw);
  const bodyText = exam ? undefined : (record?.body || (record?.cid ? "" : contentRaw));
  const cidCode = exam?.cid || record?.cid;
  const cidLabel = record?.cidLabel;

  const pdfBytes = await buildClinicalDocumentPdf({
    lang,
    kind: exam ? "exam" : "document",
    docTitle: title,
    proFirstName: pro.firstName,
    proLastName: pro.lastName,
    proSpecialty: pro.specialty,
    proLicense: pro.licenseNumber,
    clinicAddressFull: joinAddress([
      pro.clinicName, pro.clinicAddress, pro.clinicCity, pro.clinicState, pro.clinicZip,
    ]),
    patientName: patient.name,
    patientAge: computeAge(patient.dob),
    patientCpf: patient.cpf,
    patientAddressFull: patient.addressFull,
    todayText: new Date(document.createdAt).toLocaleDateString(locale, {
      year: "numeric", month: "long", day: "numeric",
    }),
    documentId: document.id,
    examItems: exam?.items,
    examNotes: exam?.notes,
    cid: cidCode,
    cidLabel,
    body: bodyText,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="documento-${params.id.slice(0, 8)}.pdf"`,
    },
  });
}
