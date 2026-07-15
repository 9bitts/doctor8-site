import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { audit } from "@/lib/audit";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { buildPrescriptionPdf, type Lang } from "@/lib/prescription-pdf";
import { enrichMedsForPrescriptionPdf, cannabisPdfComplianceLine } from "@/lib/medicina-natural-catalog/enrich-meds-for-pdf";
import { ensurePrescriptionToken, prescriptionQrUrl } from "@/lib/pharmacy-network/prescription-token";
import { generateQrPngBuffer } from "@/lib/qr-png";
import { embedPharmacyQrInPdfBytes } from "@/lib/pharmacy-prescription-pdf-qr";
import { formatLicense, getProfessionInfo, isDentistSpecialty } from "@/lib/profession-label";
import { resolveRequestLang } from "@/lib/sign-helpers";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET || "doctor8-files-prod";

function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}
function computeAge(dob: Date | null): number | null {
  if (!dob || isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  if (age < 0 || age > 130) return null;
  return age;
}
function joinAddress(parts: (string | null | undefined)[]): string {
  return parts.map((p) => (p || "").trim()).filter(Boolean).join(", ");
}

const FREQ: Record<Lang, Record<string, string>> = {
  en: {},
  pt: {
    "Once daily": "Uma vez ao dia", "Twice daily": "Duas vezes ao dia",
    "Three times daily": "Três vezes ao dia", "Every 8 hours": "A cada 8 horas",
    "Every 12 hours": "A cada 12 horas", "As needed": "Quando necessário", "Weekly": "Semanalmente",
  },
  es: {
    "Once daily": "Una vez al día", "Twice daily": "Dos veces al día",
    "Three times daily": "Tres veces al día", "Every 8 hours": "Cada 8 horas",
    "Every 12 hours": "Cada 12 horas", "As needed": "Cuando sea necesario", "Weekly": "Semanalmente",
  },
};
const CONTINUOUS_DURATION: Record<Lang, string> = {
  en: "Continuous use",
  pt: "Uso Contínuo",
  es: "Uso continuo",
};
const LOCALE: Record<Lang, string> = { en: "en-US", pt: "pt-BR", es: "es-ES" };

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
  const locale = LOCALE[lang];

  const rec = prescription.document?.patientRecord;
  const acc = prescription.document?.patient;
  const srcP = rec || acc;

  let patientName = "—", patientDob: Date | null = null, patientCpf = "";
  let addrLine = "", city = "", state = "", country = "", zip = "";
  if (srcP) {
    patientName = `${safeDecrypt(srcP.firstName)} ${safeDecrypt(srcP.lastName)}`.trim();
    patientDob = srcP.dateOfBirth ? new Date(safeDecrypt(srcP.dateOfBirth)) : null;
    patientCpf = safeDecrypt((srcP as { cpf?: string | null }).cpf ?? null);
    addrLine = safeDecrypt(srcP.addressLine1);
    city = srcP.city || ""; state = srcP.state || "";
    country = srcP.country || ""; zip = safeDecrypt(srcP.zipCode);
  }

  const pro = prescription.professional;
  if (!pro) return new NextResponse("Not found", { status: 404 });
  const clinicAddressFull = joinAddress([
    (pro as { clinicName?: string | null }).clinicName,
    (pro as { clinicAddress?: string | null }).clinicAddress,
    (pro as { clinicCity?: string | null }).clinicCity,
    (pro as { clinicState?: string | null }).clinicState,
    (pro as { clinicZip?: string | null }).clinicZip,
  ]);

  const medsRaw = (prescription.medications as {
      name: string;
      dosage: string;
      frequency: string;
      duration?: string;
      instructions?: string;
      presentation?: string;
      pharmaceuticalForm?: string;
      mnSlug?: string;
      renisus?: boolean;
      continuousUse?: boolean;
      itemKind?: import("@/lib/prescription-item-kind").PrescriptionItemKind;
    }[]).map((m) => {
      const isContinuous = m.continuousUse || m.frequency === "Continuous use";
      return {
        ...m,
        frequency: isContinuous ? "" : (FREQ[lang][m.frequency] || m.frequency),
        duration: isContinuous ? CONTINUOUS_DURATION[lang] : m.duration,
      };
    });

  const meds = await enrichMedsForPrescriptionPdf(medsRaw, lang);
  const cannabisComplianceLine = cannabisPdfComplianceLine(meds, lang);

  const today = new Date().toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  const validUntil = prescription.validUntil
    ? new Date(prescription.validUntil).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })
    : (lang === "pt" ? "Sem validade" : lang === "es" ? "Sin caducidad" : "No expiry");

  let pharmacyQrPng: Uint8Array | undefined;
  if (prescription.signatureStatus === "SIGNED") {
    try {
      const tokenRow = await ensurePrescriptionToken(prescription.id);
      pharmacyQrPng = await generateQrPngBuffer(prescriptionQrUrl(tokenRow.token), 180);
    } catch {
      // optional QR
    }
  }

  const pdfBytes = await buildPrescriptionPdf({
    lang,
    proFirstName: pro.firstName, proLastName: pro.lastName,
    proSpecialty: pro.specialty,
    proLicense: formatLicense(
      pro.licenseNumber,
      pro.licenseState,
      getProfessionInfo(pro.specialty).councilKey,
    ),
    clinicAddressFull,
    patientName,
    patientAge: computeAge(patientDob),
    patientCpf,
    patientAddressFull: joinAddress([addrLine, city, state, zip, country]),
    prescriptionId: prescription.id,
    todayText: today, validUntilText: validUntil,
    medications: meds,
    instructions: prescription.instructions ? safeDecrypt(prescription.instructions) : "",
    signed: false,
    pharmacyQrPng,
    councilComplianceLine: isDentistSpecialty(pro.specialty)
      ? (lang === "en"
        ? "Issued per CFO Resolution 278/2025 and applicable dental practice regulations."
        : lang === "es"
          ? "Documento emitido conforme Resolucion CFO 278/2025 y normativa odontologica vigente."
          : "Documento emitido conforme Resolucao CFO 278/2025 e normas vigentes do exercicio odontologico.")
      : null,
    cannabisComplianceLine,
  });

  return new NextResponse(new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receita-${prescription.id.slice(0, 8)}.pdf"`,
    },
  });
}
