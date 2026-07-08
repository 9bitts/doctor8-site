import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { assertSurveyCapacity } from "@/lib/employer-plan-enforcement";
import { refreshEmployerNr1Compliance } from "@/lib/employer-nr1";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const campaigns = await db.employerSurveyCampaign.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { responses: true } } },
  });

  return NextResponse.json({ campaigns });
}

const createSchema = z.object({
  title: z.string().min(2).max(200),
  instrument: z.string().default("COPSOQ-LITE"),
  anonymousMinGroup: z.number().int().min(3).max(50).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR"]);
  if ("error" in ctx) return ctx.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const capacity = await assertSurveyCapacity(ctx.employerCompanyId);
  if (!capacity.ok) {
    return NextResponse.json(
      {
        error: "SURVEY_LIMIT",
        message: `Limite do plano (${capacity.limits.tier}): ${capacity.limits.maxSurveysPerYear} pesquisas/ano.`,
        current: capacity.current,
        max: capacity.limits.maxSurveysPerYear,
      },
      { status: 400 },
    );
  }

  const campaign = await db.employerSurveyCampaign.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      title: parsed.data.title,
      instrument: parsed.data.instrument,
      anonymousMinGroup: parsed.data.anonymousMinGroup ?? 5,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ campaign }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR"]);
  if ("error" in ctx) return ctx.error;

  const body = z.object({
    id: z.string(),
    status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
  }).safeParse(await req.json());

  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const existing = await db.employerSurveyCampaign.findFirst({
    where: { id: body.data.id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const campaign = await db.employerSurveyCampaign.update({
    where: { id: existing.id },
    data: {
      status: body.data.status,
      startsAt: body.data.startsAt ? new Date(body.data.startsAt) : undefined,
      endsAt: body.data.endsAt ? new Date(body.data.endsAt) : undefined,
    },
  });

  await refreshEmployerNr1Compliance(ctx.employerCompanyId);
  return NextResponse.json({ campaign });
}
