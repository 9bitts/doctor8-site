import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import {
  createOrResumeConnectOnboarding,
  isStripeConnectEnabled,
} from "@/lib/stripe-connect";

export async function POST() {
  if (!isStripeConnectEnabled()) {
    return NextResponse.json({ error: "FEATURE_DISABLED" }, { status: 503 });
  }

  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  try {
    const { url } = await createOrResumeConnectOnboarding({
      userId: ctx.userId,
      professionalProfileId: ctx.professional.id,
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[STRIPE_CONNECT] onboard error:", e);
    return NextResponse.json({ error: "ONBOARD_FAILED" }, { status: 500 });
  }
}
