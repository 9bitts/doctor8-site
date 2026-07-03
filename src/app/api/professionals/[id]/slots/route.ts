// Available slots for a health professional or psychoanalyst (next 14 days).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProviderAvailableDays } from "@/lib/availability-slots";
import { normalizeLang, localeOf } from "@/lib/i18n/translations";
import type { ProviderType } from "@/lib/providers";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lang = normalizeLang(req.nextUrl.searchParams.get("lang"));
  const locale = localeOf(lang);
  const providerType = (req.nextUrl.searchParams.get("providerType") || "health") as ProviderType;
  const healthPlan = req.nextUrl.searchParams.get("healthPlan") || undefined;
  const volunteerMode = req.nextUrl.searchParams.get("volunteer") === "1";

  const days = await getProviderAvailableDays(
    params.id,
    providerType,
    locale,
    14,
    healthPlan,
    { slotMode: volunteerMode ? "volunteer" : "paid" },
  );

  return NextResponse.json({ days });
}
