import { NextResponse } from "next/server";
import { listHealthPlans } from "@/lib/health-plans";

export const dynamic = "force-dynamic";

export async function GET() {
  const plans = await listHealthPlans();
  return NextResponse.json({ plans });
}
