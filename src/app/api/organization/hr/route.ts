import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationApi, isApiError } from "@/lib/api-auth";
import { canViewFinance } from "@/lib/organization-auth";

import { db } from "@/lib/db";
import { z } from "zod";
import { dateOnlyRangeInTz } from "@/lib/timezone";

/** Brazilian organizations — report/filter boundaries use America/Sao_Paulo. */
const ORG_REPORT_TZ = "America/Sao_Paulo";

export async function GET() {
  const ctx = await requireOrganizationApi();
  if (isApiError(ctx)) return ctx.error;

  const [employees, payroll] = await Promise.all([
    db.organizationEmployee.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { fullName: "asc" },
    }),
    db.organizationPayrollEntry.findMany({
      where: { organizationId: ctx.organizationId },
      include: { employee: { select: { fullName: true } } },
      orderBy: { referenceMonth: "desc" },
      take: 100,
    }),
  ]);

  return NextResponse.json({
    employees: employees.map((e) => ({
      id: e.id,
      fullName: e.fullName,
      email: e.email,
      employmentType: e.employmentType,
      jobTitle: e.jobTitle,
      salaryCents: e.salaryCents,
      startDate: e.startDate.toISOString(),
      active: e.active,
      professionalId: e.professionalId,
    })),
    payroll: payroll.map((p) => ({
      id: p.id,
      employeeId: p.employeeId,
      employeeName: p.employee.fullName,
      referenceMonth: p.referenceMonth,
      grossCents: p.grossCents,
      deductionsCents: p.deductionsCents,
      netCents: p.netCents,
      status: p.status,
      paidAt: p.paidAt?.toISOString() ?? null,
    })),
    canManage: canViewFinance(ctx.memberRole) || ctx.memberRole === "HR" || ctx.memberRole === "OWNER" || ctx.memberRole === "ADMIN",
  });
}

const employeeSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional(),
  cpf: z.string().optional(),
  employmentType: z.enum(["CLT", "PJ", "ASSOCIATE"]),
  jobTitle: z.string().optional(),
  salaryCents: z.number().int().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  professionalId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireOrganizationApi(["OWNER", "ADMIN", "HR"]);
  if (isApiError(ctx)) return ctx.error;

  const parsed = employeeSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const emp = await db.organizationEmployee.create({
    data: {
      organizationId: ctx.organizationId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      cpf: parsed.data.cpf,
      employmentType: parsed.data.employmentType,
      jobTitle: parsed.data.jobTitle,
      salaryCents: parsed.data.salaryCents,
      startDate: dateOnlyRangeInTz(parsed.data.startDate, ORG_REPORT_TZ).start,
      professionalId: parsed.data.professionalId,
    },
  });

  return NextResponse.json({ id: emp.id }, { status: 201 });
}

const payrollSchema = z.object({
  employeeId: z.string(),
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
  grossCents: z.number().int().positive(),
  deductionsCents: z.number().int().default(0),
  notes: z.string().optional(),
});

export async function PUT(req: NextRequest) {
  const ctx = await requireOrganizationApi(["OWNER", "ADMIN", "HR", "FINANCE"]);
  if (isApiError(ctx)) return ctx.error;

  const parsed = payrollSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const emp = await db.organizationEmployee.findFirst({
    where: { id: parsed.data.employeeId, organizationId: ctx.organizationId },
  });
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const netCents = parsed.data.grossCents - parsed.data.deductionsCents;

  const entry = await db.organizationPayrollEntry.upsert({
    where: {
      employeeId_referenceMonth: {
        employeeId: parsed.data.employeeId,
        referenceMonth: parsed.data.referenceMonth,
      },
    },
    create: {
      organizationId: ctx.organizationId,
      employeeId: parsed.data.employeeId,
      referenceMonth: parsed.data.referenceMonth,
      grossCents: parsed.data.grossCents,
      deductionsCents: parsed.data.deductionsCents,
      netCents,
      notes: parsed.data.notes,
    },
    update: {
      grossCents: parsed.data.grossCents,
      deductionsCents: parsed.data.deductionsCents,
      netCents,
      notes: parsed.data.notes,
    },
  });

  return NextResponse.json({ id: entry.id });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireOrganizationApi(["OWNER", "ADMIN", "HR", "FINANCE"]);
  if (isApiError(ctx)) return ctx.error;

  const { id, status } = await req.json() as { id: string; status: string };
  if (!id || status !== "PAID") return NextResponse.json({ error: "Invalid" }, { status: 400 });

  await db.organizationPayrollEntry.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: { status: "PAID", paidAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
