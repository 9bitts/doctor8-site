import { db } from "@/lib/db";
import {
  getStripeConnectStatusForAccountId,
  isStripeConnectEnabled,
} from "@/lib/stripe-connect";
import { commissionCentsOf, COMMISSION_RATE, REFUND_WINDOW_DAYS } from "@/lib/rateio";
import type { ProviderType } from "@/lib/providers";

/** Hours before appointment when patient loses full-refund eligibility (policy). */
export const CANCELLATION_NOTICE_HOURS = 24;

export function computeProfessionalPayoutEligibleAt(
  paidAt: Date,
  scheduledAt: Date,
): Date {
  const cdcWindowEnd = new Date(
    paidAt.getTime() + REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const cancelPolicyEnd = new Date(
    scheduledAt.getTime() - CANCELLATION_NOTICE_HOURS * 60 * 60 * 1000,
  );
  return cdcWindowEnd > cancelPolicyEnd ? cdcWindowEnd : cancelPolicyEnd;
}

export class ProviderPayoutNotReadyError extends Error {
  readonly code = "PROVIDER_PAYOUT_NOT_READY" as const;

  constructor() {
    super("Professional payout account is not ready for paid consultations");
    this.name = "ProviderPayoutNotReadyError";
  }
}

/** Health professionals on Connect; psychoanalyst / integrative skip split for now. */
export function providerTypeSupportsConnectSplit(providerType: ProviderType | string): boolean {
  return providerType === "health";
}

export function consultationSplitAmounts(grossCents: number): {
  applicationFeeCents: number;
  netCents: number;
} {
  const applicationFeeCents = commissionCentsOf(grossCents);
  return {
    applicationFeeCents,
    netCents: grossCents - applicationFeeCents,
  };
}

export async function resolveProfessionalConnectAccountId(
  providerId: string,
): Promise<string | null> {
  const profile = await db.professionalProfile.findUnique({
    where: { id: providerId },
    select: { stripeConnectAccountId: true },
  });
  return profile?.stripeConnectAccountId ?? null;
}

/** Active Connect account required when feature flag is on and provider type supports split. */
export async function requireActiveConnectForPaidConsultation(params: {
  providerId: string;
  providerType: ProviderType | string;
}): Promise<string | null> {
  if (!isStripeConnectEnabled()) return null;
  if (!providerTypeSupportsConnectSplit(params.providerType)) return null;

  const accountId = await resolveProfessionalConnectAccountId(params.providerId);
  if (!accountId) throw new ProviderPayoutNotReadyError();

  const status = await getStripeConnectStatusForAccountId(accountId);
  if (status !== "active") throw new ProviderPayoutNotReadyError();

  return accountId;
}

export { COMMISSION_RATE };
