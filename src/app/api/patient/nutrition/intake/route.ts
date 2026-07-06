import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { requirePatient, isApiError } from "@/lib/api-auth";

function safeDecrypt(v: string): string {
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const forms = await db.nutritionIntakeForm.findMany({
    where: {
      status: "PENDING",
      patientRecord: { linkedUserId: ctx.userId },
    },
    include: {
      professional: { select: { firstName: true, lastName: true } },
      patientRecord: { select: { id: true } },
    },
    orderBy: { sentAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    forms: forms.map((f) => ({
      id: f.id,
      chartId: f.patientRecordId,
      sentAt: f.sentAt.toISOString(),
      professionalName: `${safeDecrypt(f.professional.firstName)} ${safeDecrypt(f.professional.lastName)}`.trim(),
    })),
  });
}
