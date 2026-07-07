import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncProfessionalGoogleCalendar } from "@/lib/google-calendar-sync";
import { isPsychologyGoogleCalendarEnabled } from "@/lib/psychology-feature-flags";

export async function POST() {
  if (!isPsychologyGoogleCalendarEnabled()) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, googleCalendar: { select: { id: true } } },
  });
  if (!professional?.googleCalendar) {
    return NextResponse.json({ error: "Not connected" }, { status: 400 });
  }

  const result = await syncProfessionalGoogleCalendar(professional.id);
  return NextResponse.json({ ok: true, ...result });
}
