import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listHealthPlans } from "@/lib/health-plans";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profile = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
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
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profile = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const ids: string[] = Array.isArray(body.healthPlanIds) ? body.healthPlanIds : [];

  await db.professionalHealthPlan.deleteMany({ where: { professionalId: profile.id } });
  if (ids.length > 0) {
    await db.professionalHealthPlan.createMany({
      data: ids.map((healthPlanId) => ({ professionalId: profile.id, healthPlanId })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true });
}
