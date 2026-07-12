import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  isAsoCompletionTransition,
  validateEmployerExamPatch,
} from "@/lib/employer-aso-patch";
import type { EmployerAsoResult, EmployerAsoSource, EmployerExamStatus } from "@prisma/client";

const patchSchema = z.object({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  clinicName: z.string().max(200).optional().nullable(),
  asoResult: z.enum(["APTO", "APTO_COM_RESTRICAO", "INAPTO"]).optional().nullable(),
  asoRestrictions: z.string().max(2000).optional().nullable(),
  physicianName: z.string().max(200).optional().nullable(),
  physicianCrm: z.string().max(30).optional().nullable(),
  asoSource: z.enum(["PHYSICIAN", "TRANSCRITO"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  rectify: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR"]);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.employerOccupationalExam.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = parsed.data;
  const validationError = validateEmployerExamPatch(existing, data);
  if (validationError) {
    return NextResponse.json({ error: validationError.error }, { status: validationError.status });
  }

  const isTranscription =
    data.asoResult !== undefined &&
    data.asoResult !== null &&
    data.asoSource === "TRANSCRITO";

  const exam = await db.employerOccupationalExam.update({
    where: { id },
    data: {
      status: (data.status ?? (isTranscription ? "COMPLETED" : undefined)) as
        | EmployerExamStatus
        | undefined,
      scheduledAt: data.scheduledAt === null ? null : data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
      completedAt:
        data.completedAt === null
          ? null
          : data.completedAt
            ? new Date(data.completedAt)
            : data.status === "COMPLETED" && !existing.completedAt
              ? new Date()
              : data.rectify || isTranscription
                ? new Date()
                : undefined,
      clinicName: data.clinicName === null ? null : data.clinicName,
      asoResult: data.asoResult === null ? null : (data.asoResult as EmployerAsoResult | undefined),
      asoRestrictions: data.asoRestrictions === null ? null : data.asoRestrictions,
      physicianName: data.physicianName === null ? null : data.physicianName,
      physicianCrm: data.physicianCrm === null ? null : data.physicianCrm,
      asoSource: isTranscription ? ("TRANSCRITO" as EmployerAsoSource) : undefined,
      asoRetifiedAt: data.rectify ? new Date() : undefined,
      notes: data.notes === null ? null : data.notes,
    },
  });

  if (isTranscription) {
    await createAuditLog({
      userId: ctx.userId,
      action: "UPDATE_RECORD",
      resource: "EmployerOccupationalExam",
      resourceId: exam.id,
      details: {
        asoSource: "TRANSCRITO",
        asoResult: exam.asoResult,
        physicianName: exam.physicianName,
        physicianCrm: exam.physicianCrm,
      },
    });
  }

  if (data.rectify) {
    await createAuditLog({
      userId: ctx.userId,
      action: "UPDATE_RECORD",
      resource: "EmployerOccupationalExam",
      resourceId: exam.id,
      details: {
        action: "ASO_RETIFICACAO",
        notes: data.notes?.trim(),
        asoResult: exam.asoResult,
      },
    });
  }

  const wasCompletion = isAsoCompletionTransition(existing, exam);
  if (wasCompletion) {
    import("@/lib/employer-esocial-partner")
      .then(({ buildAndQueueS2220FromExam }) =>
        buildAndQueueS2220FromExam(exam.id, ctx.employerCompanyId),
      )
      .catch(() => {});
  } else if (data.rectify && exam.status === "COMPLETED" && exam.asoResult) {
    import("@/lib/employer-esocial-partner")
      .then(({ buildAndQueueS2220FromExam }) =>
        buildAndQueueS2220FromExam(exam.id, ctx.employerCompanyId, { isRetification: true }),
      )
      .catch(() => {});
  }

  return NextResponse.json({ exam });
}
