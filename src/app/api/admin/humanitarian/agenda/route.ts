import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  agendaToCsv,
  buildHumanitarianAgenda,
} from "@/lib/humanitarian/admin-agenda";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

export const runtime = "nodejs";

function parseDay(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const slug = params.get("slug") || VENEZUELA_CAMPAIGN_SLUG;
  const format = params.get("format");
  const kind = (params.get("kind") as "queue" | "scheduled" | "all" | null) || "all";
  const status = params.get("status") || "all";
  const q = params.get("q") || undefined;

  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 1);
  defaultFrom.setHours(0, 0, 0, 0);
  const defaultTo = new Date(now);
  defaultTo.setDate(defaultTo.getDate() + 7);
  defaultTo.setHours(23, 59, 59, 999);

  const from = parseDay(params.get("from"), defaultFrom);
  const to = parseDay(params.get("to"), defaultTo);
  to.setHours(23, 59, 59, 999);

  const campaign = await db.humanitarianCampaign.findUnique({ where: { slug } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await buildHumanitarianAgenda(campaign.id, {
    from,
    to,
    kind,
    status,
    q,
  });

  if (format === "csv") {
    const csv = agendaToCsv(items);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="humanitarian-agenda-${slug}.csv"`,
      },
    });
  }

  return NextResponse.json({
    items,
    from: from.toISOString(),
    to: to.toISOString(),
    slug,
  });
}
