import { NextRequest, NextResponse } from "next/server";
import { listHealthPlans } from "@/lib/health-plans";
import { listUsedHealthPlans } from "@/lib/public-search-catalog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const usedOnly = req.nextUrl.searchParams.get("usedOnly") === "1";
  const plans = usedOnly ? await listUsedHealthPlans() : await listHealthPlans();
  return NextResponse.json({ plans });
}
