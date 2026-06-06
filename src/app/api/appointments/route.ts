// src/app/api/appointments/route.ts
// List and manage appointments

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const upcoming = searchParams.get("upcoming") === "true";

  let appointments;

  if (session.user.role === "PATIENT") {
    const patient = await db.patientProfile.findUnique({ where: { userId: session.user.id } });
    if (!patient) return NextResponse.json({ appointments: [] });

    appointments = await db.appointment.findMany({
      where: {
        patientId: patient.id,
        ...(status ? { status: status as any } : {}),
        ...(upcoming ? { scheduledAt: { gte: new Date() } } : {}),
      },
      include: {
        professional: {
          select: { firstName: true, lastName: true, specialty: true, avatarUrl: true },
        },
      },
      orderBy: { scheduledAt: upcoming ? "asc" : "desc" },
      take: 50,
    });
  } else if (session.user.role === "PROFESSIONAL") {
    const professional = await db.professionalProfile.findUnique({ where: { userId: session.user.id } });
    if (!professional) return NextResponse.json({ appointments: [] });

    appointments = await db.appointment.findMany({
      where: {
        professionalId: professional.id,
        ...(status ? { status: status as any } : {}),
        ...(upcoming ? { scheduledAt: { gte: new Date() } } : {}),
      },
      include: {
        patient: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { scheduledAt: upcoming ? "asc" : "desc" },
      take: 50,
    });
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await audit.viewRecord(session.user.id, "Appointment", "list");
  return NextResponse.json({ appointments });
}
