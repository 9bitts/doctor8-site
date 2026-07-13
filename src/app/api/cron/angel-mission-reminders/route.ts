import { NextRequest, NextResponse } from "next/server";
import { sendDueMissionReminders } from "@/lib/humanitarian/angel-missions";

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-cron-secret");
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

/** Send 24h reminders for confirmed angel TURNO signups. */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sent = await sendDueMissionReminders();
  return NextResponse.json({ ok: true, sent });
}
