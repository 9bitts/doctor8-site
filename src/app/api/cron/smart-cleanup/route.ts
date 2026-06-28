import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredSmartTokens } from "@/lib/fhir/smart-token-maintenance";

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-cron-secret");
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

/** Purge expired SMART OAuth codes and tokens. */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const purged = await purgeExpiredSmartTokens();
  return NextResponse.json({ ok: true, purged });
}
