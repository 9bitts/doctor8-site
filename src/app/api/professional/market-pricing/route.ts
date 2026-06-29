import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getMarketPricingForProfessional } from "@/lib/market-pricing";

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const insight = await getMarketPricingForProfessional(ctx.professional.id);
  if (!insight) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ insight });
}
