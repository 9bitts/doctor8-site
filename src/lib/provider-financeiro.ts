import { db } from "@/lib/db";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import { EAP_BOOKING_SOURCE } from "@/lib/employer-eap-booking";
import { isStripeConnectEnabled } from "@/lib/stripe-connect";
import { COMMISSION_RATE, commissionCentsOf } from "@/lib/rateio";

const DEFAULT_EAP_REPASSE_PERCENT = 70;

export type FinanceProviderField =
  | "professionalId"
  | "psychoanalystId"
  | "integrativeTherapistId";

export function getFinancePeriodDates(period: string): { from: Date; to: Date } {
  const now = new Date();
  switch (period) {
    case "last_month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
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
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    if (!map[key]) map[key] = { label, net: 0, gross: 0, count: 0 };
    map[key].net += net;
    map[key].gross += gross;
    map[key].count += 1;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

export async function buildProviderFinanceiroReport(params: {
  providerId: string;
  providerField: FinanceProviderField;
  currency: string;
  period: string;
  includeJit?: boolean;
}) {
  const { providerId, providerField, currency, period, includeJit = false } = params;
  const { from, to } = getFinancePeriodDates(period);

  const appointmentWhere =
    providerField === "professionalId"
      ? { professionalId: providerId }
      : providerField === "psychoanalystId"
        ? { psychoanalystId: providerId }
        : { integrativeTherapistId: providerId };

  const appointments = await db.appointment.findMany({
    where: {
      ...appointmentWhere,
      status: "COMPLETED",
      paidAt: { not: null },
      scheduledAt: { gte: from, lte: to },
    },
    select: {
      id: true,
      scheduledAt: true,
      priceAmount: true,
      currency: true,
      type: true,
      bookingSource: true,
      employerWorkforceMember: {
        select: { employerCompanyId: true },
      },
      patient: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { scheduledAt: "desc" },
  });

  const eapAppointments = appointments.filter((a) => a.bookingSource === EAP_BOOKING_SOURCE);
  const repasseByCompany = new Map<string, number>();
  if (eapAppointments.length > 0 && providerField === "professionalId") {
    const companyIds = [
      ...new Set(
        eapAppointments
          .map((a) => a.employerWorkforceMember?.employerCompanyId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (companyIds.length > 0) {
      const links = await db.employerLinkedPsychologist.findMany({
        where: {
          professionalId: providerId,
          employerCompanyId: { in: companyIds },
          status: "ACTIVE",
        },
        select: { employerCompanyId: true, repassePercent: true },
      });
      for (const link of links) {
        repasseByCompany.set(link.employerCompanyId, link.repassePercent);
      }
    }
  }

  const transactions: {
    id: string;
    date: string;
    type: string;
    patientInitials: string;
    grossCents: number;
    commissionCents: number;
    netCents: number;
    currency: string;
    status: string;
    payoutDirect: boolean;
  }[] = [];

  const connectSplitActive = isStripeConnectEnabled();

  const payoutByAppointmentId = new Map<
    string,
    { status: string; transferEligibleAt: Date }
  >();
  if (connectSplitActive && providerField === "professionalId" && appointments.length > 0) {
    const payouts = await db.consultationProfessionalPayout.findMany({
      where: {
        appointmentId: { in: appointments.map((a) => a.id) },
      },
      select: { appointmentId: true, status: true, transferEligibleAt: true },
    });
    for (const p of payouts) {
      payoutByAppointmentId.set(p.appointmentId, {
        status: p.status,
        transferEligibleAt: p.transferEligibleAt,
      });
    }
  }

  for (const appt of appointments) {
    const gross = appt.priceAmount || 0;
    const isEap = appt.bookingSource === EAP_BOOKING_SOURCE;
    let commission: number;
    let net: number;
    let txType: string;
    if (isEap) {
      const companyId = appt.employerWorkforceMember?.employerCompanyId;
      const repassePct = companyId
        ? (repasseByCompany.get(companyId) ?? DEFAULT_EAP_REPASSE_PERCENT)
        : DEFAULT_EAP_REPASSE_PERCENT;
      net = Math.round(gross * repassePct / 100);
      commission = gross - net;
      txType = "EAP_CORPORATE";
    } else {
      commission = commissionCentsOf(gross);
      net = gross - commission;
      txType = appt.type === "TELECONSULT" ? "TELECONSULT" : "IN_PERSON";
    }
    const p = appt.patient;
    const first = safeDecrypt(p?.firstName ?? "");
    const last = safeDecrypt(p?.lastName ?? "");
    const initials = p ? `${first.charAt(0)}${last.charAt(0)}` || "??" : "??";
    const payout = payoutByAppointmentId.get(appt.id);
    let txStatus = "paid";
    let payoutDirect = false;
    if (connectSplitActive && !isEap) {
      if (payout?.status === "TRANSFERRED") {
        txStatus = "stripe_direct";
        payoutDirect = true;
      } else if (payout?.status === "PENDING") {
        txStatus = "pending_payout";
      }
    }
    transactions.push({
      id: appt.id,
      date: appt.scheduledAt.toISOString(),
      type: txType,
      patientInitials: initials,
      grossCents: gross,
      commissionCents: commission,
      netCents: net,
      currency: appt.currency || currency || "BRL",
      status: txStatus,
      payoutDirect,
    });
  }

  if (includeJit && providerField === "professionalId") {
    const jitPayments = await db.jitPayment.findMany({
      where: {
        queueEntry: { session: { professionalId: providerId } },
        status: "paid",
        createdAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        createdAt: true,
        queueEntry: {
          select: {
            patientUser: { select: { id: true } },
            employerWorkforceMember: { select: { employerCompanyId: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const jitCompanyIds = [
      ...new Set(
        jitPayments
          .map((jp) => jp.queueEntry?.employerWorkforceMember?.employerCompanyId)
          .filter((id): id is string => Boolean(id)),
      ),
    ].filter((id) => !repasseByCompany.has(id));
    if (jitCompanyIds.length > 0) {
      const links = await db.employerLinkedPsychologist.findMany({
        where: {
          professionalId: providerId,
          employerCompanyId: { in: jitCompanyIds },
          status: "ACTIVE",
        },
        select: { employerCompanyId: true, repassePercent: true },
      });
      for (const link of links) {
        repasseByCompany.set(link.employerCompanyId, link.repassePercent);
      }
    }

    for (const jp of jitPayments) {
      const gross = jp.amount || 0;
      const companyId = jp.queueEntry?.employerWorkforceMember?.employerCompanyId;
      const isEapJit = Boolean(companyId);
      let commission: number;
      let net: number;
      let txType: string;
      if (isEapJit && companyId) {
        const repassePct = repasseByCompany.get(companyId) ?? DEFAULT_EAP_REPASSE_PERCENT;
        net = Math.round(gross * repassePct / 100);
        commission = gross - net;
        txType = "EAP_CORPORATE";
      } else {
        commission = commissionCentsOf(gross);
        net = gross - commission;
        txType = "JIT";
      }
      const uid = jp.queueEntry?.patientUser?.id || "";
      const initials = uid ? uid.slice(0, 2).toUpperCase() : "??";
      transactions.push({
        id: jp.id,
        date: jp.createdAt.toISOString(),
        type: txType,
        patientInitials: initials,
        grossCents: gross,
        commissionCents: commission,
        netCents: net,
        currency: jp.currency || currency || "BRL",
        status: connectSplitActive && !isEapJit ? "stripe_direct" : "paid",
        payoutDirect: connectSplitActive && !isEapJit,
      });
    }
  }

  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalGrossCents = transactions.reduce((s, t) => s + t.grossCents, 0);
  const totalCommissionCents = transactions.reduce((s, t) => s + t.commissionCents, 0);
  const totalNetCents = transactions.reduce((s, t) => s + t.netCents, 0);
  const totalCount = transactions.length;

  const byType: Record<string, { grossCents: number; netCents: number; count: number }> = {};
  for (const t of transactions) {
    if (!byType[t.type]) byType[t.type] = { grossCents: 0, netCents: 0, count: 0 };
    byType[t.type].grossCents += t.grossCents;
    byType[t.type].netCents += t.netCents;
    byType[t.type].count += 1;
  }

  const chartData = groupByMonth(
    transactions.map((t) => ({
      date: new Date(t.date),
      net: t.netCents,
      gross: t.grossCents,
    })),
  );

  let projection: number | null = null;
  if (period === "this_month") {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (dayOfMonth > 0 && totalNetCents > 0) {
      projection = Math.round((totalNetCents / dayOfMonth) * daysInMonth);
    }
  }

  return {
    period,
    from: from.toISOString(),
    to: to.toISOString(),
    currency: currency || "BRL",
    commissionRate: COMMISSION_RATE,
    connectSplitEnabled: connectSplitActive,
    totalGrossCents,
    totalCommissionCents,
    totalNetCents,
    totalCount,
    projectionCents: projection,
    byType,
    chartData,
    transactions,
  };
}
