import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOccupationalPhysicianApi } from "@/lib/api-auth";
import { userHasCompanyAccess } from "@/lib/occupational-physician-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { EmployerAsoResult, EmployerExamStatus } from "@prisma/client";

const patchSchema = z.object({
  employerCompanyId: z.string(),
  examId: z.string(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  asoResult: z.enum(["APTO", "APTO_COM_RESTRICAO", "INAPTO"]).optional(),
  asoRestrictions: z.string().max(2000).optional(),
  physicianName: z.string().max(200).optional(),
  physicianCrm: z.string().max(30).optional(),
  notes: z.string().max(2000).optional(),
});

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

  const updated = await db.employerOccupationalExam.update({
    where: { id: exam.id },
    data: {
      status: parsed.data.status as EmployerExamStatus | undefined,
      asoResult: parsed.data.asoResult as EmployerAsoResult | undefined,
      asoRestrictions: parsed.data.asoRestrictions,
      physicianName: parsed.data.physicianName ?? physician?.fullName ?? undefined,
      physicianCrm: parsed.data.physicianCrm ?? physician?.crm ?? undefined,
      notes: parsed.data.notes,
      completedAt:
        parsed.data.status === "COMPLETED" || parsed.data.asoResult
          ? new Date()
          : undefined,
    },
  });

  if (parsed.data.asoResult && updated.completedAt) {
    await db.employerDocumentSignature.create({
      data: {
        employerCompanyId: parsed.data.employerCompanyId,
        docType: "ASO",
        docRefId: updated.id,
        signedByName: updated.physicianName ?? physician?.fullName ?? "Médico do trabalho",
        signedByRegistro: updated.physicianCrm ?? physician?.crm,
        signedByRole: "MEDICO_TRABALHO",
        notes: `ASO ${parsed.data.asoResult}`,
      },
    });
  }

  return NextResponse.json({ exam: updated });
}
