import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import {
  isWithinWhatsApp24hWindow,
  messagePreview,
} from "@/lib/admin/whatsapp-inbox";
import { loadPatientNamesByIds } from "@/lib/admin/whatsapp-patient-link";
import { db } from "@/lib/db";
import { formatPhoneDisplay } from "@/lib/phone";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(1, Number(sp.get("pageSize") || PAGE_SIZE)));
  const status = sp.get("status")?.trim() || "open";
  const assigned = sp.get("assigned")?.trim() || "all";
  const q = sp.get("q")?.trim() || "";

  const where: {
    status?: string;
    assignedToUserId?: string | null;
    OR?: Array<Record<string, unknown>>;
  } = {};

  if (status !== "all") {
    where.status = status;
  }

  if (assigned === "me") {
    where.assignedToUserId = session.user.id!;
  } else if (assigned === "unassigned") {
    where.assignedToUserId = null;
  }

  if (q) {
    const qDigits = q.replace(/\D/g, "");
    const orFilters: Array<Record<string, unknown>> = [
      { displayName: { contains: q, mode: "insensitive" } },
    ];
    if (qDigits.length >= 4) {
      orFilters.push({ waPhone: { contains: qDigits } });
    }
    where.OR = orFilters;
  }

  const [total, rows] = await Promise.all([
    db.whatsAppConversation.count({ where }),
    db.whatsAppConversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            body: true,
            type: true,
            direction: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  const patientIds = rows
    .map((r) => r.patientProfileId)
    .filter((id): id is string => Boolean(id));
  const patientNames = await loadPatientNamesByIds(patientIds);

  const assigneeIds = rows
    .map((r) => r.assignedToUserId)
    .filter((id): id is string => Boolean(id));
  const assignees = assigneeIds.length
    ? await db.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { id: true, email: true },
      })
    : [];
  const assigneeMap = new Map(
    assignees.map((u) => [u.id, u.email]),
  );

  let conversations = rows.map((row) => {
    const last = row.messages[0] ?? null;
    const patientName = row.patientProfileId
      ? patientNames.get(row.patientProfileId) ?? null
      : null;

    return {
      id: row.id,
      waPhone: row.waPhone,
      waPhoneDisplay: formatPhoneDisplay(row.waPhone),
      displayName: row.displayName,
      status: row.status,
      unreadCount: row.unreadCount,
      lastMessageAt: row.lastMessageAt.toISOString(),
      lastInboundAt: row.lastInboundAt?.toISOString() ?? null,
      within24hWindow: isWithinWhatsApp24hWindow(row.lastInboundAt),
      assignedToUserId: row.assignedToUserId,
      assignedToName: row.assignedToUserId
        ? assigneeMap.get(row.assignedToUserId) ?? null
        : null,
      patientProfileId: row.patientProfileId,
      patientName,
      lastMessage: last
        ? {
            body: messagePreview(last.body, last.type),
            type: last.type,
            direction: last.direction,
            createdAt: last.createdAt.toISOString(),
          }
        : null,
    };
  });

  if (q.length >= 2) {
    const needle = q.toLowerCase();
    conversations = conversations.filter((c) => {
      if (c.displayName?.toLowerCase().includes(needle)) return true;
      if (c.waPhone.includes(q.replace(/\D/g, ""))) return true;
      if (c.patientName?.toLowerCase().includes(needle)) return true;
      return false;
    });
  }

  return NextResponse.json({
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    conversations,
  });
}
