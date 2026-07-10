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

function stripeCountryCode(
  licenseCountry: string | null | undefined,
  userRegion?: string | null,
  currency?: string | null,
): string {
  const license = (licenseCountry || "").trim().toUpperCase();
  if (license.length === 2) return license.toLowerCase();

  const region = (userRegion || "").trim().toUpperCase();
  if (region.length === 2) return region.toLowerCase();

  if ((currency || "").toUpperCase() === "BRL") return "br";

  return "br";
}

export function stripeConnectErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: string }).message || "");
    if (/connect/i.test(message) && /signed|enabled|activated|onboarding/i.test(message)) {
      return "A plataforma Doctor8 ainda está finalizando a configuração do Stripe Connect. Tente novamente mais tarde.";
    }
    if (message) return message;
  }
  return "Não foi possível iniciar o cadastro Stripe. Tente novamente.";
}

export async function getStripeConnectStatusForAccountId(
  accountId: string | null | undefined,
): Promise<StripeConnectStatus> {
  if (!accountId) return "none";
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return summarizeConnectAccount(account);
  } catch (error) {
    console.error("[STRIPE_CONNECT] status retrieve failed:", accountId, error);
    return "none";
  }
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

export async function createOrResumeConnectOnboarding(params: {
  userId: string;
  professionalProfileId: string;
}): Promise<{ url: string }> {
  const profile = await db.professionalProfile.findUnique({
    where: { id: params.professionalProfileId },
    select: {
      stripeConnectAccountId: true,
      licenseCountry: true,
      currency: true,
      firstName: true,
      lastName: true,
      user: { select: { email: true, region: true } },
    },
  });
  if (!profile) throw new Error("PROFILE_NOT_FOUND");

  let accountId = profile.stripeConnectAccountId;
  const country = stripeCountryCode(
    profile.licenseCountry,
    profile.user.region,
    profile.currency,
  );

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country,
      email: profile.user.email,
      capabilities: {
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
