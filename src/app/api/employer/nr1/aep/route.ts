import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { refreshEmployerNr1Compliance } from "@/lib/employer-nr1";
import { buildErgonomicScreening } from "@/lib/nr1-ergonomic-screening";
import { defaultFieldVisit, parseFieldVisit } from "@/lib/nr1-field-visit";
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

const fieldVisitSchema = z
  .object({
    taskObserved: z.string().max(4000).optional(),
    workerInterview: z.string().max(4000).optional(),
    organizationNotes: z.string().max(4000).optional(),
    checklist: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          done: z.boolean(),
          note: z.string().max(1000).optional(),
        }),
      )
      .optional(),
  })
  .optional();

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
  /** Start or update mobile field visit */
  fieldVisit: fieldVisitSchema,
  startFieldVisit: z.boolean().optional(),
  aetFindings: z.string().max(8000).optional(),
  aetRecommendations: z.string().max(8000).optional(),
  /** Sign and complete AET-lite field report */
  completeFieldAet: z
    .object({
      evaluatorName: z.string().min(2).max(200),
      aetFindings: z.string().min(20).max(8000),
      aetRecommendations: z.string().min(20).max(8000),
    })
    .optional(),
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
      methodology: parsed.data.methodology ?? "AEP/visita em campo (NR-17) + fatores psicossociais",
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

  if (record.recommendAet) {
    import("@/lib/employer-care-referrals")
      .then(({ referralFromAetFlag }) =>
        referralFromAetFlag({
          employerCompanyId: ctx.employerCompanyId,
          aepRecordId: record.id,
        }),
      )
      .catch(() => {});
  }

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

  let fieldVisitJson: Prisma.InputJsonValue | undefined;
  let aetStatus: string | undefined;
  let evaluatorName: string | undefined;
  let evaluatorSignedAt: Date | undefined;
  let aetFindings: string | undefined = parsed.data.aetFindings;
  let aetRecommendations: string | undefined = parsed.data.aetRecommendations;
  let aetCompletedAt: Date | undefined;
  let recommendAet: boolean | undefined;

  if (parsed.data.startFieldVisit) {
    if (existing.aetStatus === "COMPLETED") {
      return NextResponse.json(
        { error: "Relatório de visita já assinado." },
        { status: 409 },
      );
    }
    fieldVisitJson = defaultFieldVisit(parseFieldVisit(existing.fieldVisitJson)) as unknown as Prisma.InputJsonValue;
    aetStatus = "IN_FIELD";
  }

  if (parsed.data.fieldVisit) {
    if (existing.aetStatus === "COMPLETED" && !parsed.data.completeFieldAet) {
      return NextResponse.json(
        { error: "Relatório de visita já assinado — não é possível alterar o checklist." },
        { status: 409 },
      );
    }
    const current = parseFieldVisit(existing.fieldVisitJson);
    fieldVisitJson = defaultFieldVisit({
      ...current,
      ...parsed.data.fieldVisit,
      checklist: parsed.data.fieldVisit.checklist ?? current.checklist,
    }) as unknown as Prisma.InputJsonValue;
    if (existing.aetStatus === "NONE") aetStatus = "IN_FIELD";
  }

  if (parsed.data.completeFieldAet) {
    if (existing.aetStatus === "COMPLETED") {
      return NextResponse.json(
        { error: "Relatório de visita já assinado." },
        { status: 409 },
      );
    }
    const visit = parseFieldVisit(fieldVisitJson ?? existing.fieldVisitJson);
    const doneCount = visit.checklist.filter((c) => c.done).length;
    if (doneCount < 5) {
      return NextResponse.json(
        { error: "Conclua ao menos 5 itens do checklist de visita em campo." },
        { status: 400 },
      );
    }
    if (!visit.taskObserved?.trim() || !visit.workerInterview?.trim()) {
      return NextResponse.json(
        { error: "Descreva a tarefa observada e a escuta do trabalhador." },
        { status: 400 },
      );
    }
    evaluatorName = parsed.data.completeFieldAet.evaluatorName.trim();
    evaluatorSignedAt = new Date();
    aetFindings = parsed.data.completeFieldAet.aetFindings.trim();
    aetRecommendations = parsed.data.completeFieldAet.aetRecommendations.trim();
    aetStatus = "COMPLETED";
    aetCompletedAt = new Date();
    recommendAet = false;
    fieldVisitJson = visit as unknown as Prisma.InputJsonValue;
  }

  const interviewForFill = parseFieldVisit(fieldVisitJson ?? existing.fieldVisitJson).workerInterview?.trim();
  const workerParticipationFill =
    parsed.data.completeFieldAet && !existing.workerParticipation?.trim() && interviewForFill
      ? `Visita em campo — escuta do trabalhador: ${interviewForFill.slice(0, 800)}`
      : undefined;

  // If screening and field completion land in the same request, prefer completion flag.
  const screeningRecommendAet = ergo?.recommendAet;

  const record = await db.employerAepRecord.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title,
      methodology: parsed.data.methodology,
      methodologyRationale: parsed.data.methodologyRationale,
      workerParticipation: parsed.data.workerParticipation ?? workerParticipationFill,
      notes: parsed.data.notes,
      workstationDescription: parsed.data.workstationDescription,
      ...(ergo
        ? {
            ergonomicScreeningJson: ergo,
            ...(recommendAet === undefined && screeningRecommendAet !== undefined
              ? { recommendAet: screeningRecommendAet }
              : {}),
          }
        : {}),
      ...(recommendAet !== undefined ? { recommendAet } : {}),
      ...(fieldVisitJson !== undefined ? { fieldVisitJson } : {}),
      ...(aetStatus !== undefined ? { aetStatus } : {}),
      ...(evaluatorName !== undefined ? { evaluatorName, evaluatorSignedAt } : {}),
      ...(aetFindings !== undefined ? { aetFindings } : {}),
      ...(aetRecommendations !== undefined ? { aetRecommendations } : {}),
      ...(aetCompletedAt !== undefined ? { aetCompletedAt } : {}),
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

  if (record.recommendAet) {
    import("@/lib/employer-care-referrals")
      .then(({ referralFromAetFlag }) =>
        referralFromAetFlag({
          employerCompanyId: ctx.employerCompanyId,
          aepRecordId: record.id,
        }),
      )
      .catch(() => {});
  }

  return NextResponse.json({ record });
}
