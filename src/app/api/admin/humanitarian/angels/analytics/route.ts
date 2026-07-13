import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCoordinatorAnalytics } from "@/lib/humanitarian/angel-coordination";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slug =
    new URL(req.url).searchParams.get("campaignSlug") || VENEZUELA_CAMPAIGN_SLUG;
  const analytics = await getCoordinatorAnalytics(slug);
  if (!analytics) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ analytics });
}
