import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { medicationListHasIntegrativeItems } from "@/lib/integrative-medicine/integrative-prescription-utils";

function safeDecrypt(v: string): string {
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const prescriptions = await db.prescription.findMany({
    where: { professionalId: ctx.professional.id },
    include: {
      document: {
        include: {
          patient: { select: { firstName: true, lastName: true } },
          patientRecord: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const integrative = prescriptions
    .filter((p) => medicationListHasIntegrativeItems(p.medications))
    .slice(0, 6)
    .map((p) => {
      const fromRecord = p.document?.patientRecord;
      const fromProfile = p.document?.patient;
      let firstName = "";
      let lastName = "";
      if (fromRecord) {
        firstName = safeDecrypt(fromRecord.firstName);
        lastName = safeDecrypt(fromRecord.lastName);
      } else if (fromProfile) {
        firstName = safeDecrypt(fromProfile.firstName);
        lastName = safeDecrypt(fromProfile.lastName);
      }
      const meds = Array.isArray(p.medications) ? p.medications : [];
      return {
        id: p.id,
        createdAt: p.createdAt.toISOString(),
        patientName: [firstName, lastName].filter(Boolean).join(" ") || "—",
        itemCount: meds.length,
      };
    });

  return NextResponse.json({ prescriptions: integrative });
}
