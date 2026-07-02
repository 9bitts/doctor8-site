import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { touchHumanitarianConsultPresence } from "@/lib/humanitarian/dispatcher";
import { readJsonBody } from "@/lib/safe-json";

export const runtime = "nodejs";

/** Video-room heartbeat: keeps an active humanitarian consult from being reaped. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });

  const body = await readJsonBody<{ entryId?: string }>(req);
  const entryId = body?.entryId;
  if (!entryId) {
    return NextResponse.json(
      { errorCode: "VALIDATION_ERROR", error: "entryId required" },
      { status: 400 },
    );
  }

  const ok = await touchHumanitarianConsultPresence(entryId, session.user.id);
  return NextResponse.json({ ok });
}
