import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import type { EmployerAsoResult, EmployerExamStatus } from "@prisma/client";

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
  notes: z.string().max(2000).optional().nullable(),
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
  const exam = await db.employerOccupationalExam.update({
    where: { id },
    data: {
      status: data.status as EmployerExamStatus | undefined,
      scheduledAt: data.scheduledAt === null ? null : data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
      completedAt:
        data.completedAt === null
          ? null
          : data.completedAt
            ? new Date(data.completedAt)
            : data.status === "COMPLETED" && !existing.completedAt
              ? new Date()
              : undefined,
      clinicName: data.clinicName === null ? null : data.clinicName,
      asoResult: data.asoResult === null ? null : (data.asoResult as EmployerAsoResult | undefined),
      asoRestrictions: data.asoRestrictions === null ? null : data.asoRestrictions,
      physicianName: data.physicianName === null ? null : data.physicianName,
      physicianCrm: data.physicianCrm === null ? null : data.physicianCrm,
      notes: data.notes === null ? null : data.notes,
    },
  });

  return NextResponse.json({ exam });
}
