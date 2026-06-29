import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { safeDecrypt } from "@/lib/sign-helpers";

export type PatientProviderRow = {
  chartId: string;
  providerType: "MEDICAL" | "PSYCHOANALYST" | "INTEGRATIVE";
  providerId: string;
  name: string;
  specialty: string | null;
  lastUpdated: string;
};

/** All providers linked to the patient account across chart types. */
export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const userId = ctx.userId;

  const [medical, psycho, integrative] = await Promise.all([
    db.patientRecord.findMany({
      where: { linkedUserId: userId },
      include: {
        professional: {
          select: { id: true, firstName: true, lastName: true, specialty: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.analysandRecord.findMany({
      where: { linkedUserId: userId },
      include: {
        psychoanalyst: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.integrativeClientRecord.findMany({
      where: { linkedUserId: userId },
      include: {
        integrativeTherapist: {
          select: { id: true, firstName: true, lastName: true, mainPractice: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const providers: PatientProviderRow[] = [];

  for (const r of medical) {
    if (!r.professional) continue;
    providers.push({
      chartId: r.id,
      providerType: "MEDICAL",
      providerId: r.professional.id,
      name: `Dr. ${r.professional.firstName} ${r.professional.lastName}`.trim(),
      specialty: r.professional.specialty || null,
      lastUpdated: r.updatedAt.toISOString(),
    });
  }

  for (const r of psycho) {
    if (!r.psychoanalyst) continue;
    const p = r.psychoanalyst;
    providers.push({
      chartId: r.id,
      providerType: "PSYCHOANALYST",
      providerId: p.id,
      name: `${safeDecrypt(p.firstName)} ${safeDecrypt(p.lastName)}`.trim(),
      specialty: null,
      lastUpdated: r.updatedAt.toISOString(),
    });
  }

  for (const r of integrative) {
    if (!r.integrativeTherapist) continue;
    const p = r.integrativeTherapist;
    providers.push({
      chartId: r.id,
      providerType: "INTEGRATIVE",
      providerId: p.id,
      name: `${safeDecrypt(p.firstName)} ${safeDecrypt(p.lastName)}`.trim(),
      specialty: p.mainPractice || null,
      lastUpdated: r.updatedAt.toISOString(),
    });
  }

  providers.sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
  );

  return NextResponse.json({ providers });
}
