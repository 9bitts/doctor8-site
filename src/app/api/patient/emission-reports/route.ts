// POST: patient reports an unsolicited emission ("I don't know this professional").
import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { emissionReportDb } from "@/lib/patient-professional-link-db";
import { hasAcceptedLink } from "@/lib/patient-professional-link";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  professionalUserId: z.string().min(1),
  resourceType: z.enum(["PRESCRIPTION", "EXAM_REQUEST", "DOCUMENT"]),
  resourceId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { professionalUserId, resourceType, resourceId } = parsed.data;

  const pro = await db.professionalProfile.findUnique({
    where: { userId: professionalUserId },
    select: { id: true },
  });
  if (!pro) {
    return NextResponse.json({ error: "Professional not found" }, { status: 404 });
  }

  if (resourceType === "PRESCRIPTION") {
    const rx = await db.prescription.findFirst({
      where: {
        id: resourceId,
        professionalId: pro.id,
        document: { patientId: ctx.patientProfileId },
      },
      select: { id: true },
    });
    if (!rx) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
  }

  const existing = await emissionReportDb().findFirst({
    where: {
      patientUserId: ctx.userId,
      professionalUserId,
      resourceType,
      resourceId,
    },
  });
  if (existing) {
    return NextResponse.json({ id: existing.id, reported: true });
  }

  const report = await emissionReportDb().create({
    data: {
      patientUserId: ctx.userId,
      professionalUserId,
      resourceType,
      resourceId,
    },
  });

  console.log(
    "[PHI-EMISSION-REPORT]",
    JSON.stringify({
      patientUserId: ctx.userId,
      professionalUserId,
      resourceType,
      resourceId,
      at: new Date().toISOString(),
    }),
  );

  await createAuditLog({
    userId: ctx.userId,
    action: AuditAction.CREATE_RECORD,
    resource: "ProfessionalEmissionReport",
    resourceId: report.id,
    details: { professionalUserId, resourceType, resourceId },
  });

  return NextResponse.json({ id: report.id, reported: true }, { status: 201 });
}

// GET: recent emissions from professionals without accepted link (for patient UI).
export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const prescriptions = await db.prescription.findMany({
    where: {
      createdAt: { gte: since },
      document: { patientId: ctx.patientProfileId },
    },
    include: {
      professional: {
        select: { userId: true, firstName: true, lastName: true, licenseNumber: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const alerts = [];
  for (const rx of prescriptions) {
    if (!rx.professional) continue;
    const proUserId = rx.professional.userId;
    const linked = await hasAcceptedLink(ctx.userId, proUserId);
    if (linked) continue;

    const alreadyReported = await emissionReportDb().findFirst({
      where: {
        patientUserId: ctx.userId,
        professionalUserId: proUserId,
        resourceType: "PRESCRIPTION",
        resourceId: rx.id,
      },
    });
    if (alreadyReported) continue;

    alerts.push({
      resourceType: "PRESCRIPTION" as const,
      resourceId: rx.id,
      professionalUserId: proUserId,
      professionalName: `Dr. ${rx.professional.firstName} ${rx.professional.lastName}`.trim(),
      licenseNumber: rx.professional.licenseNumber,
      createdAt: rx.createdAt.toISOString(),
    });
  }

  return NextResponse.json({ alerts });
}
