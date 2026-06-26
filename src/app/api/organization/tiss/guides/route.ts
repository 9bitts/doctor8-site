import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, getOrganizationProfessionalIds } from "@/lib/organization-auth";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const ctx = await requireOrganization();
  if ("error" in ctx) return ctx.error;

  const status = req.nextUrl.searchParams.get("status");
  const orgPlanId = req.nextUrl.searchParams.get("orgHealthPlanId");

  const guides = await db.tissGuide.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(status ? { status: status as "DRAFT" | "SUBMITTED" | "APPROVED" | "GLOSA" | "PAID" | "CANCELLED" } : {}),
      ...(orgPlanId ? { orgHealthPlanId: orgPlanId } : {}),
    },
    include: { orgHealthPlan: { select: { operatorName: true } } },
    orderBy: { serviceDate: "desc" },
    take: 200,
  });

  const profIds = [...new Set(guides.map((g) => g.professionalId))];
  const professionals = profIds.length
    ? await db.professionalProfile.findMany({
        where: { id: { in: profIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const profMap = new Map(professionals.map((p) => [p.id, p]));

  return NextResponse.json({
    guides: guides.map((g) => {
      const prof = profMap.get(g.professionalId);
      return {
        id: g.id,
        orgHealthPlanId: g.orgHealthPlanId,
        operatorName: g.orgHealthPlan.operatorName,
        guideNumber: g.guideNumber,
        amountCents: g.amountCents,
        patientName: g.patientName,
        cardNumber: g.cardNumber,
        status: g.status,
        glosaReason: g.glosaReason,
        batchId: g.batchId,
        serviceDate: g.serviceDate.toISOString(),
        professionalName: prof ? `Dr. ${prof.firstName} ${prof.lastName}` : "?",
      };
    }),
  });
}

const createSchema = z.object({
  orgHealthPlanId: z.string(),
  professionalId: z.string(),
  patientName: z.string().min(2),
  patientCpf: z.string().optional(),
  cardNumber: z.string().optional(),
  amountCents: z.number().int().positive(),
  serviceDate: z.string().datetime(),
  appointmentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireOrganization(["OWNER", "ADMIN", "FINANCE", "RECEPTIONIST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const plan = await db.organizationHealthPlan.findFirst({
    where: { id: parsed.data.orgHealthPlanId, organizationId: ctx.organizationId },
  });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const profIds = await getOrganizationProfessionalIds(ctx.organizationId);
  if (!profIds.includes(parsed.data.professionalId)) {
    return NextResponse.json({ error: "Professional not in organization" }, { status: 400 });
  }

  const count = await db.tissGuide.count({ where: { organizationId: ctx.organizationId } });
  const guideNumber = `G${String(count + 1).padStart(6, "0")}`;

  const guide = await db.tissGuide.create({
    data: {
      organizationId: ctx.organizationId,
      orgHealthPlanId: parsed.data.orgHealthPlanId,
      professionalId: parsed.data.professionalId,
      patientName: parsed.data.patientName,
      patientCpf: parsed.data.patientCpf,
      cardNumber: parsed.data.cardNumber,
      amountCents: parsed.data.amountCents,
      serviceDate: new Date(parsed.data.serviceDate),
      appointmentId: parsed.data.appointmentId,
      guideNumber,
    },
  });

  return NextResponse.json({ id: guide.id, guideNumber }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireOrganization(["OWNER", "ADMIN", "FINANCE"]);
  if ("error" in ctx) return ctx.error;

  const body = await req.json() as { id: string; status?: string; glosaReason?: string; glosaAmountCents?: number };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.tissGuide.updateMany({
    where: { id: body.id, organizationId: ctx.organizationId },
    data: {
      status: body.status as "GLOSA" | undefined,
      glosaReason: body.glosaReason,
      glosaAmountCents: body.glosaAmountCents,
    },
  });

  return NextResponse.json({ success: true });
}
