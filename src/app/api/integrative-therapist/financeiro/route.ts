import { NextRequest, NextResponse } from "next/server";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";
import { buildProviderFinanceiroReport } from "@/lib/provider-financeiro";

export async function GET(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "this_month";

  const report = await buildProviderFinanceiroReport({
    providerId: ctx.therapist.id,
    providerField: "integrativeTherapistId",
    currency: ctx.therapist.currency,
    period,
  });

  return NextResponse.json(report);
}
