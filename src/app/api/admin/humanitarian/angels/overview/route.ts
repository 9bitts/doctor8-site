import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { getAdminAngelsOverview } from "@/lib/humanitarian/angel";
import type { Lang } from "@/lib/i18n/translations";

function adminLang(req: NextRequest): Lang {
  const raw = new URL(req.url).searchParams.get("lang");
  if (raw === "pt" || raw === "en" || raw === "es") return raw;
  return "pt";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const campaignSlug =
    new URL(req.url).searchParams.get("campaignSlug") || VENEZUELA_CAMPAIGN_SLUG;
  const lang = adminLang(req);

  const overview = await getAdminAngelsOverview(campaignSlug, lang);
  if (!overview) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json(overview);
}
