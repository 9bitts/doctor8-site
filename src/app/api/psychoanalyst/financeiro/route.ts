import { NextRequest, NextResponse } from "next/server";
import { requirePsychoanalyst } from "@/lib/psychoanalyst-api";
import { buildProviderFinanceiroReport } from "@/lib/provider-financeiro";

export async function GET(req: NextRequest) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "this_month";

  const report = await buildProviderFinanceiroReport({
    providerId: ctx.psychoanalyst.id,
    providerField: "psychoanalystId",
    currency: ctx.psychoanalyst.currency,
    period,
  });

  return NextResponse.json(report);
}
