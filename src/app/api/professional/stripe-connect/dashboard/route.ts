import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  createConnectDashboardLink,
  getStripeConnectStatusForAccountId,
  isStripeConnectEnabled,
} from "@/lib/stripe-connect";

export async function POST() {
  if (!isStripeConnectEnabled()) {
    return NextResponse.json({ error: "FEATURE_DISABLED" }, { status: 503 });
  }

  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const profile = await db.professionalProfile.findUnique({
    where: { id: ctx.professional.id },
    select: { stripeConnectAccountId: true },
  });
  if (!profile?.stripeConnectAccountId) {
    return NextResponse.json({ error: "NO_CONNECT_ACCOUNT" }, { status: 404 });
  }

  const status = await getStripeConnectStatusForAccountId(profile.stripeConnectAccountId);
  if (status !== "active") {
    return NextResponse.json({ error: "CONNECT_NOT_ACTIVE" }, { status: 409 });
  }

  try {
    const { url } = await createConnectDashboardLink(profile.stripeConnectAccountId);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[STRIPE_CONNECT] dashboard link error:", e);
    return NextResponse.json({ error: "DASHBOARD_LINK_FAILED" }, { status: 500 });
  }
}
