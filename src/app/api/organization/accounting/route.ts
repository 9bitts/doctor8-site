import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, canViewFinance, getOrganizationProfessionalIds } from "@/lib/organization-auth";
import { db } from "@/lib/db";
import { buildAccountingCsv } from "@/lib/tiss-export";

export async function GET(req: NextRequest) {
  const ctx = await requireOrganization();
  if ("error" in ctx) return ctx.error;

  if (!canViewFinance(ctx.memberRole) && ctx.memberRole !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const month = req.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0, 23, 59, 59);

  const format = req.nextUrl.searchParams.get("format");

  const [ledger, payroll, tissPaid, appointments] = await Promise.all([
    db.organizationLedgerEntry.findMany({
      where: { organizationId: ctx.organizationId, createdAt: { gte: from, lte: to } },
    }),
    db.organizationPayrollEntry.findMany({
      where: { organizationId: ctx.organizationId, referenceMonth: month },
      include: { employee: { select: { fullName: true } } },
    }),
    db.tissGuide.findMany({
      where: { organizationId: ctx.organizationId, status: "PAID", serviceDate: { gte: from, lte: to } },
    }),
    (async () => {
      const profIds = await getOrganizationProfessionalIds(ctx.organizationId);
      if (profIds.length === 0) return [];
      return db.appointment.findMany({
        where: {
          professionalId: { in: profIds },
          status: "COMPLETED",
          paidAt: { not: null },
          scheduledAt: { gte: from, lte: to },
        },
        select: { priceAmount: true, scheduledAt: true },
      });
    })(),
  ]);

  const incomeLedger = ledger.filter((e) => e.type === "INCOME" && e.status === "PAID").reduce((s, e) => s + e.amountCents, 0);
  const expenseLedger = ledger.filter((e) => e.type === "EXPENSE" && e.status === "PAID").reduce((s, e) => s + e.amountCents, 0);
  const payrollTotal = payroll.filter((p) => p.status === "PAID").reduce((s, p) => s + p.netCents, 0);
  const tissRevenue = tissPaid.reduce((s, g) => s + g.amountCents, 0);
  const appointmentRevenue = appointments.reduce((s, a) => s + (a.priceAmount || 0), 0);

  const dre = {
    month,
    currency: ctx.organization.currency,
    receitaConsultas: appointmentRevenue,
    receitaConvenios: tissRevenue,
    receitaOutras: incomeLedger,
    receitaTotal: appointmentRevenue + tissRevenue + incomeLedger,
    despesasOperacionais: expenseLedger,
    folhaPagamento: payrollTotal,
    despesasTotal: expenseLedger + payrollTotal,
    resultado: appointmentRevenue + tissRevenue + incomeLedger - expenseLedger - payrollTotal,
  };

  if (format === "csv") {
    const rows = [
      ...ledger.map((e) => ({
        tipo: "LANCAMENTO",
        categoria: e.category || "",
        descricao: e.description,
        natureza: e.type,
        status: e.status,
        valor: (e.amountCents / 100).toFixed(2),
        vencimento: e.dueDate?.toISOString().slice(0, 10) || "",
        pago_em: e.paidAt?.toISOString().slice(0, 10) || "",
      })),
      ...payroll.map((p) => ({
        tipo: "FOLHA",
        categoria: "RH",
        descricao: p.employee.fullName,
        natureza: "EXPENSE",
        status: p.status,
        valor: (p.netCents / 100).toFixed(2),
        vencimento: p.referenceMonth,
        pago_em: p.paidAt?.toISOString().slice(0, 10) || "",
      })),
      ...tissPaid.map((g) => ({
        tipo: "TISS",
        categoria: "CONVENIO",
        descricao: g.patientName,
        natureza: "INCOME",
        status: g.status,
        valor: (g.amountCents / 100).toFixed(2),
        vencimento: g.serviceDate.toISOString().slice(0, 10),
        pago_em: "",
      })),
    ];

    const csv = buildAccountingCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="contabilidade-${month}.csv"`,
      },
    });
  }

  return NextResponse.json({ dre, ledgerCount: ledger.length, payrollCount: payroll.length });
}
