// Lazy server-side expiry of CALLED JIT queue entries past their no-show window.

import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { refundPaymentIntentIdempotent } from "@/lib/stripe-refund";

async function refundJitQueuePayment(
  paymentId: string | null | undefined,
  reason: string,
): Promise<void> {
  if (!paymentId) return;
  const payment = await db.jitPayment.findUnique({
    where: { id: paymentId },
    select: { id: true, stripePaymentId: true },
  });
  if (!payment?.stripePaymentId) {
    console.error(`[AUTO-REFUND-FAIL] JitPayment ${paymentId} has no stripePaymentId`);
    return;
  }
  const result = await refundPaymentIntentIdempotent(payment.stripePaymentId, reason);
  if (result.refunded) {
    await db.jitPayment
      .update({ where: { id: payment.id }, data: { status: "refunded" } })
      .catch(() => {});
  }
}

/** Expire CALLED entries whose expiresAt has passed. Optionally scoped to one session. */
export async function expireStaleJitNoShows(sessionId?: string): Promise<number> {
  const now = new Date();
  const expired = await db.jitQueue.findMany({
    where: {
      status: "CALLED",
      expiresAt: { lt: now },
      ...(sessionId ? { sessionId } : {}),
    },
    select: {
      id: true,
      sessionId: true,
      patientUserId: true,
      paymentId: true,
      employerWorkforceMemberId: true,
    },
  });

  if (expired.length === 0) return 0;

  for (const e of expired) {
    await db.jitQueue.update({
      where: { id: e.id },
      data: { status: "NO_SHOW", endedAt: now },
    });
    if (e.paymentId) {
      await refundJitQueuePayment(e.paymentId, "jit_no_show_expired");
    }
    if (e.employerWorkforceMemberId) {
      try {
        const { restoreEapJitSessionQuota } = await import("@/lib/employer-eap-booking");
        await restoreEapJitSessionQuota(e.id);
      } catch (err) {
        console.error("[JIT] EAP quota restore on no-show failed:", err);
      }
    }
    const missedCopy = storedNotificationText("notif.jit.missed.title", "notif.jit.missed.body");
    await createNotification({
      userId: e.patientUserId,
      title: missedCopy.title,
      body: missedCopy.body,
      type: "system",
      data: {
        sessionId: e.sessionId,
        titleKey: "notif.jit.missed.title",
        bodyKey: "notif.jit.missed.body",
      },
    }).catch(() => {});
  }

  return expired.length;
}
