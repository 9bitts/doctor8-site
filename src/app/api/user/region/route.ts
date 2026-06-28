// PATCH ? update account region (BR / US / EU / VE)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDataResidencyInfo } from "@/lib/data-residency";
import type { BillingRegion } from "@/lib/billing-regions";
import { z } from "zod";

const schema = z.object({
  region: z.enum(["BR", "US", "EU", "VE"]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { region: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    region: user.region,
    dataResidency: getDataResidencyInfo(user.region as BillingRegion),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const activeSub = await db.subscription.findUnique({
    where: { userId: session.user.id },
    select: { status: true, stripeSubscriptionId: true },
  });
  if (
    activeSub?.stripeSubscriptionId &&
    ["active", "trialing", "past_due"].includes(activeSub.status)
  ) {
    return NextResponse.json(
      {
        error:
          "Não é possível alterar a região com uma assinatura ativa. Cancele primeiro em Conta.",
        code: "ACTIVE_SUBSCRIPTION",
      },
      { status: 400 },
    );
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { region: parsed.data.region },
  });

  return NextResponse.json({ success: true, region: parsed.data.region });
}
