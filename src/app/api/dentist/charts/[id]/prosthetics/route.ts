import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireDentalChartAccess, requireDentistProfessional } from "@/lib/dentistry/dentistry-api";

const createSchema = z.object({
  labName: z.string().min(1),
  description: z.string().min(1),
  toothNumbers: z.array(z.number()).optional(),
  expectedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const patchSchema = z.object({
  status: z.enum(["ORDERED", "IN_LAB", "READY", "DELIVERED", "CANCELLED"]).optional(),
  deliveredAt: z.string().datetime().optional(),
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

  const orders = await db.dentalProstheticOrder.findMany({
    where: { patientRecordId: params.id },
    orderBy: { orderedAt: "desc" },
  });

  return NextResponse.json({ orders });
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

  const order = await db.dentalProstheticOrder.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      labName: parsed.data.labName,
      description: parsed.data.description,
      toothNumbers: (parsed.data.toothNumbers ?? []) as Prisma.InputJsonValue,
      expectedAt: parsed.data.expectedAt ? new Date(parsed.data.expectedAt) : null,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  return NextResponse.json({ id: order.id, status: order.status }, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireDentistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireDentalChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const body = await req.json();
  const { orderId, ...rest } = body as { orderId?: string };
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const parsed = patchSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const order = await db.dentalProstheticOrder.findFirst({
    where: { id: orderId, patientRecordId: params.id, professionalId: professional.id },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const updated = await db.dentalProstheticOrder.update({
    where: { id: orderId },
    data: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.deliveredAt ? { deliveredAt: new Date(parsed.data.deliveredAt) } : {}),
      ...(parsed.data.status === "DELIVERED" && !parsed.data.deliveredAt ? { deliveredAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
