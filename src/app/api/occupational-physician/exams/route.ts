import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOccupationalPhysicianApi } from "@/lib/api-auth";
import { userHasCompanyAccess } from "@/lib/occupational-physician-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isAsoCompletionTransition,
  validatePhysicianExamPatch,
} from "@/lib/employer-aso-patch";
import { buildPcmsoScreeningResult } from "@/lib/employer-pcmso-screening";
import type { EmployerAsoResult, EmployerAsoSource, EmployerExamStatus } from "@prisma/client";

const patchSchema = z.object({
  employerCompanyId: z.string(),
  examId: z.string(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  asoResult: z.enum(["APTO", "APTO_COM_RESTRICAO", "INAPTO"]).optional(),
  asoRestrictions: z.string().max(2000).optional(),
  physicianName: z.string().max(200).optional(),
  physicianCrm: z.string().max(30).optional(),
  notes: z.string().max(2000).optional(),
  rectify: z.boolean().optional(),
  /** Answers 0–3 keyed by question id (q1…q20) */
  screeningAnswers: z.record(z.string(), z.number().int().min(0).max(3)).optional(),
});

export async function GET(req: NextRequest) {
  const ctx = await requireOccupationalPhysicianApi();
  if ("error" in ctx) return ctx.error;

  const session = await auth();
  const { searchParams } = req.nextUrl;
  const employerCompanyId = searchParams.get("employerCompanyId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const take = Math.min(Number(searchParams.get("take") ?? 50), 50);
  const skip = Math.max(Number(searchParams.get("skip") ?? 0), 0);

  if (session?.user?.role !== "ADMIN") {
    if (employerCompanyId) {
      const allowed = await userHasCompanyAccess(ctx.userId, employerCompanyId);
      if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const linkedCompanyIds = ctx.links.map((l) => l.employerCompanyId);

  if (session?.user?.role === "ADMIN") {
    if (!employerCompanyId) {
      return NextResponse.json({ exams: [], total: 0 });
    }
  } else if (!linkedCompanyIds.length) {
    return NextResponse.json({ exams: [], total: 0 });
  }

  const companyFilter = employerCompanyId
    ? [employerCompanyId]
    : session?.user?.role === "ADMIN"
      ? undefined
      : linkedCompanyIds;

  const where = {
    ...(companyFilter ? { employerCompanyId: { in: companyFilter } } : {}),
    ...(status ? { status: status as EmployerExamStatus } : {}),
  };

  const [exams, total] = await Promise.all([
    db.employerOccupationalExam.findMany({
      where,
      include: {
        workforceMember: { select: { firstName: true, lastName: true, email: true } },
        employerCompany: { select: { id: true, nomeFantasia: true } },
      },
      orderBy: [{ completedAt: "desc" }, { dueDate: "asc" }],
      take,
      skip,
    }),
    db.employerOccupationalExam.count({ where }),
  ]);

  return NextResponse.json({
    exams: exams.map((e) => ({
      id: e.id,
      examType: e.examType,
      status: e.status,
      dueDate: e.dueDate?.toISOString() ?? null,
      completedAt: e.completedAt?.toISOString() ?? null,
      asoResult: e.asoResult,
      asoRestrictions: e.asoRestrictions,
      employee: e.workforceMember,
      company: e.employerCompany,
    })),
    total,
  });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireOccupationalPhysicianApi();
  if ("error" in ctx) return ctx.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    const allowed = await userHasCompanyAccess(ctx.userId, parsed.data.employerCompanyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const physician = await db.employerOccupationalPhysician.findFirst({
    where: {
      employerCompanyId: parsed.data.employerCompanyId,
      userId: ctx.userId,
      status: "ACTIVE",
    },
  });

  const exam = await db.employerOccupationalExam.findFirst({
    where: {
      id: parsed.data.examId,
      employerCompanyId: parsed.data.employerCompanyId,
    },
  });
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  const validationError = validatePhysicianExamPatch(exam, parsed.data);
  if (validationError) {
    return NextResponse.json({ error: validationError.error }, { status: validationError.status });
  }

  const screeningJson = parsed.data.screeningAnswers
    ? buildPcmsoScreeningResult(parsed.data.screeningAnswers)
    : undefined;

  const updated = await db.employerOccupationalExam.update({
    where: { id: exam.id },
    data: {
      status:
        parsed.data.status === "COMPLETED" || parsed.data.asoResult || parsed.data.rectify
          ? ("COMPLETED" as EmployerExamStatus)
          : (parsed.data.status as EmployerExamStatus | undefined),
      asoResult: parsed.data.asoResult as EmployerAsoResult | undefined,
      asoRestrictions: parsed.data.asoRestrictions,
      physicianName: parsed.data.physicianName ?? physician?.fullName ?? undefined,
      physicianCrm: parsed.data.physicianCrm ?? physician?.crm ?? undefined,
      asoSource:
        parsed.data.asoResult || parsed.data.rectify
          ? ("PHYSICIAN" as EmployerAsoSource)
          : undefined,
      asoRetifiedAt: parsed.data.rectify ? new Date() : undefined,
      notes:
        parsed.data.notes !== undefined
          ? parsed.data.notes
          : undefined,
      screeningJson: screeningJson ?? undefined,
      completedAt:
        parsed.data.status === "COMPLETED" || parsed.data.asoResult || parsed.data.rectify
          ? new Date()
          : undefined,
    },
  });

  const shouldSign =
    (parsed.data.asoResult && updated.completedAt) || parsed.data.rectify;

  if (shouldSign) {
    const existingSignature = await db.employerDocumentSignature.findFirst({
      where: {
        employerCompanyId: parsed.data.employerCompanyId,
        docType: "ASO",
        docRefId: updated.id,
      },
    });

    const isFirstSignature = !existingSignature;
    const isRectification = Boolean(parsed.data.rectify);

    if (isFirstSignature || isRectification) {
      const resultLabel = updated.asoResult ?? parsed.data.asoResult;
      await db.employerDocumentSignature.create({
        data: {
          employerCompanyId: parsed.data.employerCompanyId,
          docType: "ASO",
          docRefId: updated.id,
          signedByName: updated.physicianName ?? physician?.fullName ?? "Médico do trabalho",
          signedByRegistro: updated.physicianCrm ?? physician?.crm,
          signedByRole: "MEDICO_TRABALHO",
          notes: isRectification
            ? `RETIFICAÇÃO: ${parsed.data.notes!.trim()}`
            : `ASO ${resultLabel}`,
        },
      });
    }
  }

  const wasCompletion = isAsoCompletionTransition(exam, updated);
  if (wasCompletion) {
    import("@/lib/employer-esocial-partner")
      .then(({ buildAndQueueS2220FromExam }) =>
        buildAndQueueS2220FromExam(updated.id, parsed.data.employerCompanyId),
      )
      .catch(() => {});
  } else if (parsed.data.rectify && updated.status === "COMPLETED" && updated.asoResult) {
    import("@/lib/employer-esocial-partner")
      .then(({ buildAndQueueS2220FromExam }) =>
        buildAndQueueS2220FromExam(updated.id, parsed.data.employerCompanyId, {
          isRetification: true,
        }),
      )
      .catch(() => {});
  }

  return NextResponse.json({ exam: updated });
}
