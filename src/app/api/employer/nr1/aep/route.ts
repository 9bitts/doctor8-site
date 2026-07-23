import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { refreshEmployerNr1Compliance } from "@/lib/employer-nr1";
import { buildErgonomicScreening } from "@/lib/nr1-ergonomic-screening";
import { db } from "@/lib/db";

const ergoSchema = z
  .object({
    workstationDescription: z.string().max(4000).optional(),
    repetitionsPerShift: z.number().min(0).max(100000).nullable().optional(),
    loadKg: z.number().min(0).max(500).nullable().optional(),
    armsAboveShoulders: z.boolean().optional(),
    trunkFlexionFrequent: z.boolean().optional(),
    wristForceDeviation: z.boolean().optional(),
    vibrationTools: z.boolean().optional(),
    prolongedStanding: z.boolean().optional(),
    computerWorkstation: z.boolean().optional(),
    notes: z.string().max(4000).optional(),
  })
  .optional();

const createSchema = z.object({
  title: z.string().min(2).max(200),
  methodology: z.string().optional(),
  methodologyRationale: z.string().optional(),
  workerParticipation: z.string().optional(),
  notes: z.string().optional(),
  workstationDescription: z.string().max(4000).optional(),
  ergonomicScreening: ergoSchema,
  status: z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED", "APPROVED"]).optional(),
  surveyCampaignId: z.union([z.string(), z.null()]).optional(),
});

const patchSchema = z.object({
  id: z.string(),
  title: z.string().min(2).max(200).optional(),
  methodology: z.string().optional(),
  methodologyRationale: z.string().optional(),
  workerParticipation: z.string().optional(),
  notes: z.string().optional(),
  workstationDescription: z.string().max(4000).optional(),
  ergonomicScreening: ergoSchema,
  status: z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED", "APPROVED"]).optional(),
  approvedByName: z.string().max(200).optional(),
  surveyCampaignId: z.union([z.string(), z.null()]).optional(),
});

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const records = await db.employerAepRecord.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    orderBy: { version: "desc" },
    include: { _count: { select: { riskEntries: true } } },
  });

  const campaigns = await db.employerSurveyCampaign.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, instrument: true, status: true },
  });

  return NextResponse.json({ records, campaigns });
}

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const last = await db.employerAepRecord.findFirst({
    where: { employerCompanyId: ctx.employerCompanyId },
    orderBy: { version: "desc" },
  });

  const ergo = parsed.data.ergonomicScreening
    ? buildErgonomicScreening({
        ...parsed.data.ergonomicScreening,
        workstationDescription:
          parsed.data.workstationDescription ?? parsed.data.ergonomicScreening.workstationDescription,
      })
    : null;

  const record = await db.employerAepRecord.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      title: parsed.data.title,
      version: (last?.version ?? 0) + 1,
      methodology: parsed.data.methodology ?? "AEP qualitativa/semiquantitativa (NR-17) + fatores psicossociais",
      methodologyRationale: parsed.data.methodologyRationale,
      workerParticipation: parsed.data.workerParticipation,
      notes: parsed.data.notes,
      workstationDescription: parsed.data.workstationDescription ?? ergo?.workstationDescription,
      ergonomicScreeningJson: ergo ?? undefined,
      recommendAet: ergo?.recommendAet ?? false,
      status: parsed.data.status ?? "DRAFT",
      surveyCampaignId: parsed.data.surveyCampaignId,
      completedAt: parsed.data.status === "COMPLETED" || parsed.data.status === "APPROVED"
        ? new Date()
        : undefined,
    },
  });

  await refreshEmployerNr1Compliance(ctx.employerCompanyId);
  return NextResponse.json({ record }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.employerAepRecord.findFirst({
    where: { id: parsed.data.id, employerCompanyId: ctx.employerCompanyId },
    include: { _count: { select: { riskEntries: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.status === "COMPLETED" || parsed.data.status === "APPROVED") {
    if (!existing.methodologyRationale?.trim() && !parsed.data.methodologyRationale?.trim()) {
      return NextResponse.json(
        { error: "Informe o racional da metodologia antes de concluir." },
        { status: 400 },
      );
    }
    if (!existing.workerParticipation?.trim() && !parsed.data.workerParticipation?.trim()) {
      return NextResponse.json(
        { error: "Documente a participação dos trabalhadores antes de concluir a AEP (NR-17)." },
        { status: 400 },
      );
    }
    if (existing._count.riskEntries < 1) {
      return NextResponse.json(
        { error: "Vincule ao menos um risco ao inventário antes de concluir a AEP." },
        { status: 400 },
      );
    }
  }

  const ergo = parsed.data.ergonomicScreening
    ? buildErgonomicScreening({
        ...parsed.data.ergonomicScreening,
        workstationDescription:
          parsed.data.workstationDescription ?? parsed.data.ergonomicScreening.workstationDescription,
      })
    : null;

  const record = await db.employerAepRecord.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title,
      methodology: parsed.data.methodology,
      methodologyRationale: parsed.data.methodologyRationale,
      workerParticipation: parsed.data.workerParticipation,
      notes: parsed.data.notes,
      workstationDescription: parsed.data.workstationDescription,
      ...(ergo
        ? {
            ergonomicScreeningJson: ergo,
            recommendAet: ergo.recommendAet,
          }
        : {}),
      status: parsed.data.status,
      approvedByName: parsed.data.approvedByName,
      surveyCampaignId: parsed.data.surveyCampaignId,
      completedAt:
        parsed.data.status === "COMPLETED" || parsed.data.status === "APPROVED"
          ? new Date()
          : undefined,
    },
  });

  await refreshEmployerNr1Compliance(ctx.employerCompanyId);
  return NextResponse.json({ record });
}
