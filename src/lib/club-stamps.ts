// Club Doctor stamp card - earn, balance, diversity bonus, redemption.

import type { ProfessionalKind } from "@prisma/client";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import {
  STAMPS_FOR_FREE_MONTH,
  DIVERSITY_KINDS_REQUIRED,
  DIVERSITY_WINDOW_MS,
  kindFromAppointment,
  kindFromHealthSpecialty,
} from "@/lib/provider-kind";

export { STAMPS_FOR_FREE_MONTH } from "@/lib/provider-kind";

export interface StampBalance {
  balance: number;
  stampsToFreeMonth: number;
  readyForFreeMonth: boolean;
  kindsInWindow: ProfessionalKind[];
  kindsNeededForBonus: number;
  lastEntries: {
    eventType: string;
    delta: number;
    description: string | null;
    createdAt: string;
  }[];
}

async function currentBalance(userId: string): Promise<number> {
  const last = await db.clubStampEntry.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { balanceAfter: true },
  });
  return last?.balanceAfter ?? 0;
}

async function appendEntry(data: {
  userId: string;
  eventType: "CONSULTATION" | "SUBSCRIPTION" | "DIVERSITY_BONUS" | "REDEMPTION";
  delta: number;
  appointmentId?: string;
  jitQueueId?: string;
  stripeInvoiceId?: string;
  stripeEventId?: string;
  professionalKind?: ProfessionalKind;
  description?: string;
}): Promise<{ awarded: boolean; balance: number }> {
  if (data.stripeInvoiceId) {
    const existing = await db.clubStampEntry.findFirst({
      where: { stripeInvoiceId: data.stripeInvoiceId, eventType: data.eventType },
      select: { id: true, balanceAfter: true },
    });
    if (existing) return { awarded: false, balance: existing.balanceAfter };
  }

  const orClauses = [
    data.appointmentId ? { appointmentId: data.appointmentId } : null,
    data.jitQueueId ? { jitQueueId: data.jitQueueId } : null,
    data.stripeEventId ? { stripeEventId: data.stripeEventId } : null,
  ].filter(Boolean) as object[];

  if (orClauses.length > 0) {
    const existing = await db.clubStampEntry.findFirst({
      where: { OR: orClauses },
      select: { id: true, balanceAfter: true },
    });
    if (existing) return { awarded: false, balance: existing.balanceAfter };
  }

  const prev = await currentBalance(data.userId);
  const balanceAfter = prev + data.delta;

  await db.clubStampEntry.create({
    data: {
      userId: data.userId,
      eventType: data.eventType,
      delta: data.delta,
      balanceAfter,
      appointmentId: data.appointmentId,
      jitQueueId: data.jitQueueId,
      stripeInvoiceId: data.stripeInvoiceId,
      stripeEventId: data.stripeEventId,
      professionalKind: data.professionalKind,
      description: data.description,
    },
  });

  return { awarded: true, balance: balanceAfter };
}

export async function getStampBalance(userId: string): Promise<StampBalance> {
  const balance = await currentBalance(userId);
  const since = new Date(Date.now() - DIVERSITY_WINDOW_MS);

  const consultKinds = await db.clubStampEntry.findMany({
    where: {
      userId,
      eventType: "CONSULTATION",
      professionalKind: { not: null },
      createdAt: { gte: since },
    },
    select: { professionalKind: true },
    distinct: ["professionalKind"],
  });
  const kindsInWindow = consultKinds
    .map((k) => k.professionalKind)
    .filter((k): k is ProfessionalKind => k != null);

  const lastEntries = await db.clubStampEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { eventType: true, delta: true, description: true, createdAt: true },
  });

  return {
    balance,
    stampsToFreeMonth: Math.max(0, STAMPS_FOR_FREE_MONTH - balance),
    readyForFreeMonth: balance >= STAMPS_FOR_FREE_MONTH,
    kindsInWindow,
    kindsNeededForBonus: Math.max(0, DIVERSITY_KINDS_REQUIRED - kindsInWindow.length),
    lastEntries: lastEntries.map((e) => ({
      eventType: e.eventType,
      delta: e.delta,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

async function maybeAwardDiversityBonus(userId: string): Promise<void> {
  const since = new Date(Date.now() - DIVERSITY_WINDOW_MS);
  const recentAward = await db.clubDiversityAward.findFirst({
    where: { userId, awardedAt: { gte: since } },
    select: { id: true },
  });
  if (recentAward) return;

  const consultKinds = await db.clubStampEntry.findMany({
    where: {
      userId,
      eventType: "CONSULTATION",
      professionalKind: { not: null },
      createdAt: { gte: since },
    },
    select: { professionalKind: true },
    distinct: ["professionalKind"],
  });
  const kinds = consultKinds
    .map((k) => k.professionalKind)
    .filter((k): k is ProfessionalKind => k != null);

  if (kinds.length < DIVERSITY_KINDS_REQUIRED) return;

  const bonusKey = `diversity:${userId}:${Date.now()}`;
  const result = await appendEntry({
    userId,
    eventType: "DIVERSITY_BONUS",
    delta: 1,
    stripeEventId: bonusKey,
    description: `Bonus: ${kinds.length} tipos de profissional em 12 meses`,
  });
  if (!result.awarded) return;

  await db.clubDiversityAward.create({
    data: { userId, kinds },
  });
}

export async function awardConsultationStamp(
  userId: string,
  opts: {
    appointmentId?: string;
    jitQueueId?: string;
    professionalKind: ProfessionalKind;
  },
): Promise<void> {
  const result = await appendEntry({
    userId,
    eventType: "CONSULTATION",
    delta: 1,
    appointmentId: opts.appointmentId,
    jitQueueId: opts.jitQueueId,
    professionalKind: opts.professionalKind,
    description: "Consulta concluida e paga",
  });
  if (result.awarded) {
    await maybeAwardDiversityBonus(userId);
  }
}

export async function awardSubscriptionStamp(
  userId: string,
  stripeInvoiceId: string,
): Promise<void> {
  await appendEntry({
    userId,
    eventType: "SUBSCRIPTION",
    delta: 1,
    stripeInvoiceId,
    description: "Mensalidade Club Doctor paga",
  });
}

export async function redeemStampsForInvoice(
  userId: string,
  stripeCustomerId: string,
  stripeInvoiceId: string,
  amountCents: number,
  currency: string,
): Promise<{ redeemed: boolean; balance: number }> {
  const existing = await db.clubStampEntry.findFirst({
    where: { stripeInvoiceId, eventType: "REDEMPTION" },
    select: { balanceAfter: true },
  });
  if (existing) return { redeemed: false, balance: existing.balanceAfter };

  const balance = await currentBalance(userId);
  if (balance < STAMPS_FOR_FREE_MONTH) {
    return { redeemed: false, balance };
  }

  await stripe.customers.createBalanceTransaction(stripeCustomerId, {
    amount: -amountCents,
    currency: currency.toLowerCase(),
    description: "Club Doctor - 10 carimbos resgatados",
  });

  const result = await appendEntry({
    userId,
    eventType: "REDEMPTION",
    delta: -STAMPS_FOR_FREE_MONTH,
    stripeInvoiceId,
    description: "Resgate: mensalidade Club Doctor gratis",
  });

  return { redeemed: result.awarded, balance: result.balance };
}

export async function tryStampForCompletedAppointment(appointmentId: string): Promise<void> {
  const appt = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      status: true,
      paidAt: true,
      providerType: true,
      patient: { select: { userId: true } },
      professional: { select: { specialty: true } },
    },
  });
  if (!appt || appt.status !== "COMPLETED" || !appt.paidAt) return;

  const kind = kindFromAppointment(appt.providerType, appt.professional?.specialty);
  await awardConsultationStamp(appt.patient.userId, {
    appointmentId: appt.id,
    professionalKind: kind,
  });
}

export async function tryStampForCompletedJitQueue(queueId: string): Promise<void> {
  const entry = await db.jitQueue.findUnique({
    where: { id: queueId },
    select: {
      id: true,
      patientUserId: true,
      status: true,
      payment: { select: { status: true, amount: true } },
      session: { select: { professional: { select: { specialty: true } } } },
    },
  });
  if (!entry || entry.status !== "DONE") return;
  if (!entry.payment || entry.payment.status !== "paid" || entry.payment.amount <= 0) return;

  const kind = kindFromHealthSpecialty(entry.session.professional.specialty);
  await awardConsultationStamp(entry.patientUserId, {
    jitQueueId: entry.id,
    professionalKind: kind,
  });
}
