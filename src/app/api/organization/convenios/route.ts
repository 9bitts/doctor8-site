import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/organization-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { listHealthPlans } from "@/lib/health-plans";

export async function GET() {
  const ctx = await requireOrganization();
  if ("error" in ctx) return ctx.error;

  const [plans, globalPlans] = await Promise.all([
    db.organizationHealthPlan.findMany({
      where: { organizationId: ctx.organizationId },
      include: { healthPlan: { select: { id: true, name: true, slug: true } } },
      orderBy: { operatorName: "asc" },
    }),
    listHealthPlans(),
  ]);

  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      operatorName: p.operatorName,
      ansRegistry: p.ansRegistry,
      contractNumber: p.contractNumber,
      tissVersion: p.tissVersion,
      active: p.active,
      healthPlanId: p.healthPlanId,
      healthPlanName: p.healthPlan?.name ?? null,
      guideCount: 0,
    })),
    globalHealthPlans: globalPlans,
  });
}

const createSchema = z.object({
  operatorName: z.string().min(2).max(120),
  healthPlanId: z.string().optional(),
  ansRegistry: z.string().max(20).optional(),
  contractNumber: z.string().max(40).optional(),
  tissVersion: z.string().max(20).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireOrganization(["OWNER", "ADMIN", "FINANCE"]);
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const plan = await db.organizationHealthPlan.create({
    data: {
      organizationId: ctx.organizationId,
      operatorName: parsed.data.operatorName,
      healthPlanId: parsed.data.healthPlanId,
      ansRegistry: parsed.data.ansRegistry,
      contractNumber: parsed.data.contractNumber,
      tissVersion: parsed.data.tissVersion || "4.01.00",
    },
  });

  return NextResponse.json({ id: plan.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireOrganization(["OWNER", "ADMIN", "FINANCE"]);
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { id, ...data } = body as { id: string; active?: boolean };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.organizationHealthPlan.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data,
  });

  return NextResponse.json({ success: true });
}
