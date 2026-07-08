import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { assertWorkforceCapacity } from "@/lib/employer-plan-enforcement";
import { parseWorkforceCsv } from "@/lib/employer-workforce-csv";
import { db } from "@/lib/db";

const schema = z.object({
  csv: z.string().min(1).max(500_000),
});

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "HR", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { rows, errors: parseErrors } = parseWorkforceCsv(parsed.data.csv);
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma linha válida.", parseErrors },
      { status: 400 },
    );
  }

  const existingEmails = new Set(
    (
      await db.employerWorkforceMember.findMany({
        where: { employerCompanyId: ctx.employerCompanyId },
        select: { email: true },
      })
    ).map((m) => m.email.toLowerCase()),
  );

  const newEmails = rows.filter((r) => !existingEmails.has(r.email));
  if (newEmails.length > 0) {
    const capacity = await assertWorkforceCapacity(ctx.employerCompanyId);
    if (!capacity.ok) {
      return NextResponse.json(
        {
          error: "WORKFORCE_LIMIT",
          message: `Limite do plano (${capacity.limits.tier}): ${capacity.limits.maxWorkforce} colaboradores.`,
          current: capacity.current,
          max: capacity.limits.maxWorkforce,
          wouldAdd: newEmails.length,
        },
        { status: 400 },
      );
    }
    const remaining = capacity.limits.maxWorkforce - capacity.current;
    if (newEmails.length > remaining) {
      return NextResponse.json(
        {
          error: "WORKFORCE_LIMIT",
          message: `Importação excede o limite: ${remaining} vaga(s) restante(s), ${newEmails.length} novos.`,
          current: capacity.current,
          max: capacity.limits.maxWorkforce,
        },
        { status: 400 },
      );
    }
  }

  let created = 0;
  let updated = 0;
  const rowErrors: string[] = [...parseErrors];

  for (const row of rows) {
    try {
      const existing = await db.employerWorkforceMember.findUnique({
        where: {
          employerCompanyId_email: {
            employerCompanyId: ctx.employerCompanyId,
            email: row.email,
          },
        },
        select: { id: true },
      });

      await db.employerWorkforceMember.upsert({
        where: {
          employerCompanyId_email: {
            employerCompanyId: ctx.employerCompanyId,
            email: row.email,
          },
        },
        create: {
          employerCompanyId: ctx.employerCompanyId,
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          department: row.department,
          jobTitle: row.jobTitle,
          status: "INVITED",
        },
        update: {
          firstName: row.firstName,
          lastName: row.lastName,
          department: row.department,
          jobTitle: row.jobTitle,
        },
      });

      if (existing) updated += 1;
      else created += 1;
    } catch {
      rowErrors.push(`Falha ao importar ${row.email}.`);
    }
  }

  return NextResponse.json({
    created,
    updated,
    total: rows.length,
    errors: rowErrors,
  });
}
