// src/app/api/professional/financeiro/route.ts
// Retorna dados financeiros do profissional autenticado.
// Inclui: consultas agendadas pagas + plantão online pago.
// Comissão Doctor8: 15% do valor bruto.
// Query params: period = "this_month" | "last_month" | "3_months" | "6_months" | "this_year" | "all"

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const COMMISSION_RATE = 0.15; // 15% Doctor8

function getPeriodDates(period: string): { from: Date; to: Date } {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "last_month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { from, to };
    }
    case "3_months": {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { from, to: now };
    }
    case "6_months": {
      const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return { from, to: now };
    }
    case "this_year": {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from, to: now };
    }
    case "all": {
      return { from: new Date("2020-01-01"), to: now };
    }
    case "this_month":
    default: {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to: now };
    }
  }
}

function groupByMonth(items: { date: Date; net: number; gross: number }[]) {
  const map: Record<string, { label: string; net: number; gross: number; count: number }> = {};
  items.forEach(({ date, net, gross }) => {
    const key   = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    if (!map[key]) map[key] = { label, net: 0, gross: 0, count: 0 };
    map[key].net   += net;
    map[key].gross += gross;
    map[key].count += 1;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "this_month";
  const { from, to } = getPeriodDates(period);

  const professional = await db.professionalProfile.findUnique({
    where:  { userId: session.user.id },
    select: { id: true, firstName: true, lastName: true, currency: true },
  });
  if (!professional)
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // ── 1. Consultas agendadas pagas ──────────────────────────────────────────
  const appointments = await db.appointment.findMany({
    where: {
      professionalId: professional.id,
      status:         "COMPLETED",
      paidAt:         { not: null },
      scheduledAt:    { gte: from, lte: to },
    },
    select: {
      id:          true,
      scheduledAt: true,
      priceAmount: true,
      currency:    true,
      type:        true,
      patient: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { scheduledAt: "desc" },
  });

  // ── 2. Plantão Online pago ────────────────────────────────────────────────
  const jitPayments = await db.jitPayment.findMany({
    where: {
      queueEntry: { session: { professionalId: professional.id } },
      status:     "paid",
      createdAt:  { gte: from, lte: to },
    },
    select: {
      id:        true,
      amount:    true,
      currency:  true,
      createdAt: true,
      queueEntry: {
        select: {
          patientUser: {
            select: { id: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // ── Build transaction list ─────────────────────────────────────────────────
  const transactions: {
    id:         string;
    date:       string;
    type:       string;
    patientInitials: string;
    grossCents: number;
    commissionCents: number;
    netCents:   number;
    currency:   string;
    status:     string;
  }[] = [];

  for (const appt of appointments) {
    const gross      = appt.priceAmount || 0;
    const commission = Math.round(gross * COMMISSION_RATE);
    const net        = gross - commission;
    const p          = appt.patient;
    const initials   = p ? `${p.firstName.charAt(0)}${p.lastName.charAt(0)}` : "??";
    transactions.push({
      id:              appt.id,
      date:            appt.scheduledAt.toISOString(),
      type:            appt.type === "TELECONSULT" ? "Teleconsulta" : "Presencial",
      patientInitials: initials,
      grossCents:      gross,
      commissionCents: commission,
      netCents:        net,
      currency:        appt.currency || professional.currency || "BRL",
      status:          "paid",
    });
  }

  for (const jp of jitPayments) {
    const gross      = jp.amount || 0;
    const commission = Math.round(gross * COMMISSION_RATE);
    const net        = gross - commission;
    const uid      = jp.queueEntry?.patientUser?.id || "";
    const initials = uid ? uid.slice(0, 2).toUpperCase() : "??";
    transactions.push({
      id:              jp.id,
      date:            jp.createdAt.toISOString(),
      type:            "Plantão Online",
      patientInitials: initials,
      grossCents:      gross,
      commissionCents: commission,
      netCents:        net,
      currency:        jp.currency || professional.currency || "BRL",
      status:          "paid",
    });
  }

  // Sort all transactions by date desc
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalGrossCents      = transactions.reduce((s, t) => s + t.grossCents,      0);
  const totalCommissionCents = transactions.reduce((s, t) => s + t.commissionCents, 0);
  const totalNetCents        = transactions.reduce((s, t) => s + t.netCents,        0);
  const totalCount           = transactions.length;

  // ── By type ───────────────────────────────────────────────────────────────
  const byType: Record<string, { grossCents: number; netCents: number; count: number }> = {};
  for (const t of transactions) {
    if (!byType[t.type]) byType[t.type] = { grossCents: 0, netCents: 0, count: 0 };
    byType[t.type].grossCents += t.grossCents;
    byType[t.type].netCents   += t.netCents;
    byType[t.type].count      += 1;
  }

  // ── Chart data (monthly) ──────────────────────────────────────────────────
  const chartItems = transactions.map(t => ({
    date:  new Date(t.date),
    net:   t.netCents,
    gross: t.grossCents,
  }));
  const chartData = groupByMonth(chartItems);

  // ── Projeção do mês atual ─────────────────────────────────────────────────
  let projection: number | null = null;
  if (period === "this_month") {
    const now        = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth= new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (dayOfMonth > 0 && totalNetCents > 0) {
      projection = Math.round((totalNetCents / dayOfMonth) * daysInMonth);
    }
  }

  const currency = professional.currency || "BRL";

  return NextResponse.json({
    period,
    from:              from.toISOString(),
    to:                to.toISOString(),
    currency,
    commissionRate:    COMMISSION_RATE,
    totalGrossCents,
    totalCommissionCents,
    totalNetCents,
    totalCount,
    projectionCents:   projection,
    byType,
    chartData,
    transactions,
  });
}
