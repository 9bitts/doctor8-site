import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

function portalReturnUrl(role: string): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org").replace(/\/$/, "");
  if (role === "PROFESSIONAL") return `${appUrl}/professional/doctor-connection`;
  return `${appUrl}/patient/club-doctor`;
}

/** Stripe Customer Portal — update payment method for any subscription holder. */
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await db.subscription.findUnique({
    where: { userId: session.user.id },
  });
  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ error: "No subscription customer" }, { status: 400 });
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: portalReturnUrl(session.user.role),
  });

  return NextResponse.json({ portalUrl: portal.url });
}
