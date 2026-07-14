import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { audit } from "@/lib/audit";
import { buildPrescriptionPdf, type Lang } from "@/lib/prescription-pdf";
import { enrichMedsForPrescriptionPdf } from "@/lib/medicina-natural-catalog/enrich-meds-for-pdf";
import { resolveRequestLang } from "@/lib/sign-helpers";

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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const prescription = await db.prescription.findUnique({
    where: { id: params.id },
    include: {
      integrativeTherapist: true,
      document: {
        include: {
          patient: {
            select: {
              firstName: true, lastName: true, dateOfBirth: true, cpf: true,
              addressLine1: true, city: true, state: true, country: true, zipCode: true,
            },
          },
          integrativeClientRecord: {
            select: {
              firstName: true, lastName: true, dateOfBirth: true, email: true,
            },
          },
        },
      },
    },
  });

  if (!prescription?.integrativeTherapist) return new NextResponse("Not found", { status: 404 });

  const isTherapist = prescription.integrativeTherapist.userId === session.user.id;
  const isPatient = prescription.document?.patientId &&
    (await db.patientProfile.findFirst({
      where: { userId: session.user.id, id: prescription.document.patientId },
    }));
  if (!isTherapist && !isPatient && session.user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  await audit.viewRecord(session.user.id, "Prescription", prescription.id);

  const viewer = await db.user.findUnique({
    where: { id: session.user.id }, select: { language: true },
  });
  const lang = resolveRequestLang(req, viewer?.language) as Lang;
  const locale = LOCALE[lang];

  const client = prescription.document?.integrativeClientRecord;
  const acc = prescription.document?.patient;
  const srcP = client || acc;

  let patientName = "—";
  let patientDob: Date | null = null;
  let patientCpf = "";
  if (srcP) {
    patientName = `${safeDecrypt(srcP.firstName)} ${safeDecrypt(srcP.lastName)}`.trim();
    if (srcP.dateOfBirth) {
      const dobRaw = safeDecrypt(srcP.dateOfBirth);
      patientDob = dobRaw ? new Date(dobRaw) : null;
    }
    patientCpf = safeDecrypt((srcP as { cpf?: string | null }).cpf ?? null);
  }

  const therapist = prescription.integrativeTherapist;
  const clinicAddressFull = joinAddress([
    therapist.clinicName,
    therapist.clinicAddress,
    therapist.clinicCity,
    therapist.clinicState,
    therapist.clinicZip,
  ]);

  const meds = await enrichMedsForPrescriptionPdf(
    (prescription.medications as {
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
    }[]).map((m) => {
      const isContinuous = m.continuousUse || m.frequency === "Continuous use";
      return {
        ...m,
        frequency: isContinuous ? "" : (FREQ[lang][m.frequency] || m.frequency),
        duration: isContinuous ? CONTINUOUS_DURATION[lang] : m.duration,
      };
    }),
    lang,
  );

  const today = new Date().toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  const validUntil = prescription.validUntil
    ? new Date(prescription.validUntil).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })
    : (lang === "pt" ? "Sem validade" : lang === "es" ? "Sin caducidad" : "No expiry");

  const pdfBytes = await buildPrescriptionPdf({
    lang,
    proFirstName: therapist.firstName,
    proLastName: therapist.lastName,
    proSpecialty: "Terapeuta Integrativo — Fitoterapia",
    proLicense: therapist.trainingInstitution || "",
    clinicAddressFull,
    patientName,
    patientAge: computeAge(patientDob),
    patientCpf,
    patientAddressFull: "",
    prescriptionId: prescription.id,
    todayText: today,
    validUntilText: validUntil,
    medications: meds,
    instructions: prescription.instructions ? safeDecrypt(prescription.instructions) : "",
    signed: false,
  });

  return new NextResponse(new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="prescricao-fitoterapica-${prescription.id.slice(0, 8)}.pdf"`,
    },
  });
}
