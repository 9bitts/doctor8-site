import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { AuditAction } from "@prisma/client";

const patchSchema = z.object({
  status: z.enum(["open", "closed"]).optional(),
  assignedToUserId: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.whatsAppConversation.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, assignedToUserId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: {
    status?: string;
    assignedToUserId?: string | null;
  } = {};

  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status;
  }
  if (parsed.data.assignedToUserId !== undefined) {
    data.assignedToUserId = parsed.data.assignedToUserId;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const updated = await db.whatsAppConversation.update({
    where: { id: params.id },
    data,
    select: {
      id: true,
      status: true,
      assignedToUserId: true,
      lastMessageAt: true,
      lastInboundAt: true,
      unreadCount: true,
      waPhone: true,
      displayName: true,
      patientProfileId: true,
    },
  });

  await createAuditLog({
    userId: session.user.id!,
    action: AuditAction.UPDATE_RECORD,
    resource: "WhatsAppConversation",
    resourceId: updated.id,
    details: {
      action: parsed.data.status !== undefined ? "whatsapp_status" : "whatsapp_assign",
      status: parsed.data.status,
      assignedToUserId: parsed.data.assignedToUserId ?? undefined,
    },
  });

  return NextResponse.json({ conversation: updated });
}
