// POST: professional requests a consent link with a patient account.
import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { linkDb } from "@/lib/patient-professional-link-db";
import { createNotification } from "@/lib/notifications";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { countHeldSharesForPair } from "@/lib/held-shared-records";

const schema = z.object({
  patientUserId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { patientUserId } = parsed.data;

  if (patientUserId === ctx.userId) {
    return NextResponse.json({ error: "Invalid patient" }, { status: 400 });
  }

  const patientUser = await db.user.findUnique({
    where: { id: patientUserId },
    select: { role: true, deletedAt: true },
  });
  if (!patientUser || patientUser.role !== "PATIENT" || patientUser.deletedAt) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const existing = await linkDb().findUnique({
    where: {
      patientUserId_professionalUserId: {
        patientUserId,
        professionalUserId: ctx.userId,
      },
    },
  });

  if (existing && (existing.status === "PENDING" || existing.status === "ACCEPTED")) {
    return NextResponse.json({
      id: existing.id,
      status: existing.status,
      patientUserId: existing.patientUserId,
    });
  }

  const link = existing
    ? await linkDb().update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          requestedBy: "PROFESSIONAL",
          respondedAt: null,
        },
      })
    : await linkDb().create({
        data: {
          patientUserId,
          professionalUserId: ctx.userId,
          status: "PENDING",
          requestedBy: "PROFESSIONAL",
        },
      });

  const pro = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
    select: { firstName: true, lastName: true, licenseNumber: true },
  });

  const drName = pro ? `Dr. ${pro.firstName} ${pro.lastName}`.trim() : "Doctor";
  const reg = pro?.licenseNumber ? ` (${pro.licenseNumber})` : "";

  await createNotification({
    userId: patientUserId,
    title: "Connection request",
    body: `${drName}${reg} wants to connect to send prescriptions and documents.`,
    type: "system",
    data: { url: "/patient/providers", linkId: link.id },
  });

  await createAuditLog({
    userId: ctx.userId,
    action: AuditAction.CREATE_RECORD,
    resource: "PatientProfessionalLink",
    resourceId: link.id,
    details: { patientUserId, status: "PENDING" },
  });

  return NextResponse.json({
    id: link.id,
    status: link.status,
    patientUserId: link.patientUserId,
  }, { status: existing ? 200 : 201 });
}

export async function GET(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const patientUserId = req.nextUrl.searchParams.get("patientUserId");
  const status = req.nextUrl.searchParams.get("status");
  const requestedBy = req.nextUrl.searchParams.get("requestedBy");

  // Incoming patient connection requests (banner inbox).
  if (status === "PENDING" && requestedBy === "PATIENT") {
    const links = await linkDb().findMany({
      where: {
        professionalUserId: ctx.userId,
        status: "PENDING",
        requestedBy: "PATIENT",
      },
      orderBy: { createdAt: "desc" },
    });

    const patientUserIds = [...new Set(links.map((l) => l.patientUserId))];
    const patients = patientUserIds.length
      ? await db.patientProfile.findMany({
          where: { userId: { in: patientUserIds } },
          select: { userId: true, firstName: true, lastName: true },
        })
      : [];
    const patientByUser = Object.fromEntries(patients.map((p) => [p.userId, p]));

    const rows = await Promise.all(
      links.map(async (link) => {
        const p = patientByUser[link.patientUserId];
        const heldDocs = await countHeldSharesForPair({
          patientUserId: link.patientUserId,
          professionalId: ctx.professional.id,
        });
        return {
          id: link.id,
          status: link.status,
          requestedBy: link.requestedBy,
          createdAt: link.createdAt.toISOString(),
          patientUserId: link.patientUserId,
          patientName: p
            ? `${p.firstName} ${p.lastName}`.trim() || "Patient"
            : "Patient",
          heldDocumentCount: heldDocs,
        };
      }),
    );

    return NextResponse.json({ links: rows });
  }

  if (!patientUserId) {
    return NextResponse.json({ links: [] });
  }

  const link = await linkDb().findUnique({
    where: {
      patientUserId_professionalUserId: {
        patientUserId,
        professionalUserId: ctx.userId,
      },
    },
  });

  return NextResponse.json({
    link: link
      ? { id: link.id, status: link.status, patientUserId: link.patientUserId }
      : null,
  });
}
