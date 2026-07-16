import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { createAuditLog } from "@/lib/audit";
import {
  adminCloseStaleConsult,
  adminForceReleaseVolunteer,
  adminMarkEntryProblem,
  adminRemoveFromQueue,
  adminRepositionInQueue,
} from "@/lib/humanitarian/admin-queue";
import { AuditAction } from "@prisma/client";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("remove"),
    entryId: z.string().min(1),
    reason: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal("reposition"),
    entryId: z.string().min(1),
    position: z.number().int().min(1).max(500),
  }),
  z.object({
    action: z.literal("mark_problem"),
    entryId: z.string().min(1),
    note: z.string().min(3).max(2000),
  }),
  z.object({
    action: z.literal("release_volunteer"),
    volunteerId: z.string().min(1),
  }),
  z.object({
    action: z.literal("close_stale"),
    entryId: z.string().min(1),
    reason: z.string().min(3).max(2000).optional(),
  }),
]);

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const adminId = session.user.id;
  const data = parsed.data;

  if (data.action === "remove") {
    const result = await adminRemoveFromQueue(data.entryId, adminId, data.reason);
    if (!result) {
      return NextResponse.json({ error: "Cannot remove — entry not in queue" }, { status: 409 });
    }
    await createAuditLog({
      userId: adminId,
      action: AuditAction.DELETE_RECORD,
      resource: "HumanitarianQueueEntry",
      resourceId: data.entryId,
      details: { adminAction: "remove_from_queue", reason: data.reason, source: "command_center" },
    });
    return NextResponse.json({ success: true });
  }

  if (data.action === "reposition") {
    const ok = await adminRepositionInQueue(data.entryId, data.position);
    if (!ok) {
      return NextResponse.json({ error: "Cannot reposition — entry must be WAITING" }, { status: 409 });
    }
    await createAuditLog({
      userId: adminId,
      action: AuditAction.UPDATE_RECORD,
      resource: "HumanitarianQueueEntry",
      resourceId: data.entryId,
      details: {
        adminAction: "reposition_queue",
        position: data.position,
        source: "command_center",
      },
    });
    return NextResponse.json({ success: true });
  }

  if (data.action === "mark_problem") {
    const ok = await adminMarkEntryProblem(data.entryId, adminId, data.note);
    if (!ok) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    await createAuditLog({
      userId: adminId,
      action: AuditAction.UPDATE_RECORD,
      resource: "HumanitarianQueueEntry",
      resourceId: data.entryId,
      details: { adminAction: "mark_problem", note: data.note, source: "command_center" },
    });
    return NextResponse.json({ success: true });
  }

  if (data.action === "release_volunteer") {
    const ok = await adminForceReleaseVolunteer(data.volunteerId);
    if (!ok) return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });
    await createAuditLog({
      userId: adminId,
      action: AuditAction.UPDATE_RECORD,
      resource: "HumanitarianVolunteer",
      resourceId: data.volunteerId,
      details: { adminAction: "force_release_volunteer", source: "command_center" },
    });
    return NextResponse.json({ success: true });
  }

  if (data.action === "close_stale") {
    const reason = data.reason || "Admin closed stale consultation";
    const ok = await adminCloseStaleConsult(data.entryId, adminId, reason);
    if (!ok) {
      return NextResponse.json({ error: "Cannot close — entry not IN_PROGRESS" }, { status: 409 });
    }
    await createAuditLog({
      userId: adminId,
      action: AuditAction.UPDATE_RECORD,
      resource: "HumanitarianQueueEntry",
      resourceId: data.entryId,
      details: { adminAction: "close_stale_consult", reason, source: "command_center" },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
