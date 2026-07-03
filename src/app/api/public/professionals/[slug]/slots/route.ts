// Public available slots by slug (no auth).

import { NextRequest, NextResponse } from "next/server";
import { getProviderAvailableDays } from "@/lib/availability-slots";
import { normalizeLang, localeOf } from "@/lib/i18n/translations";
import { getLivePublicProfileBySlug } from "@/lib/public-profile";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const profile = await getLivePublicProfileBySlug(params.slug);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lang = normalizeLang(req.nextUrl.searchParams.get("lang"));
  const locale = localeOf(lang);
  const healthPlan = req.nextUrl.searchParams.get("healthPlan") || undefined;
  const volunteerMode = req.nextUrl.searchParams.get("volunteer") === "1";

  const days = await getProviderAvailableDays(
    profile.providerId,
    profile.providerType,
    locale,
    14,
    healthPlan,
    { slotMode: volunteerMode ? "volunteer" : "paid" },
  );

  return NextResponse.json({ days });
}
