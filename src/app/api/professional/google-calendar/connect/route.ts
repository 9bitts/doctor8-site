import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import {
  buildGoogleCalendarAuthUrl,
  isGoogleCalendarOAuthConfigured,
} from "@/lib/google-calendar-oauth";
import { isPsychologyGoogleCalendarEnabled } from "@/lib/psychology-feature-flags";
import { assertPsychologyProFeature } from "@/lib/psychology-plan-limits";

export async function GET() {
  if (!isPsychologyGoogleCalendarEnabled()) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, specialty: true },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const proGate = await assertPsychologyProFeature(session.user.id, professional.specialty);
  if (!proGate.ok) {
    return NextResponse.json({ error: proGate.code }, { status: 402 });
  }

  if (!isGoogleCalendarOAuthConfigured()) {
    return NextResponse.json({ error: "GOOGLE_OAUTH_NOT_CONFIGURED" }, { status: 503 });
  }

  const state = encrypt(JSON.stringify({
    userId: session.user.id,
    professionalId: professional.id,
    ts: Date.now(),
  }));

  return NextResponse.json({ authUrl: buildGoogleCalendarAuthUrl(state) });
}
