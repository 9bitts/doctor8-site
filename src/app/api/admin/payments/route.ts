// src/app/api/admin/payments/route.ts
// ADMIN ONLY — list appointment payments + totals.
// Source of truth: Appointment (priceAmount, currency, status, paidAt, stripePaymentId).
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // We consider an appointment a "payment row" if it has a price.
  const appts = await db.appointment.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      patient: { select: { firstName: true, lastName: true } },
      professional: { select: { firstName: true, lastName: true } },
    },
  });

  const payments = appts.map((a) => {
    const paid = !!a.paidAt;
    return {
      id: a.id,
      patientName: `${safeDecrypt(a.patient.firstName)} ${safeDecrypt(a.patient.lastName)}`.trim() || "—",
      doctorName: `${a.professional.firstName} ${a.professional.lastName}`.trim() || "—",
      amount: a.priceAmount,          // cents
      currency: a.currency,
      status: a.status,                // appointment status
      paid,
      paidAt: a.paidAt ? a.paidAt.toISOString() : null,
      stripePaymentId: a.stripePaymentId ?? null,
      scheduledAt: a.scheduledAt.toISOString(),
      createdAt: a.createdAt.toISOString(),
    };
  });

  // Totals (only paid)
  const totalsByCurrency = new Map<string, { paidCount: number; paidAmount: number }>();
  for (const p of payments) {
    if (!p.paid) continue;
    const cur = p.currency || "USD";
    const t = totalsByCurrency.get(cur) || { paidCount: 0, paidAmount: 0 };
    t.paidCount += 1;
    t.paidAmount += p.amount || 0;
    totalsByCurrency.set(cur, t);
  }
  const totals = Array.from(totalsByCurrency.entries()).map(([currency, t]) => ({
    currency, paidCount: t.paidCount, paidAmount: t.paidAmount,
  }));

  return NextResponse.json({ payments, totals });
}
