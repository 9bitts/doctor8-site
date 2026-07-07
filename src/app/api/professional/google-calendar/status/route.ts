import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGoogleCalendarOAuthConfigured } from "@/lib/google-calendar-oauth";
import { isPsychologyGoogleCalendarEnabled } from "@/lib/psychology-feature-flags";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      googleCalendar: {
        select: {
          syncEnabled: true,
          calendarId: true,
          lastSyncedAt: true,
        },
      },
    },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  return NextResponse.json({
    configured: isGoogleCalendarOAuthConfigured(),
    enabled: isPsychologyGoogleCalendarEnabled(),
    connected: !!professional.googleCalendar,
    syncEnabled: professional.googleCalendar?.syncEnabled ?? false,
    calendarId: professional.googleCalendar?.calendarId ?? "primary",
    lastSyncedAt: professional.googleCalendar?.lastSyncedAt?.toISOString() ?? null,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  await db.professionalGoogleCalendar.deleteMany({
    where: { professionalId: professional.id },
  });

  return NextResponse.json({ ok: true });
}
