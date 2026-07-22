import { NextRequest, NextResponse } from "next/server";
import { expireStaleJitSessions } from "@/lib/jit-session-lifecycle";
import { expireStaleJitNoShows } from "@/lib/jit-no-show-expiry";
import { expireStaleJitInProgress } from "@/lib/jit-queue-completion";

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-cron-secret");
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

/** Expire JIT plantão sessions without recent professional heartbeat. */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expired = await expireStaleJitSessions();
  const expiredNoShows = await expireStaleJitNoShows();
  const expiredInProgress = await expireStaleJitInProgress();
  return NextResponse.json({ ok: true, expired, expiredNoShows, expiredInProgress });
}
