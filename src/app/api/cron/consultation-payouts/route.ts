import { NextRequest, NextResponse } from "next/server";
import { processDueConsultationProfessionalPayouts } from "@/lib/consultation-professional-payout";

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-cron-secret");
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

/** Transfers due professional shares (85%) after cancel/refund window. */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await processDueConsultationProfessionalPayouts();
  return NextResponse.json({ ok: true, ...result });
}
