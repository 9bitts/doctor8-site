import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";

const patchSchema = z.object({
  cpf: z.string().max(14).optional().nullable(),
  matriculaEsocial: z.string().max(50).optional().nullable(),
  admissionDate: z.string().datetime().optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  sectorId: z.string().optional().nullable(),
  jobFunctionId: z.string().optional().nullable(),
  gheGroupId: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "HR", "SST"]);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const member = await db.employerWorkforceMember.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.employerWorkforceMember.update({
    where: { id },
    data: {
      cpf: parsed.data.cpf === null ? null : parsed.data.cpf?.replace(/\D/g, ""),
      matriculaEsocial: parsed.data.matriculaEsocial === null ? null : parsed.data.matriculaEsocial,
      admissionDate:
        parsed.data.admissionDate === null
          ? null
          : parsed.data.admissionDate
            ? new Date(parsed.data.admissionDate)
            : undefined,
      department: parsed.data.department === null ? null : parsed.data.department,
      jobTitle: parsed.data.jobTitle === null ? null : parsed.data.jobTitle,
      sectorId: parsed.data.sectorId === undefined ? undefined : parsed.data.sectorId,
      jobFunctionId: parsed.data.jobFunctionId === undefined ? undefined : parsed.data.jobFunctionId,
      gheGroupId: parsed.data.gheGroupId === undefined ? undefined : parsed.data.gheGroupId,
    },
  });

  return NextResponse.json({ member: updated });
}
