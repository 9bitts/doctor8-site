import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getAppUrl } from "@/lib/email-core";
import { resolveProfessionalPortalBaseForUser } from "@/lib/psychologist-portal";

/** Default OFF when env unset - safe deploy; enable with STRIPE_CONNECT_ENABLED=true */
export function isStripeConnectEnabled(): boolean {
  const raw = process.env.STRIPE_CONNECT_ENABLED;
  if (raw === undefined || raw === "") return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export type StripeConnectStatus =
  | "none"
  | "onboarding_incomplete"
  | "pending"
  | "active";

export function summarizeConnectAccount(account: Stripe.Account): StripeConnectStatus {
  if (account.charges_enabled && account.payouts_enabled) return "active";
  if (!account.details_submitted) return "onboarding_incomplete";
  return "pending";
}

export async function getStripeConnectStatusForAccountId(
  accountId: string | null | undefined,
): Promise<StripeConnectStatus> {
  if (!accountId) return "none";
  const account = await stripe.accounts.retrieve(accountId);
  return summarizeConnectAccount(account);
}

export async function getStripeConnectStatusForProfile(
  professionalProfileId: string,
): Promise<StripeConnectStatus> {
  const profile = await db.professionalProfile.findUnique({
    where: { id: professionalProfileId },
    select: { stripeConnectAccountId: true },
  });
  return getStripeConnectStatusForAccountId(profile?.stripeConnectAccountId);
}

function stripeCountryCode(licenseCountry: string | null | undefined): string {
  const c = (licenseCountry || "US").trim().toUpperCase();
  if (c.length === 2) return c.toLowerCase();
  return "us";
}

export async function createOrResumeConnectOnboarding(params: {
  userId: string;
  professionalProfileId: string;
}): Promise<{ url: string }> {
  const profile = await db.professionalProfile.findUnique({
    where: { id: params.professionalProfileId },
    select: {
      stripeConnectAccountId: true,
      licenseCountry: true,
      firstName: true,
      lastName: true,
      user: { select: { email: true } },
    },
  });
  if (!profile) throw new Error("PROFILE_NOT_FOUND");

  let accountId = profile.stripeConnectAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: stripeCountryCode(profile.licenseCountry),
      email: profile.user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      individual: {
        email: profile.user.email,
        first_name: profile.firstName,
        last_name: profile.lastName,
      },
      metadata: {
        doctor8UserId: params.userId,
        doctor8ProfessionalProfileId: params.professionalProfileId,
      },
    });
    accountId = account.id;
    await db.professionalProfile.update({
      where: { id: params.professionalProfileId },
      data: { stripeConnectAccountId: accountId },
    });
  }

  const portalBase = await resolveProfessionalPortalBaseForUser(params.userId);
  const financeiroPath = `${portalBase}/financeiro`;
  const baseUrl = getAppUrl();

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${baseUrl}${financeiroPath}?connect=refresh`,
    return_url: `${baseUrl}${financeiroPath}?connect=return`,
  });

  return { url: link.url };
}

export async function createConnectDashboardLink(
  accountId: string,
): Promise<{ url: string }> {
  const link = await stripe.accounts.createLoginLink(accountId);
  return { url: link.url };
}

export function logConnectAccountUpdated(account: Stripe.Account): void {
  console.log(
    JSON.stringify({
      event: "stripe_connect_account_updated",
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      currentlyDue: account.requirements?.currently_due ?? [],
      pastDue: account.requirements?.past_due ?? [],
    }),
  );
}
