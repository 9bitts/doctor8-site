import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const benefit = await db.employerEapBenefit.findUnique({
    where: { employerCompanyId: ctx.employerCompanyId },
  });

  const utilization = await db.employerWorkforceMember.aggregate({
    where: { employerCompanyId: ctx.employerCompanyId, status: "ACTIVE" },
    _sum: { sessionsUsed: true },
    _count: true,
  });

  return NextResponse.json({
    benefit,
    utilization: {
      activeMembers: utilization._count,
      totalSessionsUsed: utilization._sum.sessionsUsed ?? 0,
    },
  });
}

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  sessionsPerEmployee: z.number().int().min(0).max(52).optional(),
  sessionPriceCents: z.number().int().min(0).max(1_000_000).optional(),
  jitEnabled: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "HR"]);
  if ("error" in ctx) return ctx.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const benefit = await db.employerEapBenefit.upsert({
    where: { employerCompanyId: ctx.employerCompanyId },
    create: {
      employerCompanyId: ctx.employerCompanyId,
      ...parsed.data,
    },
    update: parsed.data,
  });

  return NextResponse.json({ benefit });
}
