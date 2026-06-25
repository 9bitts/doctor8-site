import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listHealthPlans } from "@/lib/health-plans";

type PlanRuleInput = {
  healthPlanId: string;
  allowedWeekdays?: number[];
  minLeadDays?: number;
};

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profile = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      healthPlans: {
        select: { healthPlanId: true, allowedWeekdays: true, minLeadDays: true },
      },
    },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const plans = await listHealthPlans();
  const byId = new Map(profile.healthPlans.map((h) => [h.healthPlanId, h]));

  return NextResponse.json({
    plans: plans.map((p) => {
      const row = byId.get(p.id);
      return {
        ...p,
        selected: Boolean(row),
        allowedWeekdays: row?.allowedWeekdays ?? [],
        minLeadDays: row?.minLeadDays ?? 0,
      };
    }),
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profile = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const rules: PlanRuleInput[] = Array.isArray(body.plans)
    ? body.plans
    : Array.isArray(body.healthPlanIds)
      ? body.healthPlanIds.map((id: string) => ({ healthPlanId: id }))
      : [];

  await db.professionalHealthPlan.deleteMany({ where: { professionalId: profile.id } });
  if (rules.length > 0) {
    await db.professionalHealthPlan.createMany({
      data: rules.map((r) => ({
        professionalId: profile.id,
        healthPlanId: r.healthPlanId,
        allowedWeekdays: normalizeWeekdays(r.allowedWeekdays),
        minLeadDays: Math.max(0, r.minLeadDays ?? 0),
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true });
}

function normalizeWeekdays(days: number[] | undefined): number[] {
  if (!days?.length) return [];
  return [...new Set(days.filter((d) => d >= 0 && d <= 6))].sort();
}
