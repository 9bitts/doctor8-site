import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handoffAppointmentViaGoogleMeet } from "@/lib/appointment-meet";
import { isGoogleMeetEnabled } from "@/lib/google-meet";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isGoogleMeetEnabled()) {
    return NextResponse.json({ error: "MEET_DISABLED" }, { status: 503 });
  }

  try {
    const result = await handoffAppointmentViaGoogleMeet(params.id, session.user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "NOT_FOUND") return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (msg === "NOT_TELECONSULT") {
      return NextResponse.json({ error: "NOT_TELECONSULT" }, { status: 400 });
    }
    if (msg === "NOT_ACTIVE") return NextResponse.json({ error: "NOT_ACTIVE" }, { status: 409 });
    if (msg === "TOO_EARLY") return NextResponse.json({ error: "TOO_EARLY" }, { status: 425 });
    if (msg === "EXPIRED") return NextResponse.json({ error: "EXPIRED" }, { status: 410 });
    if (msg === "MEET_CREATE_FAILED") {
      return NextResponse.json({ error: "MEET_CREATE_FAILED" }, { status: 502 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
