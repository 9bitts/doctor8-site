// GET pending + accepted links for the patient.
// POST: patient requests a consent link with a professional account.
import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { linkDb } from "@/lib/patient-professional-link-db";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { z } from "zod";

const postSchema = z.object({
  professionalUserId: z.string().min(1),
});

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const links = await linkDb().findMany({
    where: {
      patientUserId: ctx.userId,
      status: { in: ["PENDING", "ACCEPTED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const proUserIds = [...new Set(links.map((l) => l.professionalUserId))];
  const pros = proUserIds.length
    ? await db.professionalProfile.findMany({
        where: { userId: { in: proUserIds } },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          licenseNumber: true,
          specialty: true,
        },
      })
    : [];
  const proByUserId = Object.fromEntries(pros.map((p) => [p.userId, p]));

  const rows = links.map((link) => {
    const pro = proByUserId[link.professionalUserId];
    return {
      id: link.id,
      status: link.status,
      requestedBy: link.requestedBy,
      createdAt: link.createdAt.toISOString(),
      professionalUserId: link.professionalUserId,
      professionalId: pro?.id ?? null,
      name: pro ? `Dr. ${pro.firstName} ${pro.lastName}`.trim() : "Doctor",
      licenseNumber: pro?.licenseNumber ?? null,
      specialty: pro?.specialty ?? null,
    };
  });

  return NextResponse.json({ links: rows });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { professionalUserId } = parsed.data;

  if (professionalUserId === ctx.userId) {
    return NextResponse.json({ error: "Invalid professional" }, { status: 400 });
  }

  const proUser = await db.user.findUnique({
    where: { id: professionalUserId },
    select: { role: true, deletedAt: true },
  });
  if (!proUser || proUser.role !== "PROFESSIONAL" || proUser.deletedAt) {
    return NextResponse.json({ error: "Professional not found" }, { status: 404 });
  }

  const pro = await db.professionalProfile.findUnique({
    where: { userId: professionalUserId },
    select: { id: true, verified: true, firstName: true, lastName: true },
  });
  if (!pro || !pro.verified) {
    return NextResponse.json({ error: "Professional not found" }, { status: 404 });
  }

  const existing = await linkDb().findUnique({
    where: {
      patientUserId_professionalUserId: {
        patientUserId: ctx.userId,
        professionalUserId,
      },
    },
  });

  if (existing && (existing.status === "PENDING" || existing.status === "ACCEPTED")) {
    return NextResponse.json({
      id: existing.id,
      status: existing.status,
      requestedBy: existing.requestedBy,
      professionalUserId: existing.professionalUserId,
      professionalId: pro.id,
    });
  }

  const link = existing
    ? await linkDb().update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          requestedBy: "PATIENT",
          respondedAt: null,
        },
      })
    : await linkDb().create({
        data: {
          patientUserId: ctx.userId,
          professionalUserId,
          status: "PENDING",
          requestedBy: "PATIENT",
        },
      });

  const patient = await db.patientProfile.findUnique({
    where: { userId: ctx.userId },
    select: { firstName: true, lastName: true },
  });
  const patientName =
    patient ? `${patient.firstName} ${patient.lastName}`.trim() || "A patient" : "A patient";

  const notifCopy = storedNotificationText(
    "notif.patientLinkRequest.title",
    "notif.patientLinkRequest.body",
    { name: patientName },
  );
  await createNotification({
    userId: professionalUserId,
    title: notifCopy.title,
    body: notifCopy.body,
    type: "system",
    data: {
      url: "/professional",
      linkId: link.id,
      kind: "patient_connection_request",
      titleKey: "notif.patientLinkRequest.title",
      bodyKey: "notif.patientLinkRequest.body",
      bodyParams: { name: patientName },
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    action: AuditAction.CREATE_RECORD,
    resource: "PatientProfessionalLink",
    resourceId: link.id,
    details: { professionalUserId, status: "PENDING", requestedBy: "PATIENT" },
  });

  return NextResponse.json(
    {
      id: link.id,
      status: link.status,
      requestedBy: link.requestedBy,
      professionalUserId: link.professionalUserId,
      professionalId: pro.id,
    },
    { status: existing ? 200 : 201 },
  );
}
