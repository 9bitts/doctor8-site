import { NextRequest, NextResponse } from "next/server";
import { sendInactiveAngelNudges } from "@/lib/humanitarian/angel-coordination";

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-cron-secret");
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

/** Nudge angels with no activity in the last 14 days. */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sent = await sendInactiveAngelNudges();
  return NextResponse.json({ ok: true, sent });
}
