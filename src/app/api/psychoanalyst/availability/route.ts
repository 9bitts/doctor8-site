import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePsychoanalyst } from "@/lib/psychoanalyst-api";

export async function GET() {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const slots = await db.psychoanalystAvailabilitySlot.findMany({
    where: { psychoanalystId: psychoanalyst.id, isActive: true },
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
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const { slots } = await req.json();

  await db.$transaction([
    db.psychoanalystAvailabilitySlot.deleteMany({ where: { psychoanalystId: psychoanalyst.id } }),
    db.psychoanalystAvailabilitySlot.createMany({
      data: slots.map((s: { dayOfWeek: number; startTime: string; endTime: string; slotDuration: number; slotGap?: number }) => ({
        psychoanalystId: psychoanalyst.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        slotDurationMins: s.slotDuration || psychoanalyst.sessionDurationMins || 50,
        slotGapMins: s.slotGap ?? 0,
        isActive: true,
      })),
    }),
  ]);

  return NextResponse.json({ success: true });
}
