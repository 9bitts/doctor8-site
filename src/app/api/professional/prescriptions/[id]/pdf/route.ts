// src/app/api/professional/prescriptions/[id]/pdf/route.ts
// Serve o PDF da receita:
//   - Se já assinada (signatureStatus=SIGNED): baixa o PDF ASSINADO do S3 e serve.
//   - Caso contrário: gera o PDF REAL (pdf-lib) na hora e serve (não assinado).
//
// Substitui a versão antiga que devolvia HTML + window.print().
// A resolução de paciente / idioma / descriptografia / CFM continua aqui.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { audit } from "@/lib/audit";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { buildPrescriptionPdf, type Lang } from "@/lib/prescription-pdf";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET || "doctor8-files-prod";

function normLang(v: string | null | undefined): Lang {
  if (v === "pt" || v === "es") return v;
  return "en";
}
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
const LOCALE: Record<Lang, string> = { en: "en-US", pt: "pt-BR", es: "es-ES" };

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const prescription = await db.prescription.findUnique({
    where: { id: params.id },
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
              firstName: true, lastName: true, dateOfBirth: true, cpf: true,
              addressLine1: true, city: true, state: true, country: true, zipCode: true,
            },
          },
        },
      },
    },
  });

  if (!prescription) return new NextResponse("Not found", { status: 404 });

  // Access control
  const isProfessional = prescription.professional.userId === session.user.id;
  const isPatient = prescription.document?.patientId &&
    (await db.patientProfile.findFirst({
      where: { userId: session.user.id, id: prescription.document.patientId },
    }));
  if (!isProfessional && !isPatient && session.user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  await audit.viewRecord(session.user.id, "Prescription", prescription.id);

  // ── Se já está assinada, serve o PDF ASSINADO do S3 ──
  if (prescription.signatureStatus === "SIGNED" && prescription.signedFileUrl) {
    try {
      const obj = await s3.send(new GetObjectCommand({
        Bucket: BUCKET, Key: prescription.signedFileUrl,
      }));
      const buf = await streamToBuffer(obj.Body as any);
      return new NextResponse(new Blob([new Uint8Array(buf)], { type: "application/pdf" }), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="receita-${prescription.id.slice(0, 8)}-assinada.pdf"`,
        },
      });
    } catch {
      // Se falhar o S3, cai para gerar o PDF não assinado abaixo.
    }
  }

  // ── Gera o PDF real (não assinado) ──
  const viewer = await db.user.findUnique({
    where: { id: session.user.id }, select: { language: true },
  });
  const lang = normLang(viewer?.language);
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
  const clinicAddressFull = joinAddress([
    (pro as { clinicName?: string | null }).clinicName,
    (pro as { clinicAddress?: string | null }).clinicAddress,
    (pro as { clinicCity?: string | null }).clinicCity,
    (pro as { clinicState?: string | null }).clinicState,
    (pro as { clinicZip?: string | null }).clinicZip,
  ]);

  const meds = (prescription.medications as {
    name: string; dosage: string; frequency: string; duration?: string; instructions?: string;
  }[]).map((m) => ({ ...m, frequency: FREQ[lang][m.frequency] || m.frequency }));

  const today = new Date().toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  const validUntil = prescription.validUntil
    ? new Date(prescription.validUntil).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })
    : (lang === "pt" ? "Sem validade" : lang === "es" ? "Sin caducidad" : "No expiry");

  const pdfBytes = await buildPrescriptionPdf({
    lang,
    proFirstName: pro.firstName, proLastName: pro.lastName,
    proSpecialty: pro.specialty, proLicense: pro.licenseNumber,
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
  });

  return new NextResponse(new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receita-${prescription.id.slice(0, 8)}.pdf"`,
    },
  });
}
