import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { buildPrescriptionPdfBytesForRecord } from "@/lib/prescription-pdf-data";
import type { Lang } from "@/lib/prescription-pdf";
import { ensurePrescriptionToken, prescriptionQrUrl } from "@/lib/pharmacy-network/prescription-token";
import { generateQrPngBuffer } from "@/lib/qr-png";
import { embedPharmacyQrInPdfBytes } from "@/lib/pharmacy-prescription-pdf-qr";
import { resolveRequestLang } from "@/lib/sign-helpers";

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

/** Serves a prescription PDF for professionals, patients (with access), or admins. */
export async function servePrescriptionPdf(
  req: NextRequest,
  prescriptionId: string,
  session: Session,
): Promise<NextResponse> {
  const prescription = await db.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      professional: true,
      document: {
        include: {
          patient: {
            select: {
              firstName: true, lastName: true, dateOfBirth: true, cpf: true,
              addressLine1: true, city: true, state: true, country: true, zipCode: true,
            },
          },
          patientRecord: {
            select: {
              linkedUserId: true,
              firstName: true, lastName: true, dateOfBirth: true, cpf: true,
              addressLine1: true, city: true, state: true, country: true, zipCode: true,
            },
          },
        },
      },
    },
  });

  if (!prescription) return new NextResponse("Not found", { status: 404 });

  const isProfessional = prescription.professional?.userId === session.user!.id;
  const viewerPatient = session.user!.role === "PATIENT"
    ? await db.patientProfile.findUnique({ where: { userId: session.user!.id } })
    : null;
  const isPatientByProfile = !!(
    viewerPatient &&
    prescription.document?.patientId &&
    prescription.document.patientId === viewerPatient.id
  );
  const isLinkedChartPatient = !!(
    viewerPatient &&
    prescription.document?.patientRecord?.linkedUserId === session.user!.id
  );
  if (!isProfessional && !isPatientByProfile && !isLinkedChartPatient && session.user!.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  await audit.viewRecord(session.user!.id, "Prescription", prescription.id);

  if (prescription.signatureStatus === "SIGNED" && prescription.signedFileUrl) {
    try {
      const obj = await s3.send(new GetObjectCommand({
        Bucket: BUCKET, Key: prescription.signedFileUrl,
      }));
      const buf = await streamToBuffer(obj.Body as AsyncIterable<Uint8Array>);
      let out = new Uint8Array(buf);
      try {
        const tokenRow = await ensurePrescriptionToken(prescription.id);
        out = new Uint8Array(
          await embedPharmacyQrInPdfBytes(out, prescriptionQrUrl(tokenRow.token)),
        );
      } catch {
        // serve signed PDF without QR overlay if stamping fails
      }
      return new NextResponse(new Blob([out], { type: "application/pdf" }), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="receita-${prescription.id.slice(0, 8)}-assinada.pdf"`,
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
    where: { id: session.user!.id }, select: { language: true },
  });
  const lang = resolveRequestLang(req, viewer?.language) as Lang;

  let pharmacyQrPng: Uint8Array | undefined;
  if (prescription.signatureStatus === "SIGNED") {
    try {
      const tokenRow = await ensurePrescriptionToken(prescription.id);
      pharmacyQrPng = await generateQrPngBuffer(prescriptionQrUrl(tokenRow.token), 180);
    } catch {
      // optional QR
    }
  }

  const pdfBytes = await buildPrescriptionPdfBytesForRecord({
    prescription,
    lang,
    pharmacyQrPng,
  });

  const formSuffix = prescription.prescriptionFormKind
    ? `-${String(prescription.prescriptionFormKind).toLowerCase()}`
    : "";

  return new NextResponse(new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receita${formSuffix}-${prescription.id.slice(0, 8)}.pdf"`,
    },
  });
}
