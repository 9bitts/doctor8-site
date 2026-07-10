import { NextRequest, NextResponse } from "next/server";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import { createChartShare, resolveChartAccess } from "@/lib/chart-access";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { z } from "zod";

const schema = z.object({
  targetType: z.enum(["colleague", "clinic"]),
  colleagueId: z.string().optional(),
  permission: z.enum(["VIEW", "EDIT"]).default("VIEW"),
}).refine(
  (d) => d.targetType !== "colleague" || !!d.colleagueId,
  { message: "colleagueId required" },
);

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const access = await resolveChartAccess(professional.id, params.id);
  if (!access || access.level !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const shares = await db.patientRecordShare.findMany({
    where: { patientRecordId: params.id, revokedAt: null },
    include: {
      sharedWithProfessional: { select: { firstName: true, lastName: true, specialty: true } },
      clinic: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    shares: shares.map((s) => ({
      id: s.id,
      permission: s.permission,
      createdAt: s.createdAt.toISOString(),
      colleague: s.sharedWithProfessional
        ? {
            name: `Dr. ${s.sharedWithProfessional.firstName} ${s.sharedWithProfessional.lastName}`,
            specialty: s.sharedWithProfessional.specialty,
          }
        : null,
      clinic: s.clinic ? { id: s.clinic.id, name: s.clinic.name } : null,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await resolveChartAccess(professional.id, params.id);
  if (!access || access.level !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let target;
  if (parsed.data.targetType === "colleague") {
    target = { type: "colleague" as const, professionalId: parsed.data.colleagueId! };
  } else {
    const membership = await db.clinicMember.findFirst({
      where: { professionalId: professional.id },
    });
    if (!membership) {
      return NextResponse.json({ error: "NO_CLINIC" }, { status: 400 });
    }
    target = { type: "clinic" as const, clinicId: membership.clinicId };
  }

  const result = await createChartShare({
    recordId: params.id,
    ownerProfessionalId: professional.id,
    target,
    permission: parsed.data.permission,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await audit.shareRecord(session.user.id, params.id, {
    shareId: result.id,
    targetType: parsed.data.targetType,
    permission: parsed.data.permission,
  });

  if (parsed.data.targetType === "colleague" && parsed.data.colleagueId) {
    const colleague = await db.professionalProfile.findUnique({
      where: { id: parsed.data.colleagueId },
      select: { userId: true },
    });
    if (colleague?.userId) {
      const ownerName = `${professional.firstName} ${professional.lastName}`.trim();
      const shareCopy = storedNotificationText("notif.chartShare.title", "notif.chartShare.body", {
        name: `Dr. ${ownerName}`,
      });
      await createNotification({
        userId: colleague.userId,
        title: shareCopy.title,
        body: shareCopy.body,
        type: "shared_record",
        data: {
          patientRecordId: params.id,
          permission: parsed.data.permission,
          titleKey: "notif.chartShare.title",
          bodyKey: "notif.chartShare.body",
          bodyParams: { name: `Dr. ${ownerName}` },
        },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ shareId: result.id });
}
