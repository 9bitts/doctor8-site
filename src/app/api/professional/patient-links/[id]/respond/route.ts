// POST: professional accepts or rejects a patient-initiated connection request.
import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { linkDb } from "@/lib/patient-professional-link-db";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import {
  releaseHeldSharesForPair,
  revokeHeldSharesForPair,
} from "@/lib/held-shared-records";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { patientChartPathForSpecialty } from "@/lib/patient-chart-path";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["accept", "reject"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const link = await linkDb().findUnique({ where: { id: params.id } });
  if (!link || link.professionalUserId !== ctx.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (link.requestedBy !== "PATIENT") {
    return NextResponse.json(
      { error: "Only patient-initiated requests can be answered here" },
      { status: 400 },
    );
  }

  if (link.status !== "PENDING") {
    return NextResponse.json({ id: link.id, status: link.status });
  }

  const newStatus = parsed.data.action === "accept" ? "ACCEPTED" : "REJECTED";
  const updated = await linkDb().update({
    where: { id: link.id },
    data: {
      status: newStatus,
      respondedAt: new Date(),
    },
  });

  const pro = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
    select: { id: true, specialty: true, firstName: true, lastName: true },
  });

  let released = 0;
  let chartId: string | null = null;
  if (pro) {
    if (parsed.data.action === "accept") {
      const release = await releaseHeldSharesForPair({
        patientUserId: link.patientUserId,
        professionalId: pro.id,
        professionalUserId: ctx.userId,
        specialty: pro.specialty,
      });
      released = release.released;
      chartId = release.chartId;
    } else {
      await revokeHeldSharesForPair({
        patientUserId: link.patientUserId,
        professionalId: pro.id,
      });
    }
  }

  const drName = pro ? `Dr. ${pro.firstName} ${pro.lastName}`.trim() : "Doctor";
  const accept = parsed.data.action === "accept";
  const notifCopy = storedNotificationText(
    accept ? "notif.proLinkAccepted.title" : "notif.proLinkRejected.title",
    accept ? "notif.proLinkAccepted.body" : "notif.proLinkRejected.body",
    { name: drName },
  );
  await createNotification({
    userId: link.patientUserId,
    title: notifCopy.title,
    body: notifCopy.body,
    type: "system",
    data: {
      url: "/patient/providers",
      linkId: link.id,
      kind: accept ? "professional_accepted_link" : "professional_rejected_link",
      titleKey: accept ? "notif.proLinkAccepted.title" : "notif.proLinkRejected.title",
      bodyKey: accept ? "notif.proLinkAccepted.body" : "notif.proLinkRejected.body",
      bodyParams: { name: drName },
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    action: AuditAction.UPDATE_RECORD,
    resource: "PatientProfessionalLink",
    resourceId: link.id,
    details: { status: newStatus, respondedBy: "PROFESSIONAL" },
  });

  const documentsUrl =
    accept && released > 0
      ? chartId
        ? patientChartPathForSpecialty(pro?.specialty ?? null, chartId)
        : "/professional/shared"
      : null;

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    released,
    chartId,
    documentsUrl,
  });
}
