// Retorna dados financeiros do profissional autenticado.
import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { buildProviderFinanceiroReport } from "@/lib/provider-financeiro";

export async function GET(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "this_month";

  const professional = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
    select: { id: true, currency: true },
  });
  if (!professional) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const report = await buildProviderFinanceiroReport({
    providerId: professional.id,
    providerField: "professionalId",
    currency: professional.currency,
    period,
    includeJit: true,
  });

  return NextResponse.json(report);
}
