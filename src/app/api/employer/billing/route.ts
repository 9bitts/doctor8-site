import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import {
  employerBillingSummary,
  getEmployerPriceId,
  getOrCreateEmployerStripeCustomer,
  type EmployerPaidTier,
} from "@/lib/employer-billing";
import { createSubscriptionCheckoutSession } from "@/lib/stripe-subscription-checkout";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN"]);
  if ("error" in ctx) return ctx.error;

  const [company, billing] = await Promise.all([
    db.employerCompany.findUnique({
      where: { id: ctx.employerCompanyId },
      select: { planTier: true, nomeFantasia: true, contactEmail: true },
    }),
    db.employerBilling.findUnique({
      where: { employerCompanyId: ctx.employerCompanyId },
    }),
  ]);

  return NextResponse.json(
    employerBillingSummary(company?.planTier ?? "PILOT", billing),
  );
}

const checkoutSchema = z.object({
  tier: z.enum(["STARTER", "GROWTH", "ENTERPRISE"]),
});

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN"]);
  if ("error" in ctx) return ctx.error;

  const parsed = checkoutSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tier = parsed.data.tier as EmployerPaidTier;
  const priceId = getEmployerPriceId(tier);
  if (!priceId) {
    return NextResponse.json(
      { error: "PLAN_NOT_CONFIGURED", message: "Plano ainda não disponível para checkout automático. Contate o comercial." },
      { status: 503 },
    );
  }

  const [company, user] = await Promise.all([
    db.employerCompany.findUnique({
      where: { id: ctx.employerCompanyId },
      select: { nomeFantasia: true, contactEmail: true, currency: true },
    }),
    db.user.findUnique({
      where: { id: ctx.userId },
      select: { email: true },
    }),
  ]);

  if (!company || !user?.email) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const customerId = await getOrCreateEmployerStripeCustomer({
    employerCompanyId: ctx.employerCompanyId,
    email: company.contactEmail || user.email,
    name: company.nomeFantasia,
  });

  const session = await createSubscriptionCheckoutSession({
    customerId,
    priceId,
    currency: company.currency || "BRL",
    userId: ctx.userId,
    planKind: "employer",
    employerCompanyId: ctx.employerCompanyId,
    planTier: tier,
    successPath: "/empresas/configuracoes?billing=success",
    cancelPath: "/empresas/configuracoes?billing=cancel",
  });

  return NextResponse.json({ url: session.url });
}

export async function PATCH() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN"]);
  if ("error" in ctx) return ctx.error;

  const billing = await db.employerBilling.findUnique({
    where: { employerCompanyId: ctx.employerCompanyId },
  });
  if (!billing?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing customer" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org";
  const portal = await stripe.billingPortal.sessions.create({
    customer: billing.stripeCustomerId,
    return_url: `${appUrl}/empresas/configuracoes`,
  });

  return NextResponse.json({ url: portal.url });
}
