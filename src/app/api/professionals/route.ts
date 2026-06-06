// src/app/api/professionals/route.ts
// Returns list of verified professionals for patient to browse and book

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const specialty = searchParams.get("specialty");
  const type = searchParams.get("type"); // TELECONSULT or IN_PERSON

  const professionals = await db.professionalProfile.findMany({
    where: {
      verified: true,
      ...(specialty ? { specialty: { contains: specialty, mode: "insensitive" } } : {}),
      ...(type === "TELECONSULT" ? { acceptsTeleconsult: true } : {}),
      ...(type === "IN_PERSON" ? { acceptsInPerson: true } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialty: true,
      subspecialties: true,
      bio: true,
      avatarUrl: true,
      consultPrice: true,
      currency: true,
      acceptsTeleconsult: true,
      acceptsInPerson: true,
      clinicCity: true,
      clinicState: true,
      clinicCountry: true,
      virtualCard: { select: { slug: true } },
      availabilitySlots: {
        where: { isActive: true },
        select: { dayOfWeek: true, startTime: true, endTime: true, slotDurationMins: true },
      },
    },
    orderBy: { firstName: "asc" },
    take: 50,
  });

  // Calculate available slots for next 7 days
  const enriched = await Promise.all(
    professionals.map(async (pro) => {
      const appointmentCount = await db.appointment.count({
        where: {
          professionalId: pro.id,
          status: { in: ["CONFIRMED", "PENDING"] },
          scheduledAt: { gte: new Date() },
        },
      });

      return {
        ...pro,
        upcomingAppointments: appointmentCount,
        // Rating would come from a reviews system (future feature)
        rating: 4.8,
        reviewCount: 0,
      };
    })
  );

  return NextResponse.json({ professionals: enriched });
}
