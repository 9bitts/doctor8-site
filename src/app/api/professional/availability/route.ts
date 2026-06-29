// src/app/api/professional/availability/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateAvailabilityBlocks } from "@/lib/availability-validation";
import { isAcuraVolunteerProvider } from "@/lib/acura-volunteer";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const professional = await db.professionalProfile.findUnique({ where: { userId: session.user.id } });
  if (!professional) return NextResponse.json({ slots: [], acuraVolunteer: false, badgeVisible: false });

  const slots = await db.availabilitySlot.findMany({
    where: { professionalId: professional.id, isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({
    acuraVolunteer: professional.acuraVolunteer,
    badgeVisible: isAcuraVolunteerProvider(professional.verified, professional.acuraVolunteer),
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
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slots } = await req.json();

  const professional = await db.professionalProfile.findUnique({ where: { userId: session.user.id } });
  if (!professional) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
  if (hasVolunteerBlocks && !isAcuraVolunteerProvider(professional.verified, professional.acuraVolunteer)) {
    return NextResponse.json({ error: "acura_volunteer_required" }, { status: 403 });
  }

  await db.$transaction([
    db.availabilitySlot.deleteMany({ where: { professionalId: professional.id } }),
    db.availabilitySlot.createMany({
      data: (slots as {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        slotDuration: number;
        slotGap?: number;
        volunteerOnly?: boolean;
      }[]).map((s) => ({
        professionalId: professional.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        slotDurationMins: s.slotDuration,
        slotGapMins: s.slotGap ?? 0,
        volunteerOnly: !!s.volunteerOnly,
        isActive: true,
      })),
    }),
  ]);

  return NextResponse.json({ success: true });
}
