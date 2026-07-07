import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireDentalChartAccess, requireDentistProfessional } from "@/lib/dentistry/dentistry-api";
import { findProcedure } from "@/lib/dentistry/procedures";

const itemSchema = z.object({
  procedureCode: z.string(),
  description: z.string().min(1),
  toothNumbers: z.array(z.number()).optional(),
  surfaces: z.array(z.string()).optional(),
  unitPriceCents: z.number().int().min(0),
  quantity: z.number().int().min(1).default(1),
});

const createSchema = z.object({
  title: z.string().optional(),
  notes: z.string().optional(),
  discountCents: z.number().int().min(0).optional(),
  items: z.array(itemSchema).min(1),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireDentistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireDentalChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const plans = await db.dentalTreatmentPlan.findMany({
    where: { patientRecordId: params.id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      totalAmountCents: p.totalAmountCents,
      discountCents: p.discountCents,
      notes: p.notes,
      patientApproved: p.patientApproved,
      approvedAt: p.approvedAt?.toISOString() ?? null,
      items: p.items,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireDentistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireDentalChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const totalAmountCents = parsed.data.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const discountCents = parsed.data.discountCents ?? 0;

  const plan = await db.dentalTreatmentPlan.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      title: parsed.data.title?.trim() || "Plano de tratamento",
      totalAmountCents: Math.max(0, totalAmountCents - discountCents),
      discountCents,
      notes: parsed.data.notes?.trim() || null,
      items: {
        create: parsed.data.items.map((item, idx) => ({
          procedureCode: item.procedureCode,
          description: item.description,
          toothNumbers: (item.toothNumbers ?? []) as Prisma.InputJsonValue,
          surfaces: item.surfaces ? (item.surfaces as Prisma.InputJsonValue) : undefined,
          unitPriceCents: item.unitPriceCents || findProcedure(item.procedureCode)?.defaultPriceCents || 0,
          quantity: item.quantity,
          sortOrder: idx,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json({ id: plan.id, status: plan.status, totalAmountCents: plan.totalAmountCents }, { status: 201 });
}
