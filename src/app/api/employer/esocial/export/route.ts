import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { buildS2220Payload, buildS2240Payload } from "@/lib/employer-esocial";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const examId = req.nextUrl.searchParams.get("examId");
  const workforceMemberId = req.nextUrl.searchParams.get("workforceMemberId");

  const company = await db.employerCompany.findUnique({
    where: { id: ctx.employerCompanyId },
    select: { cnpj: true, razaoSocial: true, nomeFantasia: true },
  });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const events: Record<string, unknown>[] = [];

  if (examId) {
    const exam = await db.employerOccupationalExam.findFirst({
      where: { id: examId, employerCompanyId: ctx.employerCompanyId },
      include: { workforceMember: true },
    });
    if (exam) {
      const s2220 = buildS2220Payload({
        company,
        employee: {
          firstName: exam.workforceMember.firstName,
          lastName: exam.workforceMember.lastName,
          email: exam.workforceMember.email,
          cpf: exam.workforceMember.cpf ?? undefined,
          matricula: exam.workforceMember.matriculaEsocial ?? undefined,
        },
        exam,
      });
      if (s2220) events.push(s2220);
    }
  }

  if (workforceMemberId) {
    const member = await db.employerWorkforceMember.findFirst({
      where: { id: workforceMemberId, employerCompanyId: ctx.employerCompanyId },
    });
    if (member) {
      const risks = await db.employerRiskEntry.findMany({
        where: { employerCompanyId: ctx.employerCompanyId },
        select: { hazardCode: true, hazardLabel: true, riskLevel: true },
        take: 30,
      });
      events.push(
        buildS2240Payload({
          company,
          employee: {
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            cpf: member.cpf ?? undefined,
            matricula: member.matriculaEsocial ?? undefined,
          },
          risks,
        }),
      );
    }
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    disclaimer:
      "Arquivos preparatórios para importação/validação no eSocial. Doctor8 não transmite automaticamente ao governo.",
    events,
  });
}

const batchSchema = z.object({
  examIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = batchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const company = await db.employerCompany.findUnique({
    where: { id: ctx.employerCompanyId },
    select: { cnpj: true },
  });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const where = {
    employerCompanyId: ctx.employerCompanyId,
    status: "COMPLETED" as const,
    ...(parsed.data.examIds?.length ? { id: { in: parsed.data.examIds } } : {}),
  };

  const exams = await db.employerOccupationalExam.findMany({
    where,
    include: { workforceMember: true },
    take: 100,
  });

  const events = exams
    .map((exam) =>
      buildS2220Payload({
        company,
        employee: {
          firstName: exam.workforceMember.firstName,
          lastName: exam.workforceMember.lastName,
          email: exam.workforceMember.email,
          cpf: exam.workforceMember.cpf ?? undefined,
          matricula: exam.workforceMember.matriculaEsocial ?? undefined,
        },
        exam,
      }),
    )
    .filter(Boolean);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    count: events.length,
    events,
  });
}
