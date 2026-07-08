import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { isExamOverdue, EXAM_TYPE_LABELS } from "@/lib/employer-occupational-exams";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const company = await db.employerCompany.findUnique({
    where: { id: ctx.employerCompanyId },
    select: { grauRisco: true },
  });

  const exams = await db.employerOccupationalExam.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    include: {
      workforceMember: {
        select: { firstName: true, lastName: true, email: true, department: true, jobTitle: true },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  const overdue = exams.filter((e) => isExamOverdue(e.dueDate, e.status)).length;
  const pending = exams.filter((e) => e.status === "SCHEDULED" || e.status === "IN_PROGRESS").length;
  const completed = exams.filter((e) => e.status === "COMPLETED").length;

  return NextResponse.json({
    stats: { overdue, pending, completed, total: exams.length },
    grauRisco: company?.grauRisco,
    examTypes: EXAM_TYPE_LABELS,
    exams: exams.map((e) => ({
      id: e.id,
      examType: e.examType,
      examTypeLabel: EXAM_TYPE_LABELS[e.examType],
      status: e.status,
      scheduledAt: e.scheduledAt?.toISOString() ?? null,
      dueDate: e.dueDate?.toISOString() ?? null,
      completedAt: e.completedAt?.toISOString() ?? null,
      asoResult: e.asoResult,
      physicianName: e.physicianName,
      physicianCrm: e.physicianCrm,
      clinicName: e.clinicName,
      overdue: isExamOverdue(e.dueDate, e.status),
      employee: e.workforceMember,
    })),
  });
}

const createSchema = z.object({
  workforceMemberId: z.string(),
  examType: z.enum(["ADMISSIONAL", "PERIODICO", "RETORNO_TRABALHO", "MUDANCA_FUNCAO", "DEMISSIONAL"]),
  scheduledAt: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  clinicName: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
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
  if (!member) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const exam = await db.employerOccupationalExam.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      workforceMemberId: parsed.data.workforceMemberId,
      examType: parsed.data.examType,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      clinicName: parsed.data.clinicName,
      notes: parsed.data.notes,
    },
  });

  return NextResponse.json({ exam }, { status: 201 });
}
