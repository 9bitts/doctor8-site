// GET: recent emissions from professionals without a known relationship.
// POST: report unknown professional, or accept connection after a known emission.
import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { emissionReportDb } from "@/lib/patient-professional-link-db";
import {
  acceptOrCreateEmissionLink,
  hasKnownProfessionalRelationship,
} from "@/lib/patient-professional-link";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  professionalUserId: z.string().min(1),
  resourceType: z.enum(["PRESCRIPTION", "EXAM_REQUEST", "DOCUMENT"]),
  resourceId: z.string().min(1),
  action: z.enum(["report", "accept"]).optional().default("report"),
});

async function assertRecentPrescriptionForPair(params: {
  patientProfileId: string;
  professionalUserId: string;
  resourceId: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const pro = await db.professionalProfile.findUnique({
    where: { userId: params.professionalUserId },
    select: { id: true },
  });
  if (!pro) {
    return { ok: false, status: 404, error: "Professional not found" };
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rx = await db.prescription.findFirst({
    where: {
      id: params.resourceId,
      professionalId: pro.id,
      createdAt: { gte: since },
      document: { patientId: params.patientProfileId },
    },
    select: { id: true },
  });
  if (!rx) {
    return { ok: false, status: 404, error: "Resource not found" };
  }
  return { ok: true };
}

async function assertRecentDocumentForPair(params: {
  patientProfileId: string;
  professionalUserId: string;
  resourceId: string;
  resourceType: "EXAM_REQUEST" | "DOCUMENT";
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const pro = await db.professionalProfile.findUnique({
    where: { userId: params.professionalUserId },
    select: { id: true },
  });
  if (!pro) {
    return { ok: false, status: 404, error: "Professional not found" };
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const doc = await db.medicalDocument.findFirst({
    where: {
      id: params.resourceId,
      professionalId: pro.id,
      patientId: params.patientProfileId,
      createdAt: { gte: since },
      ...(params.resourceType === "EXAM_REQUEST" ? { type: "EXAM_REQUEST" as const } : {}),
    },
    select: { id: true },
  });
  if (!doc) {
    return { ok: false, status: 404, error: "Resource not found" };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { professionalUserId, resourceType, resourceId, action } = parsed.data;

  if (resourceType === "PRESCRIPTION") {
    const check = await assertRecentPrescriptionForPair({
      patientProfileId: ctx.patientProfileId,
      professionalUserId,
      resourceId,
    });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }
  } else {
    const check = await assertRecentDocumentForPair({
      patientProfileId: ctx.patientProfileId,
      professionalUserId,
      resourceId,
      resourceType,
    });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }
  }

  if (action === "accept") {
    const link = await acceptOrCreateEmissionLink({
      patientUserId: ctx.userId,
      professionalUserId,
    });

    await createAuditLog({
      userId: ctx.userId,
      action: AuditAction.UPDATE_RECORD,
      resource: "PatientProfessionalLink",
      resourceId: link.id,
      details: {
        professionalUserId,
        status: "ACCEPTED",
        source: "emission_alert",
        resourceType,
        resourceId,
      },
    });

    return NextResponse.json({ id: link.id, status: link.status, accepted: true });
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

  await createAuditLog({
    userId: ctx.userId,
    action: AuditAction.CREATE_RECORD,
    resource: "ProfessionalEmissionReport",
    resourceId: report.id,
    details: { professionalUserId, resourceType, resourceId },
  });

  return NextResponse.json({ id: report.id, reported: true }, { status: 201 });
}

// GET: recent emissions from professionals without a known relationship (for patient UI).
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
    const known = await hasKnownProfessionalRelationship({
      patientUserId: ctx.userId,
      patientProfileId: ctx.patientProfileId,
      professionalUserId: proUserId,
    });
    if (known) continue;

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
