import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const records = await db.employerCatRecord.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    include: {
      workforceMember: {
        select: { id: true, firstName: true, lastName: true, email: true, matriculaEsocial: true },
      },
    },
    orderBy: { occurrenceAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ records });
}

const createSchema = z.object({
  workforceMemberId: z.string(),
  occurrenceAt: z.string().datetime(),
  catType: z.string().max(40).optional(),
  accidentType: z.string().max(100).optional(),
  bodyPart: z.string().max(100).optional(),
  cidCode: z.string().max(20).optional(),
  description: z.string().max(4000).optional(),
  leaveDays: z.number().int().min(0).max(3650).optional(),
  notes: z.string().max(4000).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR"]);
  if ("error" in ctx) return ctx.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const member = await db.employerWorkforceMember.findFirst({
    where: { id: parsed.data.workforceMemberId, employerCompanyId: ctx.employerCompanyId },
  });
  if (!member) return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });

  const record = await db.employerCatRecord.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      workforceMemberId: parsed.data.workforceMemberId,
      occurrenceAt: new Date(parsed.data.occurrenceAt),
      catType: parsed.data.catType ?? "INICIAL",
      accidentType: parsed.data.accidentType,
      bodyPart: parsed.data.bodyPart,
      cidCode: parsed.data.cidCode,
      description: parsed.data.description,
      leaveDays: parsed.data.leaveDays,
      notes: parsed.data.notes,
      esocialQueuedAt: new Date(),
    },
  });

  // Queue S-2210 prep transmission
  await db.employerEsocialTransmission.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      eventType: "S-2210",
      eventRefId: record.id,
      status: "QUEUED",
      payloadJson: {
        catId: record.id,
        workforceMemberId: record.workforceMemberId,
        occurrenceAt: record.occurrenceAt.toISOString(),
        catType: record.catType,
        cidCode: record.cidCode,
        note: "Preparação eSocial S-2210 (CAT) — revisar com profissional / parceiro",
      },
    },
  });

  return NextResponse.json({ record }, { status: 201 });
}
