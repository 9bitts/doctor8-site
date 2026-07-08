import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await db.employerCompany.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      nomeFantasia: true,
      cnpj: true,
      planTier: true,
      nr1ComplianceScore: true,
      employeeCount: true,
      createdAt: true,
      _count: {
        select: {
          workforce: true,
          members: true,
          riskEntries: true,
        },
      },
      billing: {
        select: { status: true, stripeSubscriptionId: true },
      },
    },
  });

  return NextResponse.json({
    companies: companies.map((c) => ({
      id: c.id,
      nomeFantasia: c.nomeFantasia,
      cnpj: c.cnpj,
      planTier: c.planTier,
      nr1ComplianceScore: c.nr1ComplianceScore,
      employeeCount: c.employeeCount,
      workforceCount: c._count.workforce,
      memberCount: c._count.members,
      riskCount: c._count.riskEntries,
      billingStatus: c.billing?.status ?? "trialing",
      hasSubscription: Boolean(c.billing?.stripeSubscriptionId),
      createdAt: c.createdAt.toISOString(),
    })),
  });
}
