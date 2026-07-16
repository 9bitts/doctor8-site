import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  buildHumanitarianHistory,
  listHumanitarianAuditLogs,
} from "@/lib/humanitarian/admin-history";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const slug = params.get("slug") || VENEZUELA_CAMPAIGN_SLUG;
  const includeAudit = params.get("audit") !== "0";

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - (Number(params.get("days")) || 7));
  from.setHours(0, 0, 0, 0);

  const campaign = await db.humanitarianCampaign.findUnique({ where: { slug } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [history, audit] = await Promise.all([
    buildHumanitarianHistory(campaign.id, from, now),
    includeAudit ? listHumanitarianAuditLogs(40) : Promise.resolve([]),
  ]);

  return NextResponse.json({ history, audit });
}
