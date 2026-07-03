import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  getStripeConnectStatusForAccountId,
  isStripeConnectEnabled,
} from "@/lib/stripe-connect";

export async function GET() {
  if (!isStripeConnectEnabled()) {
    return NextResponse.json({ error: "FEATURE_DISABLED" }, { status: 503 });
  }

  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const profile = await db.professionalProfile.findUnique({
    where: { id: ctx.professional.id },
    select: { stripeConnectAccountId: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "No profile" }, { status: 404 });
  }

  const status = await getStripeConnectStatusForAccountId(profile.stripeConnectAccountId);
  return NextResponse.json({ status });
}
