import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";

export async function GET() {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const slots = await db.integrativeTherapistAvailabilitySlot.findMany({
    where: { integrativeTherapistId: therapist.id, isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({
    slots: slots.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      slotDuration: s.slotDurationMins,
      slotGap: s.slotGapMins,
    })),
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const { slots } = await req.json();

  await db.$transaction([
    db.integrativeTherapistAvailabilitySlot.deleteMany({
      where: { integrativeTherapistId: therapist.id },
    }),
    db.integrativeTherapistAvailabilitySlot.createMany({
      data: slots.map(
        (s: {
          dayOfWeek: number;
          startTime: string;
          endTime: string;
          slotDuration: number;
          slotGap?: number;
        }) => ({
          integrativeTherapistId: therapist.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMins: s.slotDuration || therapist.sessionDurationMins || 50,
          slotGapMins: s.slotGap ?? 0,
          isActive: true,
        }),
      ),
    }),
  ]);

  return NextResponse.json({ success: true });
}
