// ADMIN ONLY - save admin observation and reviewed flag on patient.
import { NextRequest, NextResponse } from "next/server";
import { getPatientAdminSession } from "@/lib/admin";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { AuditAction } from "@prisma/client";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  adminNote: z.string().max(5000).optional(),
  reviewed: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getPatientAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await db.patientProfile.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const adminId = session.user.id;
  const data: {
    adminNote?: string | null;
    adminReviewedAt?: Date | null;
    adminReviewedById?: string | null;
  } = {};

  if (parsed.data.adminNote !== undefined) {
    data.adminNote = parsed.data.adminNote.trim() || null;
  }

  if (parsed.data.reviewed !== undefined) {
    if (parsed.data.reviewed) {
      data.adminReviewedAt = now;
      data.adminReviewedById = adminId;
    } else {
      data.adminReviewedAt = null;
      data.adminReviewedById = null;
    }
  }

  const updated = await db.patientProfile.update({
    where: { id: params.id },
    data,
    select: {
      adminNote: true,
      adminReviewedAt: true,
      adminReviewedById: true,
    },
  });

  await createAuditLog({
    userId: adminId,
    action: AuditAction.UPDATE_RECORD,
    resource: "PatientProfile",
    resourceId: profile.id,
    details: {
      adminAction: "patient_review",
      reviewed: parsed.data.reviewed,
      hasNote: Boolean(parsed.data.adminNote?.trim()),
    },
  });

  return NextResponse.json({
    adminNote: updated.adminNote,
    adminReviewedAt: updated.adminReviewedAt?.toISOString() ?? null,
    adminReviewedById: updated.adminReviewedById,
  });
}
