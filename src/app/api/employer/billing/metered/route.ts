import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { isEmployerMeteredBillingConfigured } from "@/lib/employer-metered-billing";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN"]);
  if ("error" in ctx) return ctx.error;

  const [billing, usageCount, recentUsage, internalCount] = await Promise.all([
    db.employerBilling.findUnique({ where: { employerCompanyId: ctx.employerCompanyId } }),
    db.employerEapMeteredUsage.count({ where: { employerCompanyId: ctx.employerCompanyId } }),
    db.employerEapMeteredUsage.findMany({
      where: { employerCompanyId: ctx.employerCompanyId },
      orderBy: { reportedAt: "desc" },
      take: 12,
    }),
    db.employerEapMeteredUsage.count({
      where: {
        employerCompanyId: ctx.employerCompanyId,
        stripeUsageRecordId: "internal-demo",
      },
    }),
  ]);

  const configured = isEmployerMeteredBillingConfigured();

  return NextResponse.json({
    configured,
    mode: configured ? "live" : "demo",
    meteredItemId: billing?.stripeMeteredItemId ?? null,
    sessionsReported: usageCount,
    sessionsInternalDemo: internalCount,
    recent: recentUsage.map((u) => ({
      appointmentId: u.appointmentId,
      amountCents: u.amountCents,
      reportedAt: u.reportedAt.toISOString(),
      stripeUsageRecordId: u.stripeUsageRecordId,
      isDemo: u.stripeUsageRecordId === "internal-demo",
    })),
    message: configured
      ? "Sessões EAP reportadas automaticamente ao Stripe metered billing."
      : "Modo demonstração: uso registrado internamente. Configure STRIPE_PRICE_EMPLOYER_EAP_METERED_BRL para faturamento automático.",
  });
}
