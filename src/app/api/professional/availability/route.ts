// src/app/api/professional/availability/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const professional = await db.professionalProfile.findUnique({ where: { userId: session.user.id } });
  if (!professional) return NextResponse.json({ slots: [] });

  const slots = await db.availabilitySlot.findMany({
    where: { professionalId: professional.id, isActive: true },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json({ slots });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slots } = await req.json();

  const professional = await db.professionalProfile.findUnique({ where: { userId: session.user.id } });
  if (!professional) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Replace all availability slots in a transaction
  await db.$transaction([
    db.availabilitySlot.deleteMany({ where: { professionalId: professional.id } }),
    db.availabilitySlot.createMany({
      data: slots.map((s: { dayOfWeek: number; startTime: string; endTime: string; slotDuration: number }) => ({
        professionalId: professional.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        slotDurationMins: s.slotDuration,
        isActive: true,
      })),
    }),
  ]);

  return NextResponse.json({ success: true });
}
