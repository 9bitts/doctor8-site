import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public liveness probe for uptime monitors (UptimeRobot, Better Stack, etc.). */
export async function GET() {
  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        service: "doctor8",
        db: "connected",
        latencyMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "db_error";
    return NextResponse.json(
      {
        status: "degraded",
        service: "doctor8",
        db: "error",
        error: message,
        latencyMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
