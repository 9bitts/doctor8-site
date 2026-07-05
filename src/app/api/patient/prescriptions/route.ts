// src/app/api/patient/prescriptions/route.ts
// Lists the prescriptions that belong to the logged-in patient.

import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

const EXPIRING_DAYS = 7;

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { patientProfileId } = ctx;

  const prescriptions = await db.prescription.findMany({
    where: { document: { patientId: patientProfileId } },
    include: {
      professional: { select: { firstName: true, lastName: true, specialty: true } },
      integrativeTherapist: { select: { firstName: true, lastName: true, trainingInstitution: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const now = new Date();
  const soon = new Date(now.getTime() + EXPIRING_DAYS * 24 * 60 * 60 * 1000);

  const decoded = prescriptions.map((p) => {
    const validUntil = p.validUntil ? new Date(p.validUntil) : null;
    const isExpired = validUntil ? validUntil < now : false;
    const isExpiringSoon = validUntil ? !isExpired && validUntil <= soon : false;

    return {
      id: p.id,
      createdAt: p.createdAt,
      validUntil: p.validUntil,
      medications: p.medications,
      instructions: p.instructions ? safeDecrypt(p.instructions) : "",
      signatureStatus: p.signatureStatus,
      signedAt: p.signedAt,
      hasSignedPdf: p.signatureStatus === "SIGNED" && !!p.signedFileUrl,
      isExpired,
      isExpiringSoon,
      whatsappNotifyStatus: p.whatsappNotifyStatus,
      doctor: p.professional
        ? {
            name: `${p.professional.firstName} ${p.professional.lastName}`.trim(),
            specialty: p.professional.specialty || "",
          }
        : p.integrativeTherapist
          ? {
              name: `${p.integrativeTherapist.firstName} ${p.integrativeTherapist.lastName}`.trim(),
              specialty: "Fitoterapia",
            }
          : { name: "—", specialty: "" },
    };
  });

  return NextResponse.json({ prescriptions: decoded });
}
