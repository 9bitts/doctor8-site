import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handoffHumanitarianEntryViaGoogleMeet } from "@/lib/humanitarian/dispatcher";
import { isGoogleMeetEnabled } from "@/lib/google-meet";

export async function POST(
  _req: NextRequest,
  { params }: { params: { entryId: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
  if (!["PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST"].includes(session.user.role)) {
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Forbidden" }, { status: 403 });
  }

  if (!isGoogleMeetEnabled()) {
    return NextResponse.json({ errorCode: "MEET_DISABLED", error: "MEET_DISABLED" }, { status: 503 });
  }

  try {
    const result = await handoffHumanitarianEntryViaGoogleMeet(
      params.entryId,
      session.user.id,
    );
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "NOT_ACTIVE") {
      return NextResponse.json({ errorCode: "NOT_ACTIVE", error: "NOT_ACTIVE" }, { status: 409 });
    }
    if (msg === "MEET_CREATE_FAILED") {
      return NextResponse.json({ errorCode: "MEET_CREATE_FAILED", error: "MEET_CREATE_FAILED" }, { status: 502 });
    }
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Forbidden" }, { status: 403 });
  }
}
