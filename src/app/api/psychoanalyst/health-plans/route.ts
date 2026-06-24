import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listHealthPlans } from "@/lib/health-plans";
import { requirePsychoanalyst } from "@/lib/psychoanalyst-api";

export async function GET() {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const profile = await db.psychoanalystProfile.findUnique({
    where: { id: psychoanalyst.id },
    include: { healthPlans: { select: { healthPlanId: true } } },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const plans = await listHealthPlans();
  const selected = new Set(profile.healthPlans.map((h) => h.healthPlanId));

  return NextResponse.json({
    plans: plans.map((p) => ({ ...p, selected: selected.has(p.id) })),
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const ids: string[] = Array.isArray(body.healthPlanIds) ? body.healthPlanIds : [];

  await db.psychoanalystHealthPlan.deleteMany({
    where: { psychoanalystId: psychoanalyst.id },
  });
  if (ids.length > 0) {
    await db.psychoanalystHealthPlan.createMany({
      data: ids.map((healthPlanId) => ({
        psychoanalystId: psychoanalyst.id,
        healthPlanId,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true });
}
