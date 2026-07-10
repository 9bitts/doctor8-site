import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import {
  computeProfessionalPayoutEligibleAt,
  consultationSplitAmounts,
  resolveProfessionalConnectAccountId,
} from "@/lib/consultation-connect-split";
import {
  getStripeConnectStatusForAccountId,
  isStripeConnectEnabled,
} from "@/lib/stripe-connect";

const PAYOUT_BATCH_SIZE = 40;

export async function scheduleConsultationProfessionalPayout(params: {
  appointmentId: string;
  professionalProfileId: string;
  stripePaymentIntentId: string;
  grossCents: number;
  currency: string;
  paidAt: Date;
  scheduledAt: Date;
}): Promise<void> {
  if (!isStripeConnectEnabled()) return;

  const connectAccountId = await resolveProfessionalConnectAccountId(
    params.professionalProfileId,
  );
  if (!connectAccountId) return;

  const status = await getStripeConnectStatusForAccountId(connectAccountId);
  if (status !== "active") return;

  const { applicationFeeCents, netCents } = consultationSplitAmounts(params.grossCents);
  if (netCents <= 0) return;

  const transferEligibleAt = computeProfessionalPayoutEligibleAt(
    params.paidAt,
    params.scheduledAt,
  );

  await db.consultationProfessionalPayout.upsert({
    where: { appointmentId: params.appointmentId },
    create: {
      appointmentId: params.appointmentId,
      professionalProfileId: params.professionalProfileId,
      stripePaymentIntentId: params.stripePaymentIntentId,
      grossCents: params.grossCents,
      netCents,
      applicationFeeCents,
      currency: params.currency.toLowerCase(),
      connectAccountId,
      transferEligibleAt,
      status: "PENDING",
    },
    update: {},
  });

  if (transferEligibleAt <= new Date()) {
    await executeConsultationProfessionalPayout(params.appointmentId).catch((e) => {
      console.error("[PAYOUT-SCHEDULE-EXEC]", params.appointmentId, e);
    });
  }
}

export async function cancelConsultationProfessionalPayout(
  appointmentId: string,
): Promise<void> {
  await db.consultationProfessionalPayout.updateMany({
    where: { appointmentId, status: "PENDING" },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
}

export async function cancelConsultationProfessionalPayoutByPaymentIntent(
  paymentIntentId: string,
): Promise<void> {
  await db.consultationProfessionalPayout.updateMany({
    where: { stripePaymentIntentId: paymentIntentId, status: "PENDING" },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
}

export async function isConsultationPayoutTransferred(
  paymentIntentId: string,
): Promise<boolean> {
  const row = await db.consultationProfessionalPayout.findFirst({
    where: { stripePaymentIntentId: paymentIntentId, status: "TRANSFERRED" },
    select: { id: true },
  });
  return Boolean(row);
}

export async function executeConsultationProfessionalPayout(
  appointmentId: string,
): Promise<{ transferred: boolean; reason?: string }> {
  const payout = await db.consultationProfessionalPayout.findUnique({
    where: { appointmentId },
    include: {
      appointment: {
        select: { status: true, stripePaymentId: true },
      },
    },
  });

  if (!payout) return { transferred: false, reason: "not_found" };
  if (payout.status === "TRANSFERRED") return { transferred: true, reason: "already_transferred" };
  if (payout.status === "CANCELLED") return { transferred: false, reason: "cancelled" };
  if (payout.status === "FAILED") return { transferred: false, reason: "failed" };
  if (payout.transferEligibleAt > new Date()) {
    return { transferred: false, reason: "not_eligible_yet" };
  }

  if (payout.appointment.status === "CANCELLED") {
    await db.consultationProfessionalPayout.update({
      where: { id: payout.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    return { transferred: false, reason: "appointment_cancelled" };
  }

  const refund = await db.paymentRefund.findFirst({
    where: {
      paymentIntentId: payout.stripePaymentIntentId,
      status: { in: ["SUCCEEDED", "ALREADY_REFUNDED"] },
    },
    select: { id: true },
  });
  if (refund) {
    await db.consultationProfessionalPayout.update({
      where: { id: payout.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    return { transferred: false, reason: "refunded" };
  }

  const connectStatus = await getStripeConnectStatusForAccountId(payout.connectAccountId);
  if (connectStatus !== "active") {
    await db.consultationProfessionalPayout.update({
      where: { id: payout.id },
      data: {
        status: "FAILED",
        failureReason: "connect_account_inactive",
      },
    });
    return { transferred: false, reason: "connect_inactive" };
  }

  try {
    const intent = await stripe.paymentIntents.retrieve(payout.stripePaymentIntentId);
    if (intent.status !== "succeeded") {
      await db.consultationProfessionalPayout.update({
        where: { id: payout.id },
        data: { status: "FAILED", failureReason: "payment_not_succeeded" },
      });
      return { transferred: false, reason: "payment_not_succeeded" };
    }

    const chargeId =
      typeof intent.latest_charge === "string"
        ? intent.latest_charge
        : intent.latest_charge?.id;
    if (!chargeId) {
      await db.consultationProfessionalPayout.update({
        where: { id: payout.id },
        data: { status: "FAILED", failureReason: "missing_charge" },
      });
      return { transferred: false, reason: "missing_charge" };
    }

    const transfer = await stripe.transfers.create(
      {
        amount: payout.netCents,
        currency: payout.currency,
        destination: payout.connectAccountId,
        source_transaction: chargeId,
        metadata: {
          kind: "consultation_professional_payout",
          appointmentId: payout.appointmentId,
          paymentIntentId: payout.stripePaymentIntentId,
        },
      },
      { idempotencyKey: `consultation-payout-${payout.appointmentId}` },
    );

    await db.consultationProfessionalPayout.update({
      where: { id: payout.id },
      data: {
        status: "TRANSFERRED",
        stripeTransferId: transfer.id,
        transferredAt: new Date(),
        failureReason: null,
      },
    });

    console.log(
      `[PAYOUT-TRANSFER] appointment=${payout.appointmentId} transfer=${transfer.id} net=${payout.netCents}`,
    );
    return { transferred: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.consultationProfessionalPayout.update({
      where: { id: payout.id },
      data: { status: "FAILED", failureReason: msg.slice(0, 500) },
    });
    console.error("[PAYOUT-TRANSFER-FAIL]", payout.appointmentId, e);
    return { transferred: false, reason: "stripe_error" };
  }
}

export async function processDueConsultationProfessionalPayouts(): Promise<{
  scanned: number;
  transferred: number;
  skipped: number;
  failed: number;
}> {
  if (!isStripeConnectEnabled()) {
    return { scanned: 0, transferred: 0, skipped: 0, failed: 0 };
  }

  const now = new Date();
  const due = await db.consultationProfessionalPayout.findMany({
    where: {
      status: "PENDING",
      transferEligibleAt: { lte: now },
    },
    orderBy: { transferEligibleAt: "asc" },
    take: PAYOUT_BATCH_SIZE,
    select: { appointmentId: true },
  });

  let transferred = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of due) {
    const result = await executeConsultationProfessionalPayout(row.appointmentId);
    if (result.transferred) transferred += 1;
    else if (result.reason === "stripe_error" || result.reason === "connect_inactive") failed += 1;
    else skipped += 1;
  }

  return { scanned: due.length, transferred, skipped, failed };
}
