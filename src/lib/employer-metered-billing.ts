import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { EAP_BOOKING_SOURCE } from "@/lib/employer-eap-booking";

const DEFAULT_SESSION_PRICE_CENTS = 12000;

function getMeteredPriceId(): string | null {
  return process.env.STRIPE_PRICE_EMPLOYER_EAP_METERED_BRL ?? null;
}

/** Ensures subscription has a metered line item for EAP sessions. */
export async function ensureEmployerMeteredItem(employerCompanyId: string): Promise<string | null> {
  const priceId = getMeteredPriceId();
  if (!priceId) return null;

  const billing = await db.employerBilling.findUnique({
    where: { employerCompanyId },
  });
  if (!billing?.stripeSubscriptionId) return null;
  if (billing.stripeMeteredItemId) return billing.stripeMeteredItemId;

  const sub = await stripe.subscriptions.retrieve(billing.stripeSubscriptionId);
  const existing = sub.items.data.find((i) => i.price.id === priceId);
  if (existing) {
    await db.employerBilling.update({
      where: { employerCompanyId },
      data: { stripeMeteredItemId: existing.id },
    });
    return existing.id;
  }

  const item = await stripe.subscriptionItems.create({
    subscription: billing.stripeSubscriptionId,
    price: priceId,
  });

  await db.employerBilling.update({
    where: { employerCompanyId },
    data: { stripeMeteredItemId: item.id },
  });

  return item.id;
}

/** Reports one EAP session to Stripe metered billing (idempotent per appointment). */
export async function reportEapMeteredUsage(appointmentId: string): Promise<void> {
  const existing = await db.employerEapMeteredUsage.findUnique({
    where: { appointmentId },
  });
  if (existing) return;

  const appt = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      bookingSource: true,
      status: true,
      employerWorkforceMember: { select: { employerCompanyId: true } },
    },
  });

  if (!appt || appt.bookingSource !== EAP_BOOKING_SOURCE) return;
  if (appt.status !== "COMPLETED") return;
  if (!appt.employerWorkforceMember) return;

  const companyId = appt.employerWorkforceMember.employerCompanyId;
  const eapBenefit = await db.employerEapBenefit.findUnique({
    where: { employerCompanyId: companyId },
    select: { sessionPriceCents: true },
  });
  const amountCents = eapBenefit?.sessionPriceCents ?? DEFAULT_SESSION_PRICE_CENTS;

  const priceId = getMeteredPriceId();
  let stripeUsageRecordId: string | null = null;

  if (priceId) {
    const itemId = await ensureEmployerMeteredItem(companyId);
    if (itemId) {
      const usageRecord = await stripe.subscriptionItems.createUsageRecord(itemId, {
        quantity: 1,
        timestamp: Math.floor(Date.now() / 1000),
        action: "increment",
      });
      stripeUsageRecordId = usageRecord.id;
    }
  }

  await db.employerEapMeteredUsage.create({
    data: {
      employerCompanyId: companyId,
      appointmentId,
      stripeUsageRecordId: stripeUsageRecordId ?? "internal-demo",
      amountCents,
    },
  });
}

export function isEmployerMeteredBillingConfigured(): boolean {
  return Boolean(getMeteredPriceId());
}
