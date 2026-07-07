import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { refreshEmployerNr1Compliance } from "@/lib/employer-nr1";
import { db } from "@/lib/db";

const itemSchema = z.object({
  hazardCode: z.string().optional(),
  riskEntryId: z.string().optional(),
  measureDescription: z.string().min(3),
  responsibleName: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

const createPlanSchema = z.object({
  title: z.string().min(2).max(200),
  items: z.array(itemSchema).optional(),
});

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const plans = await db.employerActionPlan.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    orderBy: { version: "desc" },
    include: {
      items: { orderBy: { dueDate: "asc" } },
    },
  });

  return NextResponse.json({ plans });
}

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const body = await req.json();

  if (body.planId) {
    const addItemSchema = z.object({
      planId: z.string(),
      hazardCode: z.string().optional(),
      riskEntryId: z.string().optional(),
      measureDescription: z.string().min(3),
      responsibleName: z.string().optional(),
      dueDate: z.string().datetime().optional(),
    });
    const parsed = addItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const plan = await db.employerActionPlan.findFirst({
      where: { id: parsed.data.planId, employerCompanyId: ctx.employerCompanyId },
    });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const item = await db.employerActionPlanItem.create({
      data: {
        planId: plan.id,
        hazardCode: parsed.data.hazardCode,
        riskEntryId: parsed.data.riskEntryId,
        measureDescription: parsed.data.measureDescription,
        responsibleName: parsed.data.responsibleName,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      },
    });

    await refreshEmployerNr1Compliance(ctx.employerCompanyId);
    return NextResponse.json({ item }, { status: 201 });
  }

  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const last = await db.employerActionPlan.findFirst({
    where: { employerCompanyId: ctx.employerCompanyId },
    orderBy: { version: "desc" },
  });

  const plan = await db.employerActionPlan.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      title: parsed.data.title,
      version: (last?.version ?? 0) + 1,
      items: parsed.data.items?.length
        ? {
            create: parsed.data.items.map((i) => ({
              hazardCode: i.hazardCode,
              riskEntryId: i.riskEntryId,
              measureDescription: i.measureDescription,
              responsibleName: i.responsibleName,
              dueDate: i.dueDate ? new Date(i.dueDate) : undefined,
            })),
          }
        : undefined,
    },
    include: { items: true },
  });

  await refreshEmployerNr1Compliance(ctx.employerCompanyId);
  return NextResponse.json({ plan }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const body = z.object({
    itemId: z.string(),
    status: z.enum(["PLANNED", "IN_PROGRESS", "DONE", "VERIFIED", "CANCELLED"]).optional(),
    verificationNotes: z.string().optional(),
  }).safeParse(await req.json());

  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const item = await db.employerActionPlanItem.findFirst({
    where: {
      id: body.data.itemId,
      plan: { employerCompanyId: ctx.employerCompanyId },
    },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.employerActionPlanItem.update({
    where: { id: item.id },
    data: {
      status: body.data.status,
      verificationNotes: body.data.verificationNotes,
      completedAt:
        body.data.status === "DONE" || body.data.status === "VERIFIED"
          ? new Date()
          : item.completedAt,
    },
  });

  await refreshEmployerNr1Compliance(ctx.employerCompanyId);
  return NextResponse.json({ item: updated });
}
