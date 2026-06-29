// src/app/api/notifications/route.ts
// GET   — list recent notifications + unread count for the bell
// PATCH — mark notifications as read (all, or a specific one); chart-link ack/reject
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

export async function GET() {
  const ctx = await requireAuth();
  if (isApiError(ctx)) return ctx.error;

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.notification.count({
      where: { userId: ctx.userId, readAt: null },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

const patchSchema = z.object({
  id: z.string().optional(),
  action: z.enum(["ack", "reject"]).optional(),
});

function chartLinkData(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.kind === "chart_linked" || d.url === "/patient/providers") return d;
  return null;
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireAuth();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { id, action } = parsed.data;

  if (id && action) {
    const notification = await db.notification.findFirst({
      where: { id, userId: ctx.userId, readAt: null },
    });
    if (!notification) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const linkData = chartLinkData(notification.data);
    if (!linkData) {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    const now = new Date();
    const mergedData = {
      ...linkData,
      ...(action === "reject" ? { rejected: true, rejectedAt: now.toISOString() } : { acknowledged: true, acknowledgedAt: now.toISOString() }),
    };

    await db.notification.update({
      where: { id },
      data: { readAt: now, data: mergedData as never },
    });

    await createAuditLog({
      userId: ctx.userId,
      action: action === "reject" ? "UPDATE_RECORD" : "VIEW_RECORD",
      resource: "ChartLinkNotice",
      resourceId: id,
      details: {
        action,
        doctorName: linkData.doctorName,
        patientRecordId: linkData.patientRecordId,
        professionalId: linkData.professionalId,
      },
    });

    return NextResponse.json({ success: true, action });
  }

  if (id) {
    await db.notification.updateMany({
      where: { id, userId: ctx.userId, readAt: null },
      data: { readAt: new Date() },
    });
  } else {
    await db.notification.updateMany({
      where: { userId: ctx.userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  return NextResponse.json({ success: true });
}
