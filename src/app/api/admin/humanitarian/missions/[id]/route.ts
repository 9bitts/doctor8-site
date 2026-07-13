import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { syncMissionCapacityStatus } from "@/lib/humanitarian/angel-missions";

const patchSchema = z.object({
  action: z.enum(["publish", "close", "cancel", "complete", "update"]).optional(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  isRemote: z.boolean().optional(),
  location: z.string().max(500).nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  requiresVehicle: z.boolean().optional(),
  requiredLanguages: z.array(z.string().max(20)).optional(),
  estimatedMinutes: z.number().int().min(15).max(24 * 60).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const mission = await db.angelMission.findUnique({ where: { id } });
  if (!mission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (parsed.data.action === "publish") {
    if (mission.type === "TURNO" && !mission.startsAt && !parsed.data.startsAt) {
      return NextResponse.json({ error: "startsAt required to publish TURNO" }, { status: 400 });
    }
    data.status = "OPEN";
  } else if (parsed.data.action === "close") {
    data.status = "CLOSED";
  } else if (parsed.data.action === "cancel") {
    data.status = "CANCELLED";
  } else if (parsed.data.action === "complete") {
    data.status = "COMPLETED";
  }

  if (parsed.data.title !== undefined) data.title = parsed.data.title.trim();
  if (parsed.data.description !== undefined) data.description = parsed.data.description.trim();
  if (parsed.data.isRemote !== undefined) data.isRemote = parsed.data.isRemote;
  if (parsed.data.location !== undefined) data.location = parsed.data.location;
  if (parsed.data.startsAt !== undefined) {
    data.startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null;
  }
  if (parsed.data.endsAt !== undefined) {
    data.endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
  }
  if (parsed.data.capacity !== undefined) data.capacity = parsed.data.capacity;
  if (parsed.data.requiresVehicle !== undefined) data.requiresVehicle = parsed.data.requiresVehicle;
  if (parsed.data.requiredLanguages !== undefined) data.requiredLanguages = parsed.data.requiredLanguages;
  if (parsed.data.estimatedMinutes !== undefined) data.estimatedMinutes = parsed.data.estimatedMinutes;

  const updated = await db.angelMission.update({
    where: { id },
    data,
  });

  if (updated.status === "OPEN" || updated.status === "FULL") {
    await syncMissionCapacityStatus(id);
  }

  return NextResponse.json({ success: true, status: updated.status });
}
