import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/organization-auth";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const ctx = await requireOrganization();
  if ("error" in ctx) return ctx.error;

  const batches = await db.tissBatch.findMany({
    where: { organizationId: ctx.organizationId },
    include: {
      orgHealthPlan: { select: { operatorName: true } },
      _count: { select: { guides: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    batches: batches.map((b) => ({
      id: b.id,
      batchNumber: b.batchNumber,
      operatorName: b.orgHealthPlan.operatorName,
      periodStart: b.periodStart.toISOString(),
      periodEnd: b.periodEnd.toISOString(),
      status: b.status,
      totalAmountCents: b.totalAmountCents,
      guideCount: b._count.guides,
      sentAt: b.sentAt?.toISOString() ?? null,
    })),
  });
}

const createSchema = z.object({
  orgHealthPlanId: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  guideIds: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  const ctx = await requireOrganization(["OWNER", "ADMIN", "FINANCE"]);
  if ("error" in ctx) return ctx.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const guides = await db.tissGuide.findMany({
    where: {
      id: { in: parsed.data.guideIds },
      organizationId: ctx.organizationId,
      orgHealthPlanId: parsed.data.orgHealthPlanId,
      status: "DRAFT",
      batchId: null,
    },
  });
  if (guides.length === 0) return NextResponse.json({ error: "NO_GUIDES" }, { status: 400 });

  const batchCount = await db.tissBatch.count({ where: { organizationId: ctx.organizationId } });
  const batchNumber = `L${String(batchCount + 1).padStart(5, "0")}`;
  const totalAmountCents = guides.reduce((s, g) => s + g.amountCents, 0);

  const batch = await db.$transaction(async (tx) => {
    const b = await tx.tissBatch.create({
      data: {
        organizationId: ctx.organizationId,
        orgHealthPlanId: parsed.data.orgHealthPlanId,
        batchNumber,
        periodStart: new Date(parsed.data.periodStart),
        periodEnd: new Date(parsed.data.periodEnd),
        totalGuides: guides.length,
        totalAmountCents,
      },
    });
    await tx.tissGuide.updateMany({
      where: { id: { in: guides.map((g) => g.id) } },
      data: { batchId: b.id, status: "SUBMITTED" },
    });
    return b;
  });

  return NextResponse.json({ id: batch.id, batchNumber }, { status: 201 });
}
