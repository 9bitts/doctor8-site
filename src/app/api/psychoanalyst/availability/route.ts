import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePsychoanalyst } from "@/lib/psychoanalyst-api";
import { validateAvailabilityBlocks } from "@/lib/availability-validation";
import { isAcuraVolunteerProvider } from "@/lib/acura-volunteer";

export async function GET() {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const slots = await db.psychoanalystAvailabilitySlot.findMany({
    where: { psychoanalystId: psychoanalyst.id, isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({
    acuraVolunteer: psychoanalyst.acuraVolunteer,
    badgeVisible: isAcuraVolunteerProvider(psychoanalyst.verified, psychoanalyst.acuraVolunteer),
    slots: slots.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      slotDuration: s.slotDurationMins,
      slotGap: s.slotGapMins,
      volunteerOnly: s.volunteerOnly,
    })),
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const { slots } = await req.json();

  const normalized = (slots as {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDuration: number;
    slotGap?: number;
    volunteerOnly?: boolean;
  }[]).map((s) => ({
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    volunteerOnly: !!s.volunteerOnly,
  }));

  const overlapKey = validateAvailabilityBlocks(normalized);
  if (overlapKey) {
    return NextResponse.json({ error: overlapKey }, { status: 400 });
  }

  const hasVolunteerBlocks = normalized.some((s) => s.volunteerOnly);
  if (hasVolunteerBlocks && !isAcuraVolunteerProvider(psychoanalyst.verified, psychoanalyst.acuraVolunteer)) {
    return NextResponse.json({ error: "acura_volunteer_required" }, { status: 403 });
  }

  await db.$transaction([
    db.psychoanalystAvailabilitySlot.deleteMany({ where: { psychoanalystId: psychoanalyst.id } }),
    db.psychoanalystAvailabilitySlot.createMany({
      data: (slots as {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        slotDuration: number;
        slotGap?: number;
        volunteerOnly?: boolean;
      }[]).map((s) => ({
        psychoanalystId: psychoanalyst.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        slotDurationMins: s.slotDuration || psychoanalyst.sessionDurationMins || 50,
        slotGapMins: s.slotGap ?? 0,
        volunteerOnly: !!s.volunteerOnly,
        isActive: true,
      })),
    }),
  ]);

  return NextResponse.json({ success: true });
}
